// Citações do dia do painel.
//
// Só entram frases com autoria que dá para sustentar. A internet está cheia de citação
// motivacional pendurada no nome errado, e num produto de estudo isso é pior que noutro
// lugar: o aluno confia no que lê aqui.
//
// Ficaram DE FORA, por serem atribuições falsas ou duvidosas, ainda que populares:
//   "Não é o mais forte que sobrevive..."        -> não é de Darwin (é paráfrase de Leon
//                                                   Megginson, 1963)
//   "Somos o que repetidamente fazemos..."       -> não é de Aristóteles; é de Will Durant
//                                                   resumindo Aristóteles (entrou com o
//                                                   crédito certo)
//   "Diga-me e eu esqueço, ensina-me e eu..."    -> não é de Franklin
//   "Não importa quão devagar você vá..."        -> sem fonte em Confúcio
//   "A sorte é o encontro da preparação com..."  -> sem fonte em Sêneca
//
// Onde a atribuição é tradicional mas não documentada, o campo `autor` diz "atribuída a".

const CITACOES = [
  { texto: 'No campo da observação, o acaso favorece apenas as mentes preparadas.', autor: 'Louis Pasteur' },
  { texto: 'Gênio é um por cento de inspiração e noventa e nove por cento de transpiração.', autor: 'Thomas Edison' },
  { texto: 'A educação é a arma mais poderosa que você pode usar para mudar o mundo.', autor: 'Nelson Mandela' },
  { texto: 'Se eu vi mais longe, foi por estar sobre ombros de gigantes.', autor: 'Isaac Newton' },
  { texto: 'Nada na vida deve ser temido, somente compreendido. Agora é hora de compreender mais, para temer menos.', autor: 'Marie Curie' },
  { texto: 'Não é porque as coisas são difíceis que não ousamos; é porque não ousamos que elas são difíceis.', autor: 'Sêneca' },
  { texto: 'Não são os fatos que perturbam os homens, mas as opiniões que eles têm a respeito dos fatos.', autor: 'Epicteto' },
  { texto: 'A excelência não é um ato, mas um hábito.', autor: 'Will Durant, resumindo Aristóteles' },
  { texto: 'A educação é o nosso passaporte para o futuro, pois o amanhã pertence a quem se prepara hoje.', autor: 'Malcolm X' },
  { texto: 'Ninguém educa ninguém, ninguém educa a si mesmo: os homens se educam entre si, mediatizados pelo mundo.', autor: 'Paulo Freire' },
  { texto: 'Feliz aquele que transfere o que sabe e aprende o que ensina.', autor: 'Cora Coralina' },
  { texto: 'Viver é muito perigoso.', autor: 'Guimarães Rosa, em Grande Sertão: Veredas' },
  { texto: 'Sucesso não é acidente. É trabalho duro, perseverança, estudo, sacrifício e, acima de tudo, amor pelo que se faz.', autor: 'Pelé' },
  { texto: 'Só sei que nada sei.', autor: 'atribuída a Sócrates' },
  { texto: 'Conhece-te a ti mesmo.', autor: 'inscrição no templo de Delfos' },
  { texto: 'A sorte ajuda os audazes.', autor: 'Virgílio, na Eneida' },
];

// A citação é do DIA, não do render: sorteio a cada re-render trocaria a frase a cada
// clique na tela, e frase que pisca vira ruído. O índice sai da data, então todo mundo que
// abre no mesmo dia vê a mesma — e ela muda sozinha na virada.
export function fraseDoDia(data = new Date()) {
  const dia = data instanceof Date && !Number.isNaN(data.getTime()) ? data : new Date();
  const diasDesdeEpoca = Math.floor(
    new Date(dia.getFullYear(), dia.getMonth(), dia.getDate()).getTime() / 86400000
  );
  return CITACOES[Math.abs(diasDesdeEpoca) % CITACOES.length];
}

export const TOTAL_DE_FRASES = CITACOES.length;
