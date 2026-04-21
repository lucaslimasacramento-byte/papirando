# Gera o bundle e, opcionalmente, aplica no projeto Supabase ligado (CLI).
# Uso (na pasta supabase/):
#   .\deploy_registration_and_admin_rls.ps1
#   .\deploy_registration_and_admin_rls.ps1 -Deploy
#
# Preferivel na raiz: npm run db:bundle:admin-registration
#                    npm run db:deploy:admin-registration

param(
  [switch]$Deploy
)

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$root = Split-Path $here -Parent

Push-Location $root
try {
  node scripts/build-deploy-bundle.mjs
  if ($Deploy) {
    npx --yes supabase db query --linked -f supabase/deploy_registration_and_admin_rls.bundle.sql
  }
}
finally {
  Pop-Location
}
