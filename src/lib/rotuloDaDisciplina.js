// O nome da disciplina como o aluno escreve, nao como o banco guarda.
//
// As questoes do ENEM entram pela API (api.enem.dev) e o campo `discipline` vem em formato
// de slug: "matematica", "ciencias-natureza", "linguagens". Esse valor ia direto para a tela,
// e o aluno lia "matematica" — sem acento e sem maiuscula — no lugar de honra do cartao.
//
// Nao da para resolver so com CSS: `text-transform: capitalize` conserta a maiuscula mas nao
// devolve o acento, e "MATEMATICA" em caixa alta continua errado. O acento tem de voltar no
// dado. Por isso aqui ha um dicionario para o que a gente conhece e uma regra de titulo para
// o resto — um nome desconhecido sai apresentavel em vez de sair cru.

// O que as fontes mandam (ENEM, TEC, importacoes antigas) e como cada um se escreve.
const NOMES_CONHECIDOS = {
  matematica: 'Matemática',
  'matematica-e-suas-tecnologias': 'Matemática',
  linguagens: 'Linguagens',
  'linguagens-codigos-e-suas-tecnologias': 'Linguagens e Códigos',
  'ciencias-humanas': 'Ciências Humanas',
  'ciencias-humanas-e-suas-tecnologias': 'Ciências Humanas',
  'ciencias-natureza': 'Ciências da Natureza',
  'ciencias-da-natureza': 'Ciências da Natureza',
  'ciencias-natureza-e-suas-tecnologias': 'Ciências da Natureza',
  'lingua-portuguesa': 'Língua Portuguesa',
  portugues: 'Português',
  redacao: 'Redação',
  historia: 'História',
  geografia: 'Geografia',
  filosofia: 'Filosofia',
  sociologia: 'Sociologia',
  biologia: 'Biologia',
  fisica: 'Física',
  quimica: 'Química',
  ingles: 'Inglês',
  espanhol: 'Espanhol',
  informatica: 'Informática',
  estatistica: 'Estatística',
  'raciocinio-logico': 'Raciocínio Lógico',
  'direito-constitucional': 'Direito Constitucional',
  'direito-administrativo': 'Direito Administrativo',
  'direito-penal': 'Direito Penal',
  'direito-processual-penal': 'Direito Processual Penal',
  'direito-civil': 'Direito Civil',
  'direito-processual-civil': 'Direito Processual Civil',
  'direito-tributario': 'Direito Tributário',
  'direito-do-trabalho': 'Direito do Trabalho',
  'direitos-humanos': 'Direitos Humanos',
  'legislacao-especial': 'Legislação Especial',
  'nocoes-de-administracao': 'Noções de Administração',
  'atualidades': 'Atualidades',
  'conhecimentos-gerais': 'Conhecimentos Gerais',
  'conhecimentos-especificos': 'Conhecimentos Específicos',
  'administracao-publica': 'Administração Pública',
  'contabilidade': 'Contabilidade',
  'etica-no-servico-publico': 'Ética no Serviço Público',
};

// Palavras que ficam minusculas no meio do nome. "Direito Do Trabalho" denuncia o
// title-case automatico na hora.
const CONECTIVOS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'a', 'o', 'para', 'com']);

// Acentos que o slug comeu. Um dicionario de palavra inteira, nao de regra: "legislacao" ->
// "legislação" e seguro, mas uma regra do tipo "-cao vira -ção" erraria em "falcao" e em
// nome proprio. Aqui so entra o vocabulario que aparece em nome de disciplina.
const ACENTOS = {
  legislacao: 'legislação',
  concordancia: 'concordância',
  regencia: 'regência',
  colocacao: 'colocação',
  pontuacao: 'pontuação',
  ortografia: 'ortografia',
  semantica: 'semântica',
  morfologia: 'morfologia',
  acentuacao: 'acentuação',
  analise: 'análise',
  sintatica: 'sintática',
  calculo: 'cálculo',
  algebra: 'álgebra',
  funcoes: 'funções',
  funcao: 'função',
  equacao: 'equação',
  inequacao: 'inequação',
  numeros: 'números',
  numero: 'número',
  grafico: 'gráfico',
  graficos: 'gráficos',
  razao: 'razão',
  proporcao: 'proporção',
  porcentagem: 'porcentagem',
  area: 'área',
  areas: 'áreas',
  medias: 'médias',
  media: 'média',
  constituicao: 'constituição',
  licitacao: 'licitação',
  licitacoes: 'licitações',
  organizacao: 'organização',
  execucao: 'execução',
  obrigacoes: 'obrigações',
  prescricao: 'prescrição',
  sucessoes: 'sucessões',
  principios: 'princípios',
  orgaos: 'órgãos',
  orgao: 'órgão',
  beneficios: 'benefícios',
  responsabilidade: 'responsabilidade',
  improbidade: 'improbidade',
  tributos: 'tributos',
  gestao: 'gestão',
  redacao: 'redação',
  educacao: 'educação',
  administracao: 'administração',
  comunicacao: 'comunicação',
  informacao: 'informação',
  interpretacao: 'interpretação',
  producao: 'produção',
  construcao: 'construção',
  constitucional: 'constitucional',
  nocoes: 'noções',
  etica: 'ética',
  fisica: 'física',
  quimica: 'química',
  biologia: 'biologia',
  matematica: 'matemática',
  estatistica: 'estatística',
  informatica: 'informática',
  historia: 'história',
  geografia: 'geografia',
  filosofia: 'filosofia',
  sociologia: 'sociologia',
  logico: 'lógico',
  logica: 'lógica',
  raciocinio: 'raciocínio',
  publico: 'público',
  publicos: 'públicos',
  publicas: 'públicas',
  publica: 'pública',
  servico: 'serviço',
  servicos: 'serviços',
  pericia: 'perícia',
  tributario: 'tributário',
  previdenciario: 'previdenciário',
  civel: 'cível',
  penal: 'penal',
  ingles: 'inglês',
  portugues: 'português',
  lingua: 'língua',
  especificos: 'específicos',
  especifico: 'específico',
  tecnologias: 'tecnologias',
  ciencias: 'ciências',
  ciencia: 'ciência',
  juridico: 'jurídico',
  juridica: 'jurídica',
  codigos: 'códigos',
  pratica: 'prática',
  teoria: 'teoria',
  saude: 'saúde',
  familia: 'família',
  politica: 'política',
  economia: 'economia',
  contabil: 'contábil',
  orcamento: 'orçamento',
  orcamentario: 'orçamentário',
};

// So repoe acento em texto que claramente perdeu o acento. Se o nome ja tem um acento em
// qualquer letra, ele foi escrito por gente — mexer ali seria corrigir quem acertou.
function reporAcentos(valor) {
  if (valor !== semAcento(valor)) return valor;
  return valor.replace(/[a-zA-Z]+/g, (palavra) => {
    const acentuada = ACENTOS[palavra.toLowerCase()];
    if (!acentuada) return palavra;
    // Mantem a caixa de quem chamou: a funcao de titulo roda depois.
    return palavra === palavra.toUpperCase() && palavra.length > 1
      ? acentuada.toLocaleUpperCase('pt-BR')
      : acentuada;
  });
}

function semAcento(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// A chave do dicionario: minuscula, sem acento, separada por hifen. Assim "Ciências da
// Natureza", "ciencias_da_natureza" e "CIENCIAS DA NATUREZA" caem todas na mesma entrada.
export function chaveDaDisciplina(valor) {
  return semAcento(String(valor || '').trim().toLowerCase())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function emTitulo(valor) {
  const palavras = reporAcentos(String(valor || ''))
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ');

  return palavras
    .map((palavra, indice) => {
      const minuscula = palavra.toLocaleLowerCase('pt-BR');
      // Conectivo so fica minusculo no meio: "Ética no Serviço", mas "Do Lado de Ca" nunca
      // comeca minusculo.
      if (indice > 0 && CONECTIVOS.has(semAcento(minuscula))) return minuscula;
      // Sigla ja escrita em caixa alta (SUS, ECA, CLT) se mantem.
      if (palavra.length <= 4 && palavra === palavra.toLocaleUpperCase('pt-BR') && /[A-ZÀ-Ý]/.test(palavra)) {
        return palavra;
      }
      return minuscula.charAt(0).toLocaleUpperCase('pt-BR') + minuscula.slice(1);
    })
    .join(' ');
}

// O rotulo que vai para a tela. Vazio entra, vazio sai — quem chama decide o que mostrar no
// lugar, porque "Sem disciplina" na lista e "—" no cartao sao decisoes de tela, nao daqui.
export function rotuloDaDisciplina(valor) {
  const cru = String(valor || '').trim();
  if (!cru) return '';

  const conhecido = NOMES_CONHECIDOS[chaveDaDisciplina(cru)];
  if (conhecido) return conhecido;

  // Ja veio escrito como gente ("Língua Portuguesa"): nao mexe. Reescrever aqui estragaria
  // nomes que o admin digitou de proposito, como "Direito Penal - Parte Geral".
  if (/[A-ZÀ-Ý]/.test(cru.charAt(0)) && /[a-zà-ÿ]/.test(cru)) return cru;

  return emTitulo(cru);
}

// O mesmo tratamento serve para topico e area: sao campos livres que chegam da mesma fonte.
export const rotuloDoTopico = rotuloDaDisciplina;
