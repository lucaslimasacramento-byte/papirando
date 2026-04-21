/**
 * Conteúdo pedagógico: o que cada banca costuma cobrar + exemplo nível prova.
 * Chaves devem coincidir com os values do <select> em Redacoes.jsx.
 */

export const REDACAO_BANCA_OPTIONS = [
  { value: 'CESPE / CEBRASPE', label: 'CESPE / CEBRASPE (Certo/Errado)' },
  { value: 'FGV', label: 'FGV' },
  { value: 'FCC', label: 'Fundação Carlos Chagas (FCC)' },
  { value: 'VUNESP', label: 'VUNESP' },
  { value: 'IBFC', label: 'IBFC' },
  { value: 'AOCP', label: 'AOCP' },
  { value: 'IDECAN', label: 'IDECAN' },
];

export const COMPARACAO_BANCAS = `Comparação rápida (o que cada uma mais pesa)
• Mais rígida na gramática: CEBRASPE
• Mais exigente no conteúdo: FGV
• Mais “safe”: FCC / VUNESP
• Mais tranquila: IBFC
• Mais imprevisível: IDECAN

Estratégia (visão de jogo)
1. Estrutura perfeita (sempre)
2. Zero erro de português (ou o mínimo possível)
3. Argumentos claros (sem enrolação)
4. Repertório na medida (principalmente para FGV)
5. Treinar modelo adaptável (muda o tempero conforme a banca)`;

export const REDACAO_BANCA_GUIDES = {
  'CESPE / CEBRASPE': {
    titulo: 'CESPE / CEBRASPE',
    estilo: 'Certo/errado na objetiva e rigor forte na redação.',
    bullets: [
      'Valoriza argumentação lógica e técnica',
      'Cobrança forte de coesão e coerência',
      'Erro gramatical derruba ponto',
      'Texto direto, quase “jurídico”; evite firula',
      'Temas abstratos ou institucionais são comuns',
    ],
    resumo: 'Texto frio, preciso e bem estruturado.',
    exemplo: `A expansão da inteligência artificial no mercado de trabalho brasileiro insere-se em um processo mais amplo de reestruturação produtiva, caracterizado pela substituição de tarefas humanas por sistemas automatizados. Tal fenômeno, embora promova ganhos de eficiência, suscita implicações relevantes no âmbito socioeconômico.

Inicialmente, cumpre destacar que a IA tende a substituir atividades repetitivas e previsíveis, sobretudo em setores administrativos e industriais. Nesse contexto, trabalhadores com menor qualificação tecnológica tornam-se mais suscetíveis à exclusão do mercado, o que evidencia um potencial agravamento das desigualdades sociais já existentes.

Ademais, a concentração dos benefícios da inovação em empresas detentoras de capital tecnológico contribui para o aumento da assimetria econômica. A ausência de políticas públicas eficazes de requalificação profissional intensifica esse cenário, limitando a capacidade de adaptação da força de trabalho às novas exigências produtivas.

Outrossim, a lacuna regulatória no uso da inteligência artificial pode favorecer práticas laborais precarizadas, sobretudo em modelos de trabalho mediados por plataformas digitais. Tal contexto demanda a atuação estatal tanto na regulamentação quanto na promoção de capacitação profissional.

Dessa forma, a inteligência artificial deve ser compreendida como instrumento de transformação estrutural, cuja incorporação exige políticas que conciliem inovação tecnológica e inclusão social.`,
  },
  FGV: {
    titulo: 'FGV',
    estilo: 'Exige profundidade argumentativa e repertório.',
    bullets: [
      'Cobra profundidade argumentativa',
      'Valoriza repertório: filosofia, sociologia, atualidades',
      'Avalia bem a progressão de ideias',
      'Linguagem formal, com toque autoral aceitável',
    ],
    resumo: 'Texto inteligente, crítico e bem fundamentado.',
    exemplo: `A ascensão da inteligência artificial no século XXI materializa previsões já delineadas por pensadores como Alvin Toffler, segundo os quais revoluções tecnológicas redefinem profundamente o trabalho humano. No Brasil, essa transformação evidencia tanto avanços produtivos quanto desafios sociais significativos.

Em primeiro lugar, é inegável que a IA potencializa a eficiência econômica, ao automatizar tarefas e otimizar processos. Contudo, conforme indicam estudos contemporâneos, essa inovação não se distribui de forma equitativa, atingindo de maneira mais intensa trabalhadores com baixa qualificação, que enfrentam maior risco de substituição.

Além disso, a lógica de mercado tende a concentrar os ganhos tecnológicos em grandes corporações, ampliando a desigualdade de renda. Tal fenômeno é agravado pela insuficiência de políticas públicas voltadas à requalificação profissional e à inclusão digital, o que compromete a mobilidade social.

Sob essa perspectiva, a ausência de uma estratégia nacional para lidar com os impactos da IA evidencia uma lacuna estrutural. É necessário que o Estado atue de forma ativa, promovendo educação tecnológica e regulamentando o uso da inteligência artificial.

Assim, apenas por meio da articulação entre inovação e responsabilidade social será possível garantir que os benefícios da IA sejam amplamente distribuídos.`,
  },
  FCC: {
    titulo: 'FCC',
    estilo: 'Tradicional: clareza e organização.',
    bullets: [
      'Estrutura clássica: introdução, desenvolvimento, conclusão',
      'Foco em clareza e organização',
      'Menos exigência em repertório sofisticado',
      'Gramática conta bastante, sem exagero',
    ],
    resumo: 'Faça o básico bem feito.',
    exemplo: `A inteligência artificial tem promovido transformações relevantes no mercado de trabalho brasileiro, gerando impactos tanto positivos quanto negativos. Nesse contexto, torna-se fundamental analisar suas consequências e possíveis soluções.

Em primeiro lugar, a utilização da IA contribui para o aumento da produtividade, uma vez que permite a automação de tarefas repetitivas e a otimização de processos. Dessa forma, empresas tornam-se mais eficientes e competitivas no cenário econômico.

Entretanto, essa mesma tecnologia pode ocasionar a substituição de trabalhadores, especialmente em funções operacionais. Tal situação pode resultar no aumento do desemprego e na ampliação das desigualdades sociais, caso não haja medidas adequadas.

Além disso, muitos profissionais não possuem acesso à capacitação necessária para acompanhar essas mudanças, o que dificulta sua reinserção no mercado de trabalho.

Diante desse cenário, é essencial que o poder público invista em educação e qualificação profissional, promovendo a inclusão digital e preparando a população para as novas exigências.

Assim, a inteligência artificial poderá contribuir para o desenvolvimento econômico sem comprometer a justiça social.`,
  },
  VUNESP: {
    titulo: 'VUNESP',
    estilo: 'Temas sociais e atuais; posicionamento claro.',
    bullets: [
      'Temas sociais e atuais',
      'Cobra opinião e proposta de solução',
      'Linguagem clara, sem “inventar moda”',
      'Penaliza erros, mas sem ser carrasca',
    ],
    resumo: 'Texto equilibrado, objetivo e com posicionamento claro.',
    exemplo: `O avanço da inteligência artificial tem provocado mudanças significativas no mercado de trabalho brasileiro. Diante desse cenário, é necessário avaliar seus impactos e discutir formas de minimizar seus efeitos negativos.

Por um lado, a IA contribui para a modernização das empresas, aumentando a produtividade e reduzindo erros. Além disso, novas profissões surgem, especialmente na área tecnológica, ampliando oportunidades para profissionais qualificados.

Por outro lado, a automação pode substituir trabalhadores em diversas funções, sobretudo aquelas que envolvem atividades repetitivas. Isso pode gerar desemprego e aumentar a desigualdade social, especialmente entre indivíduos com menor acesso à educação.

Diante disso, torna-se fundamental que o governo invista em políticas públicas voltadas à capacitação profissional, além de incentivar a inclusão digital por meio de programas educacionais.

Portanto, a inteligência artificial deve ser utilizada de forma responsável, garantindo que seus benefícios sejam distribuídos de maneira mais equilibrada na sociedade.`,
  },
  IBFC: {
    titulo: 'IBFC',
    estilo: 'Mais tranquila; estrutura e entendimento do tema.',
    bullets: [
      'Avaliação mais básica',
      'Foco em estrutura e entendimento do tema',
      'Gramática importa, mas não é decisiva',
      'Pouco aprofundamento teórico',
    ],
    resumo: 'Simples bem feito — não invente.',
    exemplo: `A inteligência artificial tem ganhado espaço no mercado de trabalho brasileiro, trazendo mudanças importantes. Esse avanço tecnológico apresenta vantagens, mas também desafios que precisam ser considerados.

Entre os aspectos positivos, destaca-se o aumento da produtividade, já que a IA permite automatizar tarefas e tornar os processos mais eficientes. Além disso, novas oportunidades de emprego surgem na área de tecnologia.

Por outro lado, muitas funções podem ser substituídas por máquinas, o que pode gerar desemprego. Esse problema é ainda mais grave para trabalhadores que não possuem qualificação adequada.

Outro ponto importante é a dificuldade de acesso à tecnologia, que pode aumentar a desigualdade social. Nem todos têm as mesmas oportunidades de adaptação a esse novo cenário.

Diante disso, é fundamental investir em educação e qualificação profissional, preparando as pessoas para as novas demandas do mercado.

Assim, a inteligência artificial pode trazer benefícios, desde que seja acompanhada de medidas que promovam inclusão social.`,
  },
  AOCP: {
    titulo: 'AOCP',
    estilo: 'Intermediário; pode pedir proposta de intervenção.',
    bullets: [
      'Cobra argumentação consistente',
      'Estrutura padrão obrigatória',
      'Pode exigir proposta de intervenção',
      'Linguagem formal, sem exagero técnico',
    ],
    resumo: 'Equilíbrio entre conteúdo e forma.',
    exemplo: `A inteligência artificial tem se consolidado como um dos principais fatores de transformação do mercado de trabalho. No Brasil, seus efeitos são percebidos tanto no aumento da produtividade quanto na alteração das relações laborais.

Inicialmente, é importante destacar que a IA possibilita maior eficiência nas atividades produtivas, automatizando tarefas e reduzindo custos. Esse processo contribui para o crescimento econômico e para a competitividade das empresas.

Entretanto, essa transformação também apresenta desafios, como a substituição de trabalhadores em funções repetitivas. Além disso, a falta de qualificação profissional dificulta a adaptação de parte da população.

Outro aspecto relevante é o risco de ampliação das desigualdades sociais, caso os benefícios da tecnologia não sejam distribuídos de forma equilibrada.

Diante disso, torna-se essencial que o Estado promova políticas públicas de capacitação e inclusão digital, preparando os trabalhadores para as novas exigências.

Assim, será possível conciliar desenvolvimento tecnológico e justiça social.`,
  },
  IDECAN: {
    titulo: 'IDECAN',
    estilo: 'Varia — leia o edital; pode ser mais interpretativa.',
    bullets: [
      'Perfil pode mudar entre concursos',
      'Estrutura conta bastante',
      'Pode cobrar texto mais opinativo',
      'Combine técnica + leitura fina do comando',
    ],
    resumo: 'Leia o edital: a banca muda o jogo.',
    exemplo: `A inteligência artificial representa um dos principais avanços tecnológicos da atualidade. No contexto do mercado de trabalho brasileiro, sua expansão tem provocado mudanças significativas que exigem reflexão.

Nesse sentido, observa-se que a IA contribui para a otimização de processos, tornando as atividades mais rápidas e eficientes. Isso favorece o desenvolvimento econômico e a modernização das empresas.

No entanto, essa mesma tecnologia pode gerar impactos negativos, como a substituição da mão de obra humana. Trabalhadores menos qualificados tendem a enfrentar maiores dificuldades de inserção no mercado.

Além disso, a desigualdade no acesso à tecnologia pode intensificar diferenças sociais, dificultando a inclusão de determinados grupos.

Dessa forma, torna-se necessário investir em educação e promover o acesso à tecnologia, garantindo que mais pessoas possam se adaptar às mudanças.

Portanto, a inteligência artificial deve ser utilizada com responsabilidade, visando o equilíbrio entre progresso e inclusão social.`,
  },
};
