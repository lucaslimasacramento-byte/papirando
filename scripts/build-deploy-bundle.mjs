/**
 * Gera supabase/deploy_registration_and_admin_rls.bundle.sql na ordem correta.
 * Uso (raiz do repo): node scripts/build-deploy-bundle.mjs
 * Ou: npm run db:bundle:admin-registration
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const supabaseDir = join(root, "supabase");

const parts = [
  "admin_rls_helpers.sql",
  "profiles_admin_rls.sql",
  "registration_antifraud.sql",
];

const outName = "deploy_registration_and_admin_rls.bundle.sql";
const outPath = join(supabaseDir, outName);

let out =
  "-- Gerado por scripts/build-deploy-bundle.mjs (nao editar a mao).\n" +
  "-- Colar no SQL Editor OU: npm run db:deploy:admin-registration\n\n";

for (const f of parts) {
  const p = join(supabaseDir, f);
  if (!existsSync(p)) {
    throw new Error(`Ficheiro em falta: ${p}`);
  }
  out += "-- =====================================================================\n";
  out += `-- SECTION: ${f}\n`;
  out += "-- =====================================================================\n\n";
  out += readFileSync(p, "utf8");
  out += "\n\n";
}

writeFileSync(outPath, out, "utf8");
console.log("OK:", outPath);
