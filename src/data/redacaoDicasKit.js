/**
 * Kit fixo de redação (conectivos, frases, modelos) — aba Dicas em Redações.
 * Conteúdo editorial; atualizar aqui quando revisar o material.
 */

export const REDACAO_KIT_VISAO_FINAL = {
  titulo: 'Visão final: sistema de aprovação',
  subtitulo:
    'Se você tiver conectivos organizados, frases prontas, modelos decoráveis e adaptação por banca (ícone ? em Nova correção), você não montou só uma área de redação — montou um fluxo de aprovação.',
  checklist: [
    'Conectivos organizados por função',
    'Frases prontas para ganhar tempo na prova',
    'Esqueleto 4+7+7+4 no editor (coluna à direita da folha)',
    'Adaptação ao estilo de cada banca (ícone ?)',
  ],
};

export const REDACAO_KIT_CONECTIVOS = [
  {
    id: 'intro',
    titulo: 'Introdução',
    emoji: '📌',
    itens: [
      'Diante do contexto contemporâneo,',
      'No cenário atual,',
      'Em uma sociedade marcada por,',
      'Observa-se que,',
      'É inegável que,',
      'Ao analisar a realidade brasileira,',
      'Em meio às transformações sociais,',
      'Considerando o contexto vigente,',
      'Sob a ótica social,',
      'À luz dos acontecimentos recentes,',
    ],
  },
  {
    id: 'adicao',
    titulo: 'Adição',
    emoji: '📌',
    itens: [
      'Além disso,',
      'Ademais,',
      'Outrossim,',
      'Somado a isso,',
      'Paralelamente,',
      'De maneira complementar,',
      'Vale ressaltar ainda que,',
      'Acrescenta-se que,',
      'Não obstante,',
      'Em complemento,',
    ],
  },
  {
    id: 'contraste',
    titulo: 'Contraste',
    emoji: '📌',
    itens: [
      'Entretanto,',
      'Contudo,',
      'Todavia,',
      'Por outro lado,',
      'Em contrapartida,',
      'Não obstante,',
      'Apesar disso,',
      'Ainda assim,',
      'Em oposição,',
      'Divergentemente,',
    ],
  },
  {
    id: 'causa',
    titulo: 'Causa',
    emoji: '📌',
    itens: [
      'Isso ocorre porque,',
      'Tal fato se deve a,',
      'Em razão de,',
      'Tendo em vista que,',
      'Considerando que,',
      'Em virtude de,',
      'Decorrente de,',
      'Como consequência de,',
      'Dado que,',
      'Uma vez que,',
    ],
  },
  {
    id: 'consequencia',
    titulo: 'Consequência',
    emoji: '📌',
    itens: [
      'Como resultado,',
      'Dessa forma,',
      'Assim,',
      'Consequentemente,',
      'Logo,',
      'Desse modo,',
      'Em decorrência disso,',
      'Por conseguinte,',
      'Isso resulta em,',
      'Isso acarreta,',
    ],
  },
  {
    id: 'conclusao',
    titulo: 'Conclusão',
    emoji: '📌',
    itens: [
      'Portanto,',
      'Diante do exposto,',
      'Assim,',
      'Em suma,',
      'Dessa maneira,',
      'Logo,',
      'Por conseguinte,',
      'Em síntese,',
      'Dessa forma,',
      'Sendo assim,',
    ],
  },
];

export const REDACAO_KIT_FRASES_PRONTAS = [
  {
    id: 'fp-intro',
    titulo: 'Introdução',
    emoji: '📌',
    itens: [
      'A problemática relacionada a [TEMA] evidencia um desafio relevante na sociedade brasileira.',
      'O debate acerca de [TEMA] tem ganhado destaque diante de seus impactos sociais.',
      'A questão de [TEMA] configura um tema de grande relevância no cenário atual.',
      'Observa-se que [TEMA] representa um entrave significativo para o desenvolvimento social.',
      'No contexto contemporâneo, [TEMA] emerge como uma questão central.',
    ],
  },
  {
    id: 'fp-arg',
    titulo: 'Argumentação',
    emoji: '📌',
    itens: [
      'Tal cenário evidencia que…',
      'Esse contexto demonstra que…',
      'Dessa forma, verifica-se que…',
      'Nesse sentido, percebe-se que…',
      'Sob essa perspectiva, nota-se que…',
    ],
  },
  {
    id: 'fp-prob',
    titulo: 'Problematização',
    emoji: '📌',
    itens: [
      'A ausência de políticas públicas eficazes contribui para…',
      'A negligência estatal intensifica…',
      'A falta de conscientização agrava…',
      'A insuficiência de medidas adequadas resulta em…',
      'A ineficiência estrutural favorece…',
    ],
  },
  {
    id: 'fp-cons',
    titulo: 'Consequência',
    emoji: '📌',
    itens: [
      'Como resultado, observa-se…',
      'Isso acarreta…',
      'Tal situação resulta em…',
      'Esse cenário gera…',
      'Como consequência, evidencia-se…',
    ],
  },
  {
    id: 'fp-interv',
    titulo: 'Conclusão (intervenção)',
    emoji: '📌',
    itens: [
      'Faz-se necessária a adoção de medidas que visem…',
      'Torna-se imprescindível a atuação do Estado no sentido de…',
      'É fundamental que a sociedade promova…',
      'Cabe ao poder público implementar ações voltadas a…',
      'Dessa forma, é necessário que haja investimento em…',
    ],
  },
];

export { REDACAO_KIT_MODELOS_FROM_ESQUELETOS as REDACAO_KIT_MODELOS } from './redacaoEsqueletosMilimetricos';
