/**
 * Esqueletos 4 + 7 + 7 + 4 linhas (com faixas separadoras).
 * Usados no editor (seletor) e na aba Dicas (kit).
 */

const B = (titulo, linhas) => `──────── ${titulo} · ${linhas} linhas ────────`;

export const REDACAO_COMO_USAR_ESQUELETO = `Como usar (virar máquina de redação)
• Decore 1 modelo (de preferência o Universal).
• Treine encaixar: tema → tese; 2 ideias → desenvolvimento; 1 solução → conclusão.
• Tempo médio: 15–20 min por redação.`;

const M1 = `${B('INTRODUÇÃO', 4)}
Diante do contexto contemporâneo, observa-se que **[TEMA]** tem ganhado destaque na sociedade brasileira.
Tal cenário evidencia impactos relacionados a **[EIXO 1]** e **[EIXO 2]**.
Nesse sentido, torna-se fundamental analisar essa problemática.
Isso porque seus efeitos interferem diretamente em **[ÁREA SOCIAL]**.
${B('DESENVOLVIMENTO 1', 7)}
Em primeiro lugar, é importante destacar que **[IDEIA 1]**.
Isso ocorre porque **[CAUSA 1]**.
Nesse sentido, **[EXPLICAÇÃO]**.
Tal cenário evidencia que **[ANÁLISE]**.
Como consequência, **[EFEITO 1]**.
Isso resulta em **[REFORÇO DO PROBLEMA]**.
Logo, percebe-se que **[FECHAMENTO DO PARÁGRAFO]**.
${B('DESENVOLVIMENTO 2', 7)}
Além disso, observa-se que **[IDEIA 2]**.
Tal fato se deve a **[CAUSA 2]**.
Nesse contexto, **[EXPLICAÇÃO 2]**.
Dessa forma, **[ANÁLISE 2]**.
Como resultado, **[EFEITO 2]**.
Isso agrava **[PROBLEMA SOCIAL]**.
Portanto, evidencia-se que **[FECHAMENTO]**.
${B('CONCLUSÃO', 4)}
Diante do exposto, torna-se essencial que **[AGENTE]** promova **[AÇÃO]**.
Isso deve ocorrer por meio de **[MEIO]**.
Tal medida visa **[FINALIDADE]**.
Assim, será possível garantir **[RESULTADO]**.`;

const M2 = `${B('INTRODUÇÃO', 4)}
No cenário atual, a questão de **[TEMA]** revela-se um desafio relevante.
Esse problema impacta diretamente **[EIXO 1]** e **[EIXO 2]**.
Dessa forma, torna-se necessário discutir suas causas e efeitos.
Sobretudo, considerando suas consequências sociais.
${B('DESENVOLVIMENTO 1', 7)}
Inicialmente, observa-se que **[PROBLEMA 1]**.
Isso ocorre em razão de **[CAUSA]**.
Nesse sentido, **[EXPLICAÇÃO]**.
Tal situação demonstra que **[ANÁLISE]**.
Como consequência, **[EFEITO]**.
Isso contribui para **[IMPACTO]**.
Logo, percebe-se que **[FECHAMENTO]**.
${B('DESENVOLVIMENTO 2', 7)}
Ademais, destaca-se que **[PROBLEMA 2]**.
Tal cenário se deve à **[CAUSA 2]**.
Nesse contexto, **[EXPLICAÇÃO]**.
Isso evidencia que **[ANÁLISE]**.
Como resultado, **[EFEITO]**.
Isso agrava **[PROBLEMA MAIOR]**.
Portanto, percebe-se que **[FECHAMENTO]**.
${B('CONCLUSÃO', 4)}
Portanto, é imprescindível que **[AGENTE]** implemente **[AÇÃO]**.
Por meio de **[MEIO]**, será possível **[OBJETIVO]**.
Além disso, tal medida contribui para **[EFEITO]**.
Assim, haverá melhoria em **[ÁREA]**.`;

const M3 = `${B('INTRODUÇÃO', 4)}
A problemática relacionada a **[TEMA]** insere-se em um contexto estrutural.
Tal cenário impacta diretamente **[ÁREA]**.
Nesse sentido, torna-se necessário analisar suas implicações.
Especialmente no que se refere a **[EIXOS]**.
${B('DESENVOLVIMENTO 1', 7)}
Inicialmente, cumpre destacar que **[IDEIA 1]**.
Tal fenômeno decorre de **[CAUSA]**.
Nesse sentido, **[EXPLICAÇÃO]**.
Isso resulta em **[EFEITO]**.
Dessa forma, verifica-se que **[ANÁLISE]**.
Tal situação evidencia **[IMPACTO]**.
Logo, observa-se que **[FECHAMENTO]**.
${B('DESENVOLVIMENTO 2', 7)}
Ademais, observa-se que **[IDEIA 2]**.
A ausência de **[POLÍTICA]** contribui para **[PROBLEMA]**.
Nesse contexto, **[EXPLICAÇÃO]**.
Isso intensifica **[EFEITO]**.
Como consequência, **[IMPACTO]**.
Tal cenário demonstra **[ANÁLISE]**.
Portanto, percebe-se que **[FECHAMENTO]**.
${B('CONCLUSÃO', 4)}
Portanto, faz-se necessária a adoção de medidas voltadas a **[AÇÃO]**.
Por meio de **[MEIO]**, será possível **[OBJETIVO]**.
Tal intervenção visa **[FINALIDADE]**.
Assim, promove-se **[RESULTADO]**.`;

const M4 = `${B('INTRODUÇÃO', 4)}
Conforme observa **[AUTOR]**, **[IDEIA RESUMIDA]**.
Nesse contexto, o tema **[TEMA]** torna-se relevante.
Isso porque impacta **[EIXO 1]** e **[EIXO 2]**.
Dessa forma, exige análise crítica.
${B('DESENVOLVIMENTO 1', 7)}
Sob essa perspectiva, observa-se que **[IDEIA 1]**.
Isso se justifica pelo fato de que **[CAUSA]**.
Nesse sentido, **[EXPLICAÇÃO]**.
Entretanto, **[PROBLEMATIZAÇÃO]**.
Tal cenário evidencia **[ANÁLISE]**.
Como consequência, **[EFEITO]**.
Logo, percebe-se que **[FECHAMENTO]**.
${B('DESENVOLVIMENTO 2', 7)}
Além disso, destaca-se que **[IDEIA 2]**.
Tal situação se deve a **[CAUSA 2]**.
Nesse contexto, **[EXPLICAÇÃO]**.
Isso demonstra que **[ANÁLISE]**.
Como resultado, **[EFEITO]**.
Isso agrava **[PROBLEMA]**.
Portanto, evidencia-se que **[FECHAMENTO]**.
${B('CONCLUSÃO', 4)}
Dessa forma, torna-se imprescindível que **[AGENTE]** promova **[AÇÃO]**.
Por meio de **[MEIO]**, será possível **[OBJETIVO]**.
Tal medida visa **[FINALIDADE]**.
Assim, garante-se **[RESULTADO]**.`;

const M5 = `${B('INTRODUÇÃO', 4)}
O tema **[TEMA]** tem gerado debates na sociedade brasileira.
Tal questão impacta diretamente **[EIXOS]**.
Nesse sentido, torna-se relevante sua análise.
Principalmente diante de seus efeitos.
${B('DESENVOLVIMENTO 1', 7)}
Em primeiro lugar, **[IDEIA 1]**.
Isso ocorre porque **[CAUSA]**.
Nesse contexto, **[EXPLICAÇÃO]**.
Tal situação evidencia **[ANÁLISE]**.
Como consequência, **[EFEITO]**.
Isso resulta em **[PROBLEMA]**.
Logo, percebe-se que **[FECHAMENTO]**.
${B('DESENVOLVIMENTO 2', 7)}
Além disso, **[IDEIA 2]**.
Tal fato se deve a **[CAUSA]**.
Nesse sentido, **[EXPLICAÇÃO]**.
Isso demonstra **[ANÁLISE]**.
Como resultado, **[EFEITO]**.
Isso agrava **[PROBLEMA]**.
Portanto, evidencia-se que **[FECHAMENTO]**.
${B('CONCLUSÃO', 4)}
Assim, é necessário que **[AGENTE]** promova **[AÇÃO]**.
Por meio de **[MEIO]**, busca-se **[OBJETIVO]**.
Tal medida contribui para **[EFEITO]**.
Dessa forma, garante-se **[RESULTADO]**.`;

/** Lista para o seletor do editor (id estável). */
export const REDACAO_ESQUELETOS_MILIMETRICOS = [
  { id: 'milim-1', shortLabel: '1', titulo: 'Universal clássico', badge: '4+7+7+4', corpo: M1 },
  { id: 'milim-2', shortLabel: '2', titulo: 'Problema + consequência', badge: '4+7+7+4', corpo: M2 },
  { id: 'milim-3', shortLabel: '3', titulo: 'CEBRASPE (técnico)', badge: '4+7+7+4', corpo: M3 },
  { id: 'milim-4', shortLabel: '4', titulo: 'FGV (repertório)', badge: '4+7+7+4', corpo: M4 },
  { id: 'milim-5', shortLabel: '5', titulo: 'Direto e eficiente', badge: '4+7+7+4', corpo: M5 },
];

/** Formato da aba Dicas (modelos decoráveis). */
export const REDACAO_KIT_MODELOS_FROM_ESQUELETOS = REDACAO_ESQUELETOS_MILIMETRICOS.map((e) => ({
  id: e.id,
  titulo: `🧱 ${e.titulo}`,
  badge: `${e.badge} · milimétrico`,
  corpo: e.corpo,
}));
