import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// A plataforma fala por si: "Subir edital", "Gerar deck", "Corrigir redação". Ela não anuncia
// que usa IA a cada botão — isso descreve como o produto foi construído, não o que o aluno
// ganha. Este teste é a rede que impede a palavra voltar à interface sem querer.
//
// O que NÃO entra aqui de propósito:
// - comentários de código e nomes de variável (`aiLoading`, `editalAiClient`): eles precisam
//   continuar dizendo a verdade sobre a arquitetura, senão quem mexe no código se perde;
// - `src/pages/Admin*`: é tela interna, e lá o dono precisa saber qual provedor respondeu;
// - `src/pages/Termos.jsx`: documento legal — esconder o uso de IA ali seria o oposto de
//   transparência.

const RAIZES = ['src/pages', 'src/components'];
const IGNORADOS = [/^src\/pages\/Admin/, /^src\/pages\/Termos\.jsx$/];

// "IA" como palavra solta em português. Não pega MATÉRIA, POLÍCIA, MÉDIA nem `aiLoading`.
const PADRAO = /\bIA\b/;

function arquivosJsx(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivosJsx(caminho);
    return caminho.endsWith('.jsx') ? [caminho] : [];
  });
}

// Tira comentários de linha, de bloco e de JSX antes de procurar.
function semComentarios(codigo) {
  return codigo
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/\s\/\/.*$/gm, '');
}

describe('linguagem da interface', () => {
  const arquivos = RAIZES.flatMap(arquivosJsx).filter(
    (caminho) => !IGNORADOS.some((regra) => regra.test(caminho))
  );

  it('encontra os arquivos de tela', () => {
    expect(arquivos.length).toBeGreaterThan(20);
  });

  it('nao anuncia "IA" nas telas do aluno', () => {
    const achados = arquivos.flatMap((caminho) =>
      semComentarios(readFileSync(caminho, 'utf-8'))
        .split('\n')
        .map((linha, indice) => ({ caminho, numero: indice + 1, linha: linha.trim() }))
        .filter((item) => PADRAO.test(item.linha))
    );

    expect(
      achados.map((item) => `${item.caminho}:${item.numero} — ${item.linha.slice(0, 90)}`)
    ).toEqual([]);
  });
});
