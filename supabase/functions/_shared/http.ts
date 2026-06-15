export type ApiResponse = {
  success: boolean;
  message: string;
  code: string;
  fieldErrors?: Record<string, string>;
};

function env(name: string): string {
  try {
    return Deno.env.get(name)?.trim() || '';
  } catch {
    return '';
  }
}

function parseOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function allowedOrigins(): Set<string> {
  return new Set([
    'https://papirando.com',
    'https://www.papirando.com',
    'https://papirando.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5176',
    'http://127.0.0.1:5176',
    ...parseOrigins(env('ALLOWED_ORIGINS')),
    ...parseOrigins(env('APP_URL')),
    ...parseOrigins(env('SITE_URL')),
    ...parseOrigins(env('VITE_PUBLIC_APP_ORIGIN')),
  ]);
}

export function getCorsHeaders(req?: Request): Record<string, string> {
  const allowed = allowedOrigins();
  const origin = req?.headers.get('origin')?.trim().replace(/\/+$/, '') || '';
  const fallbackOrigin = allowed.values().next().value || 'https://papirando.vercel.app';
  const allowOrigin = origin && allowed.has(origin) ? origin : fallbackOrigin;

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  };
}

export const corsHeaders = getCorsHeaders();

export function jsonResponse(body: ApiResponse, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}
