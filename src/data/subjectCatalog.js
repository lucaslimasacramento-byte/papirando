// Catálogo local de disciplinas — usado como reserva quando o catálogo do Supabase não
// carrega (rede, tabela vazia, sessão nova).
//
// Os nomes são grafados em português correto. As formas sem acento continuam como ALIAS, e é
// assim que devem ficar: alias existe justamente para casar o que vem escrito de qualquer
// jeito no edital; o campo `nome` é o que aparece na tela do aluno.
//
// Até 21/09/2026 os nomes estavam sem acento aqui e no banco ("Nocoes de Direito Penal",
// "Matematica"), e como o nome canônico substitui o que a IA leu do edital, o erro chegava
// à tela — em português errado, num produto de concurso.
export const subjectCatalog = [
  {
    id: 'subject-lingua-portuguesa',
    nome: 'Língua Portuguesa',
    area: 'Básicas',
    aliases: ['Português', 'Portugues', 'Lingua Portuguesa', 'Lingua portuguesa', 'Lingua portguesa'],
  },
  {
    id: 'subject-matematica',
    nome: 'Matemática',
    area: 'Básicas',
    aliases: ['Matematica', 'Raciocínio Matemático', 'Raciocinio Matematico'],
  },
  {
    id: 'subject-informatica',
    nome: 'Informática',
    area: 'Básicas',
    aliases: [
      'Informatica',
      'Noções de Informática',
      'Nocoes de Informatica',
      'Tecnologia da Informação',
      'Tecnologia da Informacao',
      'Computação',
      'Computacao',
    ],
  },
  {
    id: 'subject-atualidades',
    nome: 'Atualidades',
    area: 'Básicas',
    aliases: ['Conhecimentos Gerais'],
  },
  {
    id: 'subject-nocoes-direito-constitucional',
    nome: 'Noções de Direito Constitucional',
    area: 'Jurídicas',
    aliases: ['Nocoes de Direito Constitucional', 'Direito Constitucional', 'Constitucional'],
  },
  {
    id: 'subject-nocoes-direito-administrativo',
    nome: 'Noções de Direito Administrativo',
    area: 'Jurídicas',
    aliases: ['Nocoes de Direito Administrativo', 'Direito Administrativo', 'Administrativo'],
  },
  {
    id: 'subject-nocoes-direito-penal',
    nome: 'Noções de Direito Penal',
    area: 'Jurídicas',
    aliases: ['Nocoes de Direito Penal', 'Direito Penal', 'Penal'],
  },
  {
    id: 'subject-nocoes-processo-penal',
    nome: 'Noções de Processo Penal',
    area: 'Jurídicas',
    aliases: ['Nocoes de Processo Penal', 'Direito Processual Penal', 'Processo Penal'],
  },
  {
    id: 'subject-nocoes-direitos-humanos',
    nome: 'Noções de Direitos Humanos',
    area: 'Jurídicas',
    aliases: ['Nocoes de Direitos Humanos', 'Direitos Humanos'],
  },
  {
    id: 'subject-nocoes-direito-penal-militar',
    nome: 'Noções de Direito Penal Militar',
    area: 'Jurídicas',
    aliases: ['Nocoes de Direito Penal Militar', 'Direito Penal Militar', 'Penal Militar'],
  },
  {
    id: 'subject-nocoes-direito-processual-penal-militar',
    nome: 'Noções de Direito Processual Penal Militar',
    area: 'Jurídicas',
    aliases: [
      'Nocoes de Direito Processual Penal Militar',
      'Direito Processual Penal Militar',
      'Processo Penal Militar',
    ],
  },
  {
    id: 'subject-legislacao-policial-militar',
    nome: 'Legislação Pertinente ao Policial Militar',
    area: 'Policial',
    aliases: [
      'Legislacao Pertinente ao Policial Militar',
      'Legislação Pertinente à Atuação do Policial Militar',
      'Legislação Pertinente ao Policial Militar de Alagoas',
      'Legislacao Pertinente ao Policial Militar de Alagoas',
      'Legislacao Pertinente a Atuacao do Policial Militar de Alagoas',
      'Legislação Militar',
      'Legislacao Militar',
    ],
  },
  {
    id: 'subject-biologia',
    nome: 'Biologia',
    area: 'Básicas',
    aliases: [],
  },
  {
    id: 'subject-fisica',
    nome: 'Física',
    area: 'Básicas',
    aliases: ['Fisica'],
  },
  {
    id: 'subject-quimica',
    nome: 'Química',
    area: 'Básicas',
    aliases: ['Quimica'],
  },
];
