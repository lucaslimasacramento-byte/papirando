/**
 * send-reminder-email
 *
 * Chamada diariamente via pg_cron (ver send_reminder_cron.sql).
 * Envia e-mail para usuários com flashcards vencidos ou sem sessão de
 * estudo nos últimos 2 dias.
 *
 * Variáveis de ambiente necessárias (Supabase Secrets):
 *   RESEND_API_KEY  — chave da API do Resend (https://resend.com)
 *   FROM_EMAIL      — remetente verificado, ex: "Papirando <contato@papirando.com>"
 *   APP_URL         — URL do app, ex: "https://papirando.vercel.app"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// ─── helpers ──────────────────────────────────────────────────────────────────

function env(key: string): string {
  try { return Deno.env.get(key)?.trim() || ''; } catch { return ''; }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── e-mail HTML ──────────────────────────────────────────────────────────────

function buildEmailHtml(opts: {
  nome: string;
  dueCount: number;
  appUrl: string;
  semEstudo: boolean;
}): string {
  const { nome, dueCount, appUrl, semEstudo } = opts;
  const firstName = nome.split(' ')[0] || 'Olá';

  const mainLine = dueCount > 0
    ? `Você tem <strong>${dueCount} flashcard${dueCount > 1 ? 's' : ''}</strong> esperando por revisão hoje.`
    : 'Que tal revisar seus flashcards e manter o ritmo de estudos?';

  const motivacao = semEstudo
    ? '<p style="color:#64748b;font-size:14px;margin:0 0 24px">Notamos que você não registrou sessão de estudo nos últimos 2 dias. Uma revisão rápida de flashcards já conta!</p>'
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);padding:32px 40px">
            <p style="margin:0;color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase">Papirando</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:800;line-height:1.3">
              Hora de revisar, ${firstName}!
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px">
              ${mainLine}
            </p>
            ${motivacao}

            <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;background:#eff6ff;border-radius:16px;padding:20px 24px;width:100%">
              <tr>
                <td>
                  <p style="margin:0;color:#1e40af;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em">Por que revisar agora?</p>
                  <ul style="margin:12px 0 0;padding-left:20px;color:#1d4ed8;font-size:14px;line-height:1.8">
                    <li>O algoritmo FSRS escolhe o <strong>momento ideal</strong> para fixação</li>
                    <li>Revisões atrasadas pedem mais repetições depois</li>
                    <li>5 minutos por dia batem semanas de estudo concentrado</li>
                  </ul>
                </td>
              </tr>
            </table>

            <a href="${appUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:14px">
              Abrir Papirando →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 32px;border-top:1px solid #f1f5f9">
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6">
              Você recebe este e-mail porque ativou lembretes de estudo no Papirando.<br>
              Para parar de receber, ajuste nas configurações do seu perfil.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── enviar via Resend ────────────────────────────────────────────────────────

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  resendKey: string;
  from: string;
}): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.resendKey}`,
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
}

// ─── handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' },
    });
  }

  const resendKey = env('RESEND_API_KEY');
  const fromEmail = env('FROM_EMAIL') || 'Papirando <contato@papirando.com>';
  const appUrl    = env('APP_URL') || 'https://papirando.vercel.app';
  const supabaseUrl     = env('SUPABASE_URL');
  const serviceRoleKey  = env('SUPABASE_SERVICE_ROLE_KEY');

  if (!resendKey) return json({ success: false, message: 'RESEND_API_KEY não configurado.' }, 500);
  if (!supabaseUrl || !serviceRoleKey) return json({ success: false, message: 'Supabase não configurado.' }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Usuários com flashcards vencidos agora
  const { data: dueRows, error: dueErr } = await admin
    .from('flashcard_cards')
    .select('user_id')
    .lte('due', new Date().toISOString());

  if (dueErr) return json({ success: false, message: dueErr.message }, 500);

  // Agrupa por user_id e conta
  const dueByUser = new Map<string, number>();
  for (const row of (dueRows || [])) {
    dueByUser.set(row.user_id, (dueByUser.get(row.user_id) || 0) + 1);
  }

  // 2. Sessões dos últimos 2 dias (para detectar usuários sem estudo recente)
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentSessions } = await admin
    .from('study_sessions')
    .select('user_id')
    .gte('created_at', twoDaysAgo);

  const usersWithRecentStudy = new Set((recentSessions || []).map((r: { user_id: string }) => r.user_id));

  // 3. Profiles dos usuários elegíveis
  const eligibleUserIds = [...dueByUser.keys()];
  if (eligibleUserIds.length === 0) {
    return json({ success: true, sent: 0, message: 'Nenhum usuário com flashcards vencidos.' });
  }

  const { data: profiles, error: profErr } = await admin
    .from('profiles')
    .select('id, email, nome, name')
    .in('id', eligibleUserIds);

  if (profErr) return json({ success: false, message: profErr.message }, 500);

  // 4. Envia e-mails
  let sent = 0;
  const errors: string[] = [];

  for (const profile of (profiles || [])) {
    const email = profile.email as string | undefined;
    if (!email) continue;

    const dueCount = dueByUser.get(profile.id) || 0;
    const semEstudo = !usersWithRecentStudy.has(profile.id);
    const nome = (profile.nome || profile.name || '') as string;

    try {
      await sendEmail({
        to: email,
        subject: dueCount > 0
          ? `📚 ${dueCount} flashcard${dueCount > 1 ? 's' : ''} te esperando hoje — Papirando`
          : '📚 Hora de revisar seus flashcards — Papirando',
        html: buildEmailHtml({ nome, dueCount, appUrl, semEstudo }),
        resendKey,
        from: fromEmail,
      });
      sent++;
    } catch (e) {
      errors.push(`${email}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return json({ success: true, sent, errors: errors.length ? errors : undefined });
});
