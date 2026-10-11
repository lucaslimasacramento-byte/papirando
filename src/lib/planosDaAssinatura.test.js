import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// O selo do cabecalho e a pagina de Assinatura tem de contar a mesma historia.
//
// Existiam tres niveis no selo: Folha, Papiro e "Master". Master nao e plano — e o papel de
// administrador. O resultado era o cabecalho anunciando um plano que nao existe no produto
// enquanto a pagina de Assinatura, a um clique dali, dizia "Plano atual: Gratis".
//
// Este teste nao mede comportamento: e uma regra. Se alguem acrescentar um terceiro nivel,
// ele quebra e obriga a decisao a ser consciente.
const raiz = resolve(__dirname, '..');

function ler(caminho) {
  return readFileSync(resolve(raiz, caminho), 'utf8');
}

describe('planos da assinatura', () => {
  const selo = ler('components/SubscriptionPlanSeal.jsx');

  it('o selo tem exatamente dois niveis: folha e papiro', () => {
    const niveis = [...selo.matchAll(/^ {2}(\w+): \{$/gm)].map((m) => m[1]);
    expect(niveis).toEqual(['folha', 'papiro']);
  });

  it('nao ha plano "master" em lugar nenhum do selo', () => {
    // O comentario do topo explica por que ele saiu; o codigo nao pode trazer de volta.
    const semComentarios = selo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(semComentarios.toLowerCase()).not.toContain('master');
  });

  it('o cabecalho recebe o plano real, nao o atalho de administrador', () => {
    const app = ler('App.jsx');

    // A regra, nao a frase exata: este teste ja travou uma mudanca legitima do selo porque
    // comparava a linha inteira. O que precisa valer e que o plano exibido NAO venha de
    // `isAdmin` — ser admin libera o acesso, mas nao compra assinatura.
    const linha = app.match(/subscriptionPlan=\{[^}]*\}/)?.[0] || '';

    expect(linha).not.toBe('');
    expect(linha).not.toContain('isAdmin');
    expect(linha).not.toContain('master');
    expect(linha).not.toContain('isPremiumPlan');
  });
});
