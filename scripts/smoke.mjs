// Sobe o app e confere que ele ABRE.
//
// Build e testes passam com o app em branco: nem o Rollup nem o Vitest executam o React no
// navegador. Um ReferenceError no primeiro render — um `const` lido antes da declaração, um
// import que o dev server não resolve — derruba a página inteira sem falhar nenhum dos dois.
// Foi assim que o papirando.com saiu do ar duas vezes.
//
// Este script abre o app num Chromium de verdade e falha se o React não montar ou se houver
// erro de página. Uso: npm run smoke

import { spawn } from 'node:child_process';
import { setTimeout as esperar } from 'node:timers/promises';

const URL_DO_APP = 'http://127.0.0.1:5173/';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('playwright não está instalado. Rode: npm i -D playwright');
  process.exit(1);
}

const vite = spawn('npm', ['run', 'dev'], { stdio: 'ignore', detached: true });
const encerrar = () => { try { process.kill(-vite.pid); } catch { /* ja morreu */ } };
process.on('exit', encerrar);

// Espera o servidor responder em vez de dormir um tempo fixo, que fica curto em máquina
// lenta e longo à toa em máquina rápida.
let noAr = false;
for (let tentativa = 0; tentativa < 60 && !noAr; tentativa += 1) {
  await esperar(500);
  try {
    const resposta = await fetch(URL_DO_APP);
    noAr = resposta.ok;
  } catch { /* ainda subindo */ }
}

if (!noAr) {
  console.error('O dev server não subiu em 30s.');
  encerrar();
  process.exit(1);
}

const navegador = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  args: ['--no-proxy-server'],
});
const pagina = await navegador.newPage();

const errosDePagina = [];
pagina.on('pageerror', (erro) => errosDePagina.push(erro.message));

await pagina.goto(URL_DO_APP, { waitUntil: 'load' });
await esperar(4000);

const tamanhoDaRaiz = await pagina.evaluate(() => document.getElementById('root')?.innerHTML?.length ?? 0);
await navegador.close();
encerrar();

// Supabase e o servidor de IA podem não estar de pé aqui; o que importa é o React ter
// montado alguma coisa e nenhuma exceção ter escapado até a página.
if (errosDePagina.length > 0) {
  console.error('O app lançou erro ao abrir:');
  errosDePagina.slice(0, 5).forEach((erro) => console.error('  •', erro));
  process.exit(1);
}

if (tamanhoDaRaiz === 0) {
  console.error('O app abriu em branco: #root ficou vazio.');
  process.exit(1);
}

console.log(`OK — o app abriu (#root com ${tamanhoDaRaiz} caracteres).`);
