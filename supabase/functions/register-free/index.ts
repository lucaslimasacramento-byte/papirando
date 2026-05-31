import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { isValidCpf, normalizeCpf } from '../_shared/cpf.ts';
import { getCorsHeaders, jsonResponse, type ApiResponse } from '../_shared/http.ts';

const WINDOW_MIN = 15;
const MAX_ATTEMPTS_PER_IP = 10;
const INVALID_CPF_WINDOW_MIN = 10;
const MAX_INVALID_CPF_PER_WINDOW = 20;
const BLOCK_MINUTES = 30;

function getClientIp(req: Request): string {
  // SEC-009: cf-connecting-ip vem do edge da Cloudflare/Vercel e nao pode ser spoofed.
  // x-real-ip vem do proxy confiavel. x-forwarded-for eh controlavel pelo cliente
  // (pode ser falsificado), portanto so eh usado como ultimo recurso.
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
    '0.0.0.0'
  );
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// SEC-010: peppers sao obrigatorios. Se nao estiverem configurados via
// `supabase secrets set SIGNUP_IP_PEPPER=...` / `SIGNUP_EMAIL_LOG_PEPPER=...`,
// a edge function falha imediatamente em vez de cair num fallback hardcoded
// (que seria publico e tornaria os hashes reversiveis).
function requirePepper(envKey: string): string {
  const pepper = Deno.env.get(envKey);
  if (!pepper || pepper.length < 16) {
    throw new Error(
      `[register-free] ${envKey} nao configurado ou muito curto. ` +
        `Defina via: supabase secrets set ${envKey}=<segredo de pelo menos 16 chars>`,
    );
  }
  return pepper;
}

async function hashIp(ip: string): Promise<string> {
  return sha256Hex(`${ip}:${requirePepper('SIGNUP_IP_PEPPER')}`);
}

async function hashEmail(email: string): Promise<string> {
  return sha256Hex(`${email.toLowerCase().trim()}:${requirePepper('SIGNUP_EMAIL_LOG_PEPPER')}`);
}

function sanitizeName(raw: string): string {
  return raw.replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

function sanitizePhone(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validateBirthDate(iso: string): { ok: true } | { ok: false; code: string; message: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return { ok: false, code: 'BIRTH_INVALID', message: 'Data de nascimento inválida.' };
  }
  const d = new Date(`${iso}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, code: 'BIRTH_INVALID', message: 'Data de nascimento inválida.' };
  }
  const now = new Date();
  if (d.getTime() > now.getTime()) {
    return { ok: false, code: 'BIRTH_FUTURE', message: 'Data de nascimento não pode ser no futuro.' };
  }
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
  if (age < 10) {
    return { ok: false, code: 'BIRTH_AGE', message: 'Cadastro permitido apenas para maiores de 10 anos.' };
  }
  if (age > 120) {
    return { ok: false, code: 'BIRTH_AGE', message: 'Verifique a data de nascimento informada.' };
  }
  return { ok: true };
}

async function logAttempt(
  admin: ReturnType<typeof createClient>,
  row: {
    ip_hash: string;
    outcome: string;
    reason_code: string;
    internal_detail?: string;
    email_hash?: string | null;
  },
) {
  const { error } = await admin.from('signup_attempt_log').insert(row);
  if (error) console.error('[register-free] log insert failed', error.message);
}

async function ensureNotBlocked(
  admin: ReturnType<typeof createClient>,
  ipHash: string,
): Promise<ApiResponse | null> {
  const { data, error } = await admin.from('signup_ip_blocks').select('blocked_until').eq('ip_hash', ipHash).maybeSingle();
  if (error) {
    console.error('[register-free] block read', error.message);
    return null;
  }
  if (data?.blocked_until) {
    const until = new Date(String(data.blocked_until));
    if (until.getTime() > Date.now()) {
      return {
        success: false,
        code: 'RATE_LIMITED',
        message: 'Limite de tentativas excedido, tente novamente mais tarde.',
      };
    }
  }
  return null;
}

async function enforceRateLimits(
  admin: ReturnType<typeof createClient>,
  ipHash: string,
): Promise<ApiResponse | null> {
  const sinceWindow = new Date(Date.now() - WINDOW_MIN * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from('signup_attempt_log')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', sinceWindow);

  if (error) {
    console.error('[register-free] rate count', error.message);
    return null;
  }
  if ((count ?? 0) >= MAX_ATTEMPTS_PER_IP) {
    const until = new Date(Date.now() + BLOCK_MINUTES * 60 * 1000).toISOString();
    await admin.from('signup_ip_blocks').upsert({
      ip_hash: ipHash,
      blocked_until: until,
      reason: 'too_many_attempts',
    });
    return {
      success: false,
      code: 'RATE_LIMITED',
      message: 'Limite de tentativas excedido, tente novamente mais tarde.',
    };
  }

  const sinceInvalid = new Date(Date.now() - INVALID_CPF_WINDOW_MIN * 60 * 1000).toISOString();
  const { count: invalidCount, error: invErr } = await admin
    .from('signup_attempt_log')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .eq('outcome', 'invalid_cpf')
    .gte('created_at', sinceInvalid);

  if (invErr) {
    console.error('[register-free] invalid cpf count', invErr.message);
    return null;
  }
  if ((invalidCount ?? 0) >= MAX_INVALID_CPF_PER_WINDOW) {
    const until = new Date(Date.now() + BLOCK_MINUTES * 60 * 1000).toISOString();
    await admin.from('signup_ip_blocks').upsert({
      ip_hash: ipHash,
      blocked_until: until,
      reason: 'invalid_cpf_flood',
    });
    return {
      success: false,
      code: 'RATE_LIMITED',
      message: 'Muitas tentativas com CPF inválido. Aguarde antes de tentar novamente.',
    };
  }

  return null;
}

Deno.serve(async (req) => {
  const respond = (body: ApiResponse, status = 200) => jsonResponse(body, status, req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return respond({ success: false, message: 'Método não permitido.', code: 'METHOD' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return respond(
      { success: false, message: 'Servidor de cadastro não configurado.', code: 'SERVER_CONFIG' },
      500,
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return respond({ success: false, message: 'Dados inválidos.', code: 'BAD_JSON' }, 400);
  }

  const ip = getClientIp(req);
  const ipHash = await hashIp(ip);
  const emailHashFn = async (e: string) => hashEmail(e);

  const blocked = await ensureNotBlocked(admin, ipHash);
  if (blocked) {
    await logAttempt(admin, {
      ip_hash: ipHash,
      outcome: 'rate_limited',
      reason_code: blocked.code,
      internal_detail: 'blocked_row',
    });
    return respond(blocked, 429);
  }

  const limited = await enforceRateLimits(admin, ipHash);
  if (limited) {
    await logAttempt(admin, {
      ip_hash: ipHash,
      outcome: 'rate_limited',
      reason_code: limited.code,
      internal_detail: 'window_exceeded',
    });
    return respond(limited, 429);
  }

  const fullName = sanitizeName(String(body.fullName ?? ''));
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const birthDate = String(body.birthDate ?? '').trim();
  const celular = sanitizePhone(String(body.celular ?? body.phone ?? ''));
  const referralCode = String(body.referralCode ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cpfRaw = String(body.cpf ?? '');

  const fieldErrors: Record<string, string> = {};

  if (fullName.length < 3) fieldErrors.fullName = 'Informe o nome completo.';
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  if (nameParts.length < 2) fieldErrors.fullName = 'Digite nome e sobrenome.';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = 'E-mail inválido.';

  if (password.length < 6) fieldErrors.password = 'A senha deve ter pelo menos 6 caracteres.';

  const birthCheck = validateBirthDate(birthDate);
  if (!birthCheck.ok) fieldErrors.birthDate = birthCheck.message;

  const cpfDigits = normalizeCpf(cpfRaw);
  if (!isValidCpf(cpfDigits)) {
    fieldErrors.cpf = 'CPF inválido.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    if (fieldErrors.cpf === 'CPF inválido.') {
      await logAttempt(admin, {
        ip_hash: ipHash,
        outcome: 'invalid_cpf',
        reason_code: 'CPF_INVALID',
        internal_detail: 'algorithm_failed',
        email_hash: email ? await emailHashFn(email) : null,
      });
    } else {
      await logAttempt(admin, {
        ip_hash: ipHash,
        outcome: 'validation',
        reason_code: 'FIELD_VALIDATION',
        internal_detail: JSON.stringify(Object.keys(fieldErrors)),
        email_hash: email ? await emailHashFn(email) : null,
      });
    }
    return respond(
      {
        success: false,
        message: 'Dados inválidos.',
        code: 'VALIDATION_ERROR',
        fieldErrors,
      },
      400,
    );
  }

  const { data: emailTaken, error: emailRpcErr } = await admin.rpc('registration_email_exists', {
    checked_email: email,
  });
  if (emailRpcErr) {
    console.error('[register-free] registration_email_exists', emailRpcErr.message);
    return respond(
      { success: false, message: 'Não foi possível concluir o cadastro agora.', code: 'SERVER_ERROR' },
      500,
    );
  }
  if (emailTaken === true) {
    await logAttempt(admin, {
      ip_hash: ipHash,
      outcome: 'email_taken',
      reason_code: 'EMAIL_TAKEN',
      email_hash: await emailHashFn(email),
    });
    return respond(
      {
        success: false,
        message: 'E-mail já cadastrado.',
        code: 'EMAIL_TAKEN',
        fieldErrors: { email: 'E-mail já cadastrado.' },
      },
      409,
    );
  }

  const { data: cpfTaken, error: cpfRpcErr } = await admin.rpc('registration_cpf_exists', {
    checked_cpf: cpfDigits,
  });
  if (cpfRpcErr) {
    console.error('[register-free] registration_cpf_exists', cpfRpcErr.message);
    return respond(
      { success: false, message: 'Não foi possível concluir o cadastro agora.', code: 'SERVER_ERROR' },
      500,
    );
  }
  if (cpfTaken === true) {
    await logAttempt(admin, {
      ip_hash: ipHash,
      outcome: 'cpf_taken',
      reason_code: 'CPF_TAKEN',
      email_hash: await emailHashFn(email),
    });
    return respond(
      {
        success: false,
        message: 'CPF já cadastrado.',
        code: 'CPF_TAKEN',
        fieldErrors: { cpf: 'CPF já cadastrado.' },
      },
      409,
    );
  }

  const redirectTo =
    Deno.env.get('SIGNUP_EMAIL_REDIRECT_TO') ||
    req.headers.get('origin') ||
    undefined;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      nome: fullName,
      celular,
      birth_date: birthDate,
      referred_by_code: referralCode || '',
    },
  });

  if (createErr || !created?.user?.id) {
    const msg = createErr?.message?.toLowerCase?.() || '';
    console.error('[register-free] createUser', createErr?.message);
    await logAttempt(admin, {
      ip_hash: ipHash,
      outcome: 'auth_error',
      reason_code: 'AUTH_CREATE_FAILED',
      internal_detail: createErr?.message ?? 'unknown',
      email_hash: await emailHashFn(email),
    });
    if (msg.includes('already been registered') || msg.includes('already exists')) {
      return respond(
        {
          success: false,
          message: 'E-mail já cadastrado.',
          code: 'EMAIL_TAKEN',
          fieldErrors: { email: 'E-mail já cadastrado.' },
        },
        409,
      );
    }
    return respond(
      { success: false, message: 'Não foi possível criar a conta. Tente novamente.', code: 'REGISTER_FAILED' },
      500,
    );
  }

  const userId = created.user.id;

  const { error: profileErr } = await admin
    .from('profiles')
    .update({
      nome: fullName,
      email,
      celular,
      cpf: cpfDigits,
      birth_date: birthDate,
      referred_by_code: referralCode || null,
      cpf_validado_algoritmo: true,
      email_verificado: false,
      status_cadastro: 'pendente',
      subscription_plan: 'papiro',
      subscription_status: 'trialing',
      tentativas_cadastro: 0,
      ultimo_ip_cadastro: ipHash.slice(0, 48),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profileErr) {
    console.error('[register-free] profile update', profileErr.message, profileErr);
    await admin.auth.admin.deleteUser(userId);
    await logAttempt(admin, {
      ip_hash: ipHash,
      outcome: 'rollback',
      reason_code: 'PROFILE_UPDATE_FAILED',
      internal_detail: profileErr.message,
      email_hash: await emailHashFn(email),
    });
    const isCpfUnique =
      profileErr.code === '23505' ||
      profileErr.message?.toLowerCase().includes('profiles_cpf_unique');
    if (isCpfUnique) {
      return respond(
        {
          success: false,
          message: 'CPF já cadastrado.',
          code: 'CPF_TAKEN',
          fieldErrors: { cpf: 'CPF já cadastrado.' },
        },
        409,
      );
    }
    return respond(
      { success: false, message: 'Não foi possível concluir o cadastro.', code: 'REGISTER_FAILED' },
      500,
    );
  }

  const trialStart = new Date();
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + 30);

  const { error: subscriptionErr } = await admin.from('subscriptions').insert({
    user_id: userId,
    provider: 'manual',
    plan_name: 'papiro',
    billing_cycle: 'trial',
    status: 'trialing',
    current_period_start: trialStart.toISOString(),
    current_period_end: trialEnd.toISOString(),
    cancel_at_period_end: true,
  });

  if (subscriptionErr) {
    console.error('[register-free] trial subscription insert', subscriptionErr.message);
    await admin.auth.admin.deleteUser(userId);
    await logAttempt(admin, {
      ip_hash: ipHash,
      outcome: 'rollback',
      reason_code: 'TRIAL_SUBSCRIPTION_FAILED',
      internal_detail: subscriptionErr.message,
      email_hash: await emailHashFn(email),
    });
    return respond(
      { success: false, message: 'Nao foi possivel ativar seu periodo gratuito. Tente novamente.', code: 'REGISTER_FAILED' },
      500,
    );
  }

  const resendRes = await fetch(`${supabaseUrl}/auth/v1/resend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({
      type: 'signup',
      email,
      options: redirectTo ? { email_redirect_to: redirectTo } : undefined,
    }),
  });

  if (!resendRes.ok) {
    const t = await resendRes.text();
    console.warn('[register-free] resend email', resendRes.status, t);
  }

  await logAttempt(admin, {
    ip_hash: ipHash,
    outcome: 'success',
    reason_code: 'OK',
    email_hash: await emailHashFn(email),
  });

  return respond({
    success: true,
    message: 'Cadastro realizado. Seu primeiro mes no Papiro e gratuito; verifique seu e-mail para ativar a conta.',
    code: 'SUCCESS_PENDING_EMAIL',
  });
});
