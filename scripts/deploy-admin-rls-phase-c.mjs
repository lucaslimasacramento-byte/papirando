/**
 * Aplica no Postgres remoto (projeto ligado: supabase link) os scripts RLS admin
 * listados em docs/supabase-admin-rls.md, depois de admin_rls_helpers + profiles_admin_rls.
 *
 * Pré-requisitos: npm run supabase:login && npm run supabase:link
 *
 * Uso (raiz): node scripts/deploy-admin-rls-phase-c.mjs
 * Ou: npm run db:deploy:admin-rls-phase-c
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const supabaseDir = join(root, "supabase");

/** Ordem alinhada a docs/supabase-admin-rls.md (tabela “já alinhados”) + bootstrap de role. */
const FILES = [
  "admin_role_bootstrap.sql",
  "subject_catalog.sql",
  "exam_boards_catalog.sql",
  "questions.sql",
  "contest_templates.sql",
  "admin_finance.sql",
  "admin_crm.sql",
  "redacao_site_content.sql",
  "redacao_expert_tips.sql",
  "vade_mecum.sql",
  "community.sql",
  "mind_map_gallery.sql",
];

function runFile(sqlPath) {
  const args = [
    "--yes",
    "supabase",
    "--agent=no",
    "db",
    "query",
    "--linked",
    "-f",
    sqlPath,
  ];
  // shell: false evita DEP0190 e passa o path do -f sem concatenação insegura
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const r = spawnSync(npx, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  return r.status ?? 1;
}

let failed = null;
for (const name of FILES) {
  const sqlPath = join(supabaseDir, name);
  if (!existsSync(sqlPath)) {
    console.error(`Ficheiro em falta: ${sqlPath}`);
    process.exit(1);
  }
  console.log(`\n>>> ${name}\n`);
  const code = runFile(sqlPath);
  if (code !== 0) {
    failed = { name, code };
    break;
  }
}

if (failed) {
  console.error(`\nFalhou em ${failed.name} (exit ${failed.code}).`);
  process.exit(failed.code);
}

console.log("\nOK: Fase C (RLS admin) aplicada — todos os ficheiros desta lista.\n");
