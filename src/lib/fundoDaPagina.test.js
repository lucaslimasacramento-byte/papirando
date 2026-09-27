import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// O fundo de papel é pintado UMA vez, pelo container de conteúdo do App
// (`pl-paper-bg-soft` em src/App.jsx). Página que declarava a própria classe trocava a pauta
// no meio da navegação — `pl-paper-bg` risca a cada 47px e rola junto com o conteúdo, a do
// container risca a cada 56px e fica parada —, e a troca de tela dava um sobressalto.
//
// O Dashboard é a exceção combinada: ele pinta o próprio fundo chapado porque o layout dele
// é de painel, não de folha.
const PASTA = 'src/pages';
const EXCECOES = new Set(['Dashboard.jsx', 'Login.jsx']);
const CLASSES_DE_FUNDO = /className="[^"]*\bpl-paper-bg(-soft)?\b/;

describe('fundo das páginas', () => {
  const arquivos = readdirSync(PASTA).filter((nome) => nome.endsWith('.jsx'));

  it('encontra as páginas', () => {
    expect(arquivos.length).toBeGreaterThan(30);
  });

  it('nenhuma página pinta o próprio fundo de papel', () => {
    const culpadas = arquivos
      .filter((nome) => !EXCECOES.has(nome))
      .filter((nome) => CLASSES_DE_FUNDO.test(readFileSync(join(PASTA, nome), 'utf-8')));

    expect(culpadas).toEqual([]);
  });

  it('o container do App continua pintando o fundo', () => {
    expect(readFileSync('src/App.jsx', 'utf-8')).toContain('pl-paper-bg-soft');
  });
});
