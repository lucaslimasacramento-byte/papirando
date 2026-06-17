// supabase/functions/asaas-fix-customers/index.ts
// Rotina ADMIN, idempotente e segura: percorre todos os customers do Asaas e
// garante notificationDisabled: true (desliga notificacoes pagas email/SMS/WhatsApp).
// NAO apaga clientes, NAO cancela cobrancas, NAO altera assinaturas.
// Acesso restrito a administradores (is_app_admin via JWT).
// Deploy: supabase functions deploy asaas-fix-customers
// Secrets: ASAAS_API_KEY, ASAAS_SANDBOX, SUPABASE_URL, SUPABASE_ANON_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/http.ts';

const isSandbox = Deno.env.get('ASAAS_SANDBOX') !== 'false';
const ASAAS_BASE = isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY') ?? '';

function json(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

async function asaas(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', access_token: ASAAS_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = Array.isArray(data?.errors)
      ? data.errors.map((e: { description: string }) => e.description).join(', ')
      : `Asaas HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) });

  try {
    if (req.method !== 'POST') return json(req, { error: 'Metodo nao permitido' }, 405);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json(req, { error: 'Nao autorizado' }, 401);

    // Valida que o chamador e admin.
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) return json(req, { error: 'Nao autorizado' }, 401);

    const { data: isAdmin, error: adminErr } = await supabaseUser.rpc('is_app_admin');
    if (adminErr || isAdmin !== true) {
      return json(req, { error: 'Acesso restrito a administradores.' }, 403);
    }

    if (!ASAAS_KEY) return json(req, { error: 'ASAAS_API_KEY nao configurada.' }, 500);

    // Percorre todos os customers (paginado) e desliga notificacoes.
    const pageSize = 100;
    let offset = 0;
    let hasMore = true;
    let scanned = 0;
    let updated = 0;
    let alreadyOk = 0;
    const errors: Array<{ id: string; error: string }> = [];

    while (hasMore) {
      const page = await asaas(`/customers?limit=${pageSize}&offset=${offset}`);
      const list: Array<{ id: string; notificationDisabled?: boolean }> = Array.isArray(page?.data) ? page.data : [];
      for (const c of list) {
        scanned += 1;
        if (c.notificationDisabled === true) { alreadyOk += 1; continue; }
        try {
          await asaas(`/customers/${c.id}`, 'POST', { notificationDisabled: true });
          updated += 1;
          console.log('[asaas-fix-customers] desligado', c.id);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push({ id: String(c.id), error: msg });
          console.error('[asaas-fix-customers] falha', c.id, msg);
        }
      }
      hasMore = Boolean(page?.hasMore) && list.length > 0;
      offset += pageSize;
    }

    const report = { scanned, updated, alreadyOk, errorCount: errors.length, errors, sandbox: isSandbox };
    console.log('[asaas-fix-customers] relatorio', JSON.stringify(report));
    return json(req, report);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[asaas-fix-customers]', message);
    return json(req, { error: 'Erro interno.', detail: message }, 500);
  }
});
