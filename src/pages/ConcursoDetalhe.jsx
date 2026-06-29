import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Compass,
  DollarSign,
  ExternalLink,
  GraduationCap,
  Heart,
  LibraryBig,
  Pencil,
  Plus,
  Users,
} from 'lucide-react';
import {
  buildContestForRole,
  CONTEST_STATUS_LABELS,
  findRelatedContests,
  getContestRoles,
  getPrimaryContestRole,
  normalizeContestStatus,
} from '../lib/contestGrouping';
import { getContestAreaTheme } from '../lib/contestAreaTheme';
import { storageThumb } from '../lib/imageUrl';
import { supabase } from '../lib/supabase';
import { loadContestTemplateContent } from '../lib/contestCatalogApi';

const STATUS_LABELS = CONTEST_STATUS_LABELS;

const STAGE_LABELS = {
  prova_objetiva: 'Prova objetiva',
  prova_discursiva: 'Prova discursiva',
  avaliacao_curricular: 'Avaliação curricular',
  redacao: 'Redação',
  taf: 'TAF',
  avaliacao_psicologica: 'Avaliação psicológica',
  investigacao_social: 'Investigação social',
  exames_medicos: 'Exames médicos',
  toxicologico: 'Exame toxicológico',
  heteroidentificacao: 'Heteroidentificação',
  curso_formacao: 'Curso de formação',
};

const VEST_MODALITY_LABEL = { presencial: 'Presencial', ead: 'EAD', hibrido: 'Híbrido', multiplo: 'Presencial e EAD' };
const VEST_INSTITUTION_TYPE_LABEL = { publica: 'Pública', privada: 'Privada', programa_governo: 'Programa do governo' };

const fmtDateBR = (v) => {
  if (!v) return null;
  const [y, m, d] = String(v).split('-');
  return y && m && d ? `${d}/${m}/${y}` : String(v);
};

// Roteador: ENEM e vestibular têm layout próprio; concurso segue o corpo completo.
export default function ConcursoDetalhe(props) {
  if (props?.contest?.tipo === 'enem') return <EnemDetalhe {...props} />;
  if (props?.contest?.tipo === 'vestibular') return <VestibularDetalhe {...props} />;
  return <ConcursoDetalheBody {...props} />;
}

// ─── ENEM: cor e nome curto por área de conhecimento ────────────────────────
const ENEM_AREA_TINT = {
  'Linguagens, Códigos e suas Tecnologias': '#1e3a5f',
  'Ciências Humanas e suas Tecnologias': '#7c4a1e',
  'Ciências da Natureza e suas Tecnologias': '#1e4d35',
  'Matemática e suas Tecnologias': '#3d1e5c',
  'Redação': '#7a1e2e',
};
const ENEM_AREA_SHORTNAME = {
  'Linguagens, Códigos e suas Tecnologias': 'Linguagens',
  'Ciências Humanas e suas Tecnologias': 'Ciências Humanas',
  'Ciências da Natureza e suas Tecnologias': 'Ciências da Natureza',
  'Matemática e suas Tecnologias': 'Matemática',
  'Redação': 'Redação',
};

const EIXOS_COGNITIVOS = [
  { num: 'I',   titulo: 'Dominar linguagens',          desc: 'Usar a norma culta da Língua Portuguesa e compreender linguagens matemática, artística, científica e estrangeira.' },
  { num: 'II',  titulo: 'Compreender fenômenos',       desc: 'Aplicar conceitos de diferentes áreas para entender fenômenos naturais, históricos, geográficos, tecnológicos e artísticos.' },
  { num: 'III', titulo: 'Enfrentar situações-problema', desc: 'Selecionar, organizar e interpretar dados para resolver situações-problema do cotidiano.' },
  { num: 'IV',  titulo: 'Construir argumentação',      desc: 'Relacionar informações e conhecimentos para defender uma posição de forma consistente e fundamentada.' },
  { num: 'V',   titulo: 'Elaborar propostas',          desc: 'Usar conhecimentos escolares para propor intervenções na realidade, respeitando valores humanos e diversidade sociocultural.' },
];

const COMPETENCIAS_REDACAO = [
  { num: 'I',   pts: 200, titulo: 'Modalidade escrita formal',   desc: 'Domínio da norma culta da Língua Portuguesa.' },
  { num: 'II',  pts: 200, titulo: 'Proposta e gênero textual',   desc: 'Compreensão da proposta e desenvolvimento do tema no texto dissertativo-argumentativo.' },
  { num: 'III', pts: 200, titulo: 'Seleção de argumentos',       desc: 'Seleção, organização e interpretação de informações, fatos, opiniões e argumentos.' },
  { num: 'IV',  pts: 200, titulo: 'Mecanismos linguísticos',     desc: 'Uso de recursos coesivos para construir a argumentação.' },
  { num: 'V',   pts: 200, titulo: 'Proposta de intervenção',     desc: 'Proposta de intervenção que respeite os direitos humanos.' },
];

// Conteúdo programático oficial do ENEM (exame nacional fixo). Fonte da verdade
// para "o que cai por matéria" — cada matéria abre seu resumo + tópicos.
const ENEM_MATERIAS = [
  // ─── 1º DIA ───────────────────────────────────────────────────────────
  {
    dia: '1', area: 'Linguagens, Códigos e suas Tecnologias', nome: 'Língua Portuguesa',
    resumo: 'Interpretação, leitura crítica e análise de textos de diferentes gêneros.',
    topicos: ['Interpretação de textos', 'Compreensão de gêneros textuais', 'Sequências discursivas', 'Modos de organização textual', 'Texto verbal, não verbal e multimodal', 'Relação entre texto, contexto e finalidade', 'Função social dos textos', 'Funções da linguagem', 'Argumentação', 'Estratégias de convencimento', 'Identificação de tese e ponto de vista', 'Coesão e coerência', 'Progressão textual', 'Relações lógico-semânticas', 'Recursos expressivos da língua', 'Norma-padrão da Língua Portuguesa', 'Variação linguística', 'Variedades sociais, regionais e de registro', 'Linguagem formal e informal', 'Seleção lexical', 'Tempos e modos verbais', 'Elementos de referência pessoal, temporal e espacial', 'Gêneros digitais', 'Linguagem da internet', 'Comunicação em meios digitais', 'Impacto social das tecnologias da informação e comunicação'],
  },
  {
    dia: '1', area: 'Linguagens, Códigos e suas Tecnologias', nome: 'Literatura',
    resumo: 'Análise do texto literário, relação entre literatura e sociedade e contexto histórico e cultural das obras.',
    topicos: ['Texto literário', 'Gêneros literários: narrativo, lírico e dramático', 'Literatura brasileira', 'Formação da literatura nacional', 'Patrimônio literário nacional', 'Relação entre literatura e sociedade', 'Relação entre literatura, história e cultura', 'Contexto histórico, social e político das obras', 'Processos de construção do texto literário', 'Recursos expressivos e estruturais do texto literário', 'Valores sociais e humanos na literatura', 'Relação entre literatura e outras artes', 'Continuidade e ruptura entre períodos literários', 'Concepções artísticas', 'Recepção e interpretação de textos literários'],
  },
  {
    dia: '1', area: 'Linguagens, Códigos e suas Tecnologias', nome: 'Língua Estrangeira — Inglês ou Espanhol',
    resumo: 'O aluno escolhe Inglês ou Espanhol na inscrição. A prova cobra principalmente leitura e interpretação.',
    topicos: ['Interpretação de textos em língua estrangeira', 'Vocabulário em contexto', 'Expressões idiomáticas', 'Tema central do texto', 'Função social do texto', 'Estruturas linguísticas em uso', 'Relação entre linguagem, cultura e sociedade', 'Diversidade cultural e linguística', 'Produção cultural em língua estrangeira', 'Língua estrangeira como acesso à informação, tecnologia e cultura'],
  },
  {
    dia: '1', area: 'Linguagens, Códigos e suas Tecnologias', nome: 'Artes',
    resumo: 'Arte como linguagem, cultura, identidade e manifestação social.',
    topicos: ['Artes visuais', 'Teatro', 'Música', 'Dança', 'Produção artística', 'Recepção de textos artísticos', 'Interpretação de obras de arte', 'Contexto histórico e cultural da obra', 'Contexto da comunidade na produção artística', 'Elementos estruturais das linguagens artísticas', 'Diversidade artística', 'Multiculturalidade', 'Arte e identidade', 'Arte e cidadania', 'Padrões de beleza e preconceitos', 'Produções artísticas de grupos sociais e étnicos', 'Inclusão e valorização da pluralidade nas artes'],
  },
  {
    dia: '1', area: 'Linguagens, Códigos e suas Tecnologias', nome: 'Educação Física',
    resumo: 'Linguagem corporal, práticas corporais e relação entre corpo, cultura, saúde e sociedade.',
    topicos: ['Linguagem corporal', 'Corpo como expressão cultural', 'Corpo e identidade', 'Práticas corporais', 'Esporte', 'Dança', 'Lutas', 'Jogos', 'Brincadeiras', 'Exercício físico e saúde', 'Lazer crítico e emancipado', 'Performance corporal', 'Identidades juvenis', 'Mitos e verdades sobre o corpo masculino e feminino', 'Condicionamento físico', 'Esforço físico', 'Autonomia nas práticas corporais', 'Corpo e expressão artística', 'Corpo como produção da cultura'],
  },
  {
    dia: '1', area: 'Linguagens, Códigos e suas Tecnologias', nome: 'Tecnologias da Informação e Comunicação',
    resumo: 'Uso social das tecnologias, gêneros digitais e comunicação contemporânea.',
    topicos: ['Tecnologias da comunicação', 'Tecnologias da informação', 'Função social das tecnologias', 'Impacto social das novas tecnologias', 'Sistemas de comunicação', 'Gêneros digitais', 'Suportes digitais de texto', 'Comunicação tecnológica', 'Caracterização dos interlocutores em ambientes digitais', 'Recursos linguísticos em textos digitais', 'Texto literário em gêneros digitais', 'Relação entre tecnologia, conhecimento e sociedade'],
  },
  {
    dia: '1', area: 'Ciências Humanas e suas Tecnologias', nome: 'História',
    resumo: 'Análise histórica de sociedades, conflitos, movimentos sociais, política, cultura e formação do Brasil.',
    topicos: ['Cultura material e imaterial', 'Patrimônio cultural', 'Diversidade cultural no Brasil', 'História dos povos indígenas', 'Formação sociocultural brasileira', 'História dos povos africanos', 'Escravidão indígena e africana na América', 'Resistências indígenas e africanas', 'Negro na formação da sociedade brasileira', 'Conquista da América', 'América colonial', 'Conflitos entre europeus e indígenas', 'Brasil Colônia', 'Economia açucareira', 'Mineração no período colonial', 'Independência das colônias americanas', 'Brasil Império', 'Grupos sociais em conflito no Brasil imperial', 'Construção da nação brasileira', 'Revoluções sociais e políticas na Europa Moderna', 'Revolução Industrial', 'Imperialismo', 'Ocupação da Ásia e da África', 'Primeira Guerra Mundial', 'Segunda Guerra Mundial', 'Guerra Fria', 'Revolução Bolchevique', 'Revolução Chinesa', 'Revolução Cubana', 'Totalitarismos', 'Nazifascismo', 'Franquismo', 'Salazarismo', 'Stalinismo', 'Estado Novo no Brasil', 'Ditaduras na América Latina', 'Conflitos pós-Guerra Fria', 'Nova ordem mundial', 'Organismos multilaterais', 'Movimentos culturais no mundo ocidental', 'Direitos civis, políticos, sociais e humanos', 'Direitos sociais nas constituições brasileiras', 'Políticas afirmativas'],
  },
  {
    dia: '1', area: 'Ciências Humanas e suas Tecnologias', nome: 'Geografia',
    resumo: 'Espaço geográfico, cartografia, sociedade, natureza, economia, urbanização e impactos ambientais.',
    topicos: ['Formação territorial brasileira', 'Regiões brasileiras', 'Políticas de reordenamento territorial', 'Cartografia', 'Projeções cartográficas', 'Mapas temáticos', 'Mapas físicos', 'Mapas políticos', 'Tecnologias aplicadas à cartografia', 'Relações de poder entre nações', 'Geopolítica', 'Fluxos populacionais', 'Migração', 'Imigração', 'Emigração', 'Urbanização', 'Redes urbanas', 'Hierarquia urbana', 'Pobreza urbana', 'Segregação espacial', 'Industrialização brasileira', 'Globalização', 'Novas tecnologias de telecomunicação', 'Produção do espaço rural', 'Produção do espaço urbano', 'Modernização da agricultura', 'Estruturas agrárias tradicionais', 'Agronegócio', 'Agricultura familiar', 'Trabalhadores assalariados do campo', 'Lutas sociais no campo', 'Relação campo-cidade', 'Relação sociedade-natureza', 'Apropriação dos recursos naturais', 'Recursos minerais', 'Recursos energéticos', 'Recursos hídricos', 'Bacias hidrográficas', 'Impactos ambientais', 'Mudanças climáticas', 'Ilhas de calor', 'Efeito estufa', 'Chuva ácida', 'Destruição da camada de ozônio', 'Sustentabilidade', 'Políticas ambientais', 'Unidades de conservação', 'Corredores ecológicos', 'Zoneamento ecológico-econômico', 'Estrutura interna da Terra', 'Solos', 'Relevo', 'Agentes internos e externos do relevo', 'Atmosfera', 'Climas do Brasil', 'Vegetação do Brasil e do mundo'],
  },
  {
    dia: '1', area: 'Ciências Humanas e suas Tecnologias', nome: 'Filosofia',
    resumo: 'Reflexão sobre ética, política, cidadania, democracia e fundamentos da vida em sociedade.',
    topicos: ['Ética', 'Valores sociais', 'Cidadania', 'Democracia', 'Democracia na Antiguidade', 'Democracia direta', 'Democracia indireta', 'Democracia representativa', 'Estado e direitos do cidadão', 'Direitos humanos', 'Justiça', 'Participação política', 'Fundamentos da cidadania', 'Pensamento político', 'Pensamento liberal', 'Críticas ao capitalismo', 'Relação entre indivíduo e sociedade', 'Valores éticos na organização política', 'Inclusão social', 'Argumentos sobre problemas sociais, políticos e culturais'],
  },
  {
    dia: '1', area: 'Ciências Humanas e suas Tecnologias', nome: 'Sociologia',
    resumo: 'Sociedade, movimentos sociais, trabalho, desigualdade, cultura, Estado e transformações sociais.',
    topicos: ['Organização social', 'Instituições sociais', 'Movimentos sociais', 'Ação do Estado', 'Desigualdade social', 'Inclusão social', 'Políticas afirmativas', 'Cidadania e direitos sociais', 'Conflitos sociais', 'Cultura e identidade', 'Diversidade cultural', 'Relações de poder', 'Meios de comunicação e vida social', 'Trabalho e sociedade', 'Transformações no mundo do trabalho', 'Fordismo', 'Toyotismo', 'Novas técnicas de produção', 'Tecnologia e vida social', 'Globalização', 'Capitalismo', 'Socialismo', 'Feudalismo', 'Escravismo', 'Vida urbana', 'Pobreza', 'Segregação espacial', 'Relação campo-cidade', 'Lutas sociais no campo', 'Participação coletiva na transformação da realidade'],
  },
  {
    dia: '1', area: 'Redação', nome: 'Redação', tipo: 'redacao',
    resumo: 'Produção de texto dissertativo-argumentativo em Língua Portuguesa, avaliado por 5 competências (0 a 1.000 pontos).',
    topicos: ['Texto dissertativo-argumentativo', 'Compreensão da proposta de redação', 'Desenvolvimento do tema', 'Defesa de ponto de vista', 'Tese', 'Argumentação', 'Repertório sociocultural', 'Organização de ideias', 'Projeto de texto', 'Coesão textual', 'Conectivos', 'Norma-padrão da Língua Portuguesa', 'Clareza e progressão argumentativa', 'Proposta de intervenção', 'Agente da intervenção', 'Ação proposta', 'Meio ou modo de execução', 'Finalidade da intervenção', 'Detalhamento da proposta', 'Respeito aos direitos humanos', 'Problemas sociais, culturais, científicos ou políticos'],
  },
  // ─── 2º DIA ───────────────────────────────────────────────────────────
  {
    dia: '2', area: 'Matemática e suas Tecnologias', nome: 'Matemática',
    resumo: 'Resolução de problemas com números, geometria, álgebra, estatística, probabilidade, gráficos e funções.',
    topicos: ['Números naturais', 'Números inteiros', 'Números racionais', 'Números reais', 'Operações com conjuntos numéricos', 'Desigualdades', 'Divisibilidade', 'Fatoração', 'Razões e proporções', 'Porcentagem', 'Juros simples', 'Juros compostos', 'Relações de dependência entre grandezas', 'Sequências', 'Progressões', 'Progressão aritmética', 'Progressão geométrica', 'Princípios de contagem', 'Figuras geométricas planas', 'Figuras geométricas espaciais', 'Grandezas e medidas', 'Unidades de medida', 'Escalas', 'Comprimentos', 'Áreas', 'Volumes', 'Ângulos', 'Posição de retas', 'Simetrias', 'Congruência de triângulos', 'Semelhança de triângulos', 'Teorema de Tales', 'Relações métricas no triângulo', 'Circunferência', 'Trigonometria do ângulo agudo', 'Representação e análise de dados', 'Tabelas', 'Gráficos', 'Medidas de tendência central', 'Média', 'Moda', 'Mediana', 'Desvios', 'Variância', 'Probabilidade', 'Funções', 'Gráficos de funções', 'Função do 1º grau', 'Função do 2º grau', 'Funções polinomiais', 'Funções racionais', 'Funções exponenciais', 'Funções logarítmicas', 'Equações', 'Inequações', 'Ciclo trigonométrico', 'Funções trigonométricas', 'Plano cartesiano', 'Retas', 'Circunferências', 'Paralelismo', 'Perpendicularidade', 'Sistemas de equações'],
  },
  {
    dia: '2', area: 'Ciências da Natureza e suas Tecnologias', nome: 'Física',
    resumo: 'Interpretação de fenômenos físicos, mecânica, energia, eletricidade, magnetismo, ondas, óptica e termologia.',
    topicos: ['Ordem de grandeza', 'Notação científica', 'Sistema Internacional de Unidades', 'Grandezas físicas', 'Grandezas escalares', 'Grandezas vetoriais', 'Operações com vetores', 'Gráficos', 'Movimento', 'Repouso', 'Referencial', 'Velocidade', 'Aceleração', 'Força e movimento', 'Leis de Newton', 'Inércia', 'Massa', 'Quantidade de movimento', 'Impulso', 'Conservação da quantidade de movimento', 'Centro de massa', 'Torque', 'Equilíbrio estático', 'Força peso', 'Força normal', 'Força de atrito', 'Tração', 'Movimento circular', 'Força centrípeta', 'Hidrostática', 'Pressão', 'Empuxo', 'Princípio de Pascal', 'Princípio de Arquimedes', 'Princípio de Stevin', 'Trabalho', 'Energia', 'Potência', 'Energia cinética', 'Energia potencial', 'Conservação da energia mecânica', 'Dissipação de energia', 'Gravitação universal', 'Leis de Kepler', 'Origem e evolução do universo', 'Carga elétrica', 'Corrente elétrica', 'Lei de Coulomb', 'Campo elétrico', 'Potencial elétrico', 'Capacitores', 'Efeito Joule', 'Lei de Ohm', 'Resistência elétrica', 'Tensão elétrica', 'Potência elétrica', 'Circuitos elétricos', 'Corrente contínua', 'Corrente alternada', 'Campo magnético', 'Ímãs', 'Campo magnético terrestre', 'Ondas', 'Oscilações', 'Frequência', 'Período', 'Comprimento de onda', 'Propagação de ondas', 'Reflexão', 'Refração', 'Óptica geométrica', 'Lentes', 'Espelhos', 'Formação de imagens', 'Instrumentos ópticos', 'Calor', 'Temperatura', 'Escalas termométricas', 'Transferência de calor', 'Equilíbrio térmico', 'Calor específico', 'Dilatação térmica', 'Mudanças de estado físico', 'Calor latente', 'Gases ideais', 'Máquinas térmicas', 'Ciclo de Carnot', 'Leis da Termodinâmica'],
  },
  {
    dia: '2', area: 'Ciências da Natureza e suas Tecnologias', nome: 'Química',
    resumo: 'Matéria, transformações químicas, atomística, tabela periódica, ligações, soluções, termoquímica, equilíbrio, orgânica, eletroquímica e química ambiental.',
    topicos: ['Transformações químicas', 'Evidências de reações químicas', 'Sistemas gasosos', 'Lei dos gases', 'Equação geral dos gases ideais', 'Princípio de Avogadro', 'Conceito de molécula', 'Massa molar', 'Volume molar dos gases', 'Teoria cinética dos gases', 'Misturas gasosas', 'Modelo corpuscular da matéria', 'Modelo atômico de Dalton', 'Modelo atômico de Thomson', 'Modelo atômico de Rutherford', 'Modelo atômico de Rutherford-Bohr', 'Estrutura do átomo', 'Número atômico', 'Número de massa', 'Isótopos', 'Massa atômica', 'Elementos químicos', 'Tabela periódica', 'Reações químicas', 'Fórmulas químicas', 'Balanceamento de equações', 'Leis ponderais', 'Grandezas químicas', 'Mol', 'Constante de Avogadro', 'Cálculos estequiométricos', 'Propriedades dos materiais', 'Estados físicos da matéria', 'Mudanças de estado físico', 'Misturas', 'Métodos de separação de misturas', 'Substâncias químicas', 'Metais', 'Ligas metálicas', 'Ligação metálica', 'Ligação iônica', 'Substâncias iônicas', 'Ligação covalente', 'Substâncias moleculares', 'Polaridade de moléculas', 'Forças intermoleculares', 'Água', 'Soluções verdadeiras', 'Soluções coloidais', 'Suspensões', 'Solubilidade', 'Concentração das soluções', 'Propriedades coligativas', 'Ácidos', 'Bases', 'Sais', 'Óxidos', 'Indicadores ácido-base', 'Reação de neutralização', 'Termoquímica', 'Calor de reação', 'Entalpia', 'Equações termoquímicas', 'Lei de Hess', 'Oxirredução', 'Potenciais de redução', 'Pilhas', 'Eletrólise', 'Leis de Faraday', 'Radioatividade', 'Fissão nuclear', 'Fusão nuclear', 'Radioisótopos', 'Cinética química', 'Velocidade de reação', 'Energia de ativação', 'Catalisador', 'Equilíbrio químico', 'Constante de equilíbrio', 'Equilíbrio ácido-base', 'pH', 'Hidrólise', 'Química orgânica', 'Compostos de carbono', 'Funções orgânicas', 'Hidrocarbonetos', 'Compostos orgânicos oxigenados', 'Compostos orgânicos nitrogenados', 'Fermentação', 'Polímeros', 'Plásticos', 'Óleos e gorduras', 'Sabões e detergentes', 'Proteínas e enzimas', 'Química no cotidiano', 'Química ambiental', 'Indústria química', 'Poluição da água', 'Tratamento de água', 'Poluição atmosférica', 'Petróleo', 'Gás natural', 'Biocombustíveis', 'Energia nuclear'],
  },
  {
    dia: '2', area: 'Ciências da Natureza e suas Tecnologias', nome: 'Biologia',
    resumo: 'Citologia, genética, biotecnologia, evolução, ecologia, fisiologia, saúde e meio ambiente.',
    topicos: ['Moléculas', 'Células', 'Tecidos', 'Membrana plasmática', 'Citoplasma', 'Núcleo', 'Divisão celular', 'Metabolismo celular', 'Fotossíntese', 'Respiração celular', 'Informação genética', 'Síntese proteica', 'Diferenciação celular', 'Tecidos animais', 'Tecidos vegetais', 'Origem e evolução das células', 'Células-tronco', 'Clonagem', 'DNA recombinante', 'Biotecnologia', 'Biotecnologia na produção de alimentos', 'Biotecnologia na produção de fármacos', 'Identificação genética', 'Teste de paternidade', 'Ética na biotecnologia', 'Hereditariedade', 'Transmissão de características hereditárias', 'Genética mendeliana', 'Antígenos', 'Anticorpos', 'Grupos sanguíneos', 'Transplantes', 'Doenças autoimunes', 'Mutações gênicas', 'Mutações cromossômicas', 'Aconselhamento genético', 'Fundamentos genéticos da evolução', 'Diversidade biológica', 'Níveis de organização dos seres vivos', 'Vírus', 'Procariontes', 'Eucariontes', 'Autótrofos', 'Heterótrofos', 'Sistemática', 'Ciclos de vida', 'Evolução dos seres vivos', 'Anatomia humana', 'Fisiologia humana', 'Embriologia', 'Evolução humana', 'Ecologia', 'Ecossistemas', 'Fatores bióticos', 'Fatores abióticos', 'Habitat', 'Nicho ecológico', 'Teia alimentar', 'Sucessão ecológica', 'Dinâmica de populações', 'Relações ecológicas', 'Ciclos biogeoquímicos', 'Fluxo de energia', 'Biomas brasileiros', 'Uso de recursos naturais', 'Mudanças climáticas', 'Efeito estufa', 'Desmatamento', 'Poluição da água', 'Poluição do solo', 'Poluição do ar', 'Conservação de ecossistemas', 'Biodiversidade', 'Saneamento básico', 'Legislação ambiental', 'Origem da vida', 'Teorias da evolução', 'Darwinismo', 'Teoria sintética da evolução', 'Qualidade de vida', 'IDH', 'Doenças que afetam a população brasileira', 'Prevenção e profilaxia', 'Primeiros socorros', 'Infecções sexualmente transmissíveis', 'Uso indevido de drogas', 'Exercício físico e vida saudável', 'Desenvolvimento sustentável'],
  },
];

export function EnemDetalhe({
  contest,
  onBack,
  onImport,
  onToggleFavorite,
  onToggleInterested,
  onSetTargetContest,
  importingId = '',
  limiteAtingido = false,
  cursos = [],
  isAdmin = false,
  isFavorite = false,
  isInterested = false,
  isTargetContest = false,
  onEditContest,
  embedded = false,
}) {
  const [expanded, setExpanded] = useState({});
  const [diaProg, setDiaProg] = useState('1');
  const meta = contest?.meta && typeof contest.meta === 'object' ? contest.meta : {};
  const added = cursos.some((c) => c.tipo === 'enem' || (c.nome || '').toLowerCase().includes('enem'));
  const importing = importingId === contest?.id;

  const insStart = fmtDateBR(contest?.registration_start);
  const insEnd = fmtDateBR(contest?.registration_end);
  const inscricaoPeriodo = insStart || insEnd ? `${insStart || '—'} até ${insEnd || 'em aberto'}` : null;
  const dia2 = fmtDateBR(meta.prova_data_dia2 || meta.prova_data2 || contest?.prova_data_dia2);
  const dia1Fmt = fmtDateBR(contest?.prova_data);

  const hojeISO = new Date().toISOString().slice(0, 10);
  const isPast = (iso) => iso && String(iso).slice(0, 10) < hojeISO;
  const dia2Raw = meta.prova_data_dia2 || meta.prova_data2 || contest?.prova_data_dia2;
  const datas = [
    contest?.registration_start ? { evento: 'Abertura das inscrições', raw: contest.registration_start, data: fmtDateBR(contest.registration_start), dot: '#f4d04e' } : null,
    contest?.registration_end ? { evento: 'Encerramento das inscrições', raw: contest.registration_end, data: fmtDateBR(contest.registration_end), dot: 'rgba(243,239,229,0.35)' } : null,
    meta.taxa_pagamento_ate ? { evento: 'Pagamento da taxa', raw: meta.taxa_pagamento_ate, data: fmtDateBR(meta.taxa_pagamento_ate), dot: 'rgba(243,239,229,0.35)' } : null,
    contest?.prova_data ? { evento: '1º dia de prova', raw: contest.prova_data, data: fmtDateBR(contest.prova_data), dot: '#f4d04e' } : null,
    dia2Raw ? { evento: '2º dia de prova', raw: dia2Raw, data: fmtDateBR(dia2Raw), dot: '#f4d04e' } : null,
  ].filter(Boolean).map((d) => ({ ...d, past: isPast(d.raw) }));

  const statusLabel = contest?.status_concurso
    ? (STATUS_LABELS[normalizeContestStatus(contest.status_concurso)] || 'Previsto')
    : 'Previsto';

  const statusDot = normalizeContestStatus(contest?.status_concurso);
  const isEncerrado = statusDot === 'inscricoes_encerradas';

  return (
    <div className="pl-paper-bg" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 20px 48px' }}>

      {/* Voltar + admin */}
      {!embedded && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button type="button" onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px 7px 10px', borderRadius: 8, border: '1px solid rgba(20,17,13,0.14)', background: '#fff', color: '#3a342c', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <ArrowLeft size={15} />
            Voltar
          </button>
          {isAdmin && (
            <button type="button" onClick={() => onEditContest?.(contest)}
              className="pl-btn pl-btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--pl-warn-soft)', border: '1px solid var(--pl-warn)', color: 'var(--pl-warn)' }}>
              <Pencil size={14} /> Admin: editar
            </button>
          )}
        </div>
      )}

      {/* ─── Hero navy ─────────────────────────────────────────────────── */}
      <div style={{ borderRadius: 18, overflow: 'hidden', background: '#1e3a5f', boxShadow: '0 12px 40px rgba(30,58,95,0.32)' }}>
        {/* Eyebrow */}
        <div style={{ padding: '18px 28px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(243,239,229,0.4)' }}>Exame Nacional</span>
          <span style={{ color: 'rgba(243,239,229,0.2)' }}>&middot;</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(243,239,229,0.4)' }}>INEP / MEC</span>
          {meta.edital_numero && (
            <>
              <span style={{ color: 'rgba(243,239,229,0.2)' }}>&middot;</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(243,239,229,0.4)' }}>{meta.edital_numero}</span>
            </>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '18px 28px 28px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 24 }}>
          {/* Wordmark + badges */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <span style={{ fontFamily: 'var(--pl-sans)', fontSize: 56, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.055em', lineHeight: 1, display: 'block', marginBottom: 12 }}>enem</span>
            <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 500, color: 'rgba(243,239,229,0.62)', lineHeight: 1.5 }}>
              Acesso ao ensino superior via SiSU, ProUni e Fies
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 999, border: `1px solid ${isEncerrado ? 'rgba(243,239,229,0.25)' : 'rgba(244,208,78,0.4)'}`, background: isEncerrado ? 'rgba(243,239,229,0.07)' : 'rgba(244,208,78,0.12)', padding: '4px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: isEncerrado ? 'rgba(243,239,229,0.45)' : '#f4d04e' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isEncerrado ? 'rgba(243,239,229,0.4)' : '#f4d04e', display: 'inline-block' }} />
                {statusLabel}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, border: '1px solid rgba(243,239,229,0.15)', background: 'rgba(243,239,229,0.07)', padding: '4px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(243,239,229,0.5)' }}>
                {contest?.escolaridade || 'Ensino médio completo'}
              </span>
              {meta.total_questoes && (
                <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, border: '1px solid rgba(243,239,229,0.15)', background: 'rgba(243,239,229,0.07)', padding: '4px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(243,239,229,0.5)' }}>
                  {meta.total_questoes} questões
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: 'center', flexShrink: 0 }}>
            <button type="button"
              onClick={() => onImport?.(contest)}
              disabled={importing || limiteAtingido || added}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 10, background: '#f3efe5', color: '#1e3a5f', border: 'none', padding: '11px 20px', fontSize: 13, fontWeight: 700, boxShadow: '0 2px 10px rgba(0,0,0,0.18)', cursor: importing || limiteAtingido || added ? 'not-allowed' : 'pointer', opacity: importing || limiteAtingido || added ? 0.6 : 1, whiteSpace: 'nowrap' }}>
              {added ? 'Já no painel' : limiteAtingido ? 'Limite atingido' : importing ? 'Adicionando...' : 'Adicionar aos estudos'}
              {!added && !limiteAtingido && <ArrowRight size={14} />}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              {onToggleFavorite && (
                <button type="button" onClick={() => onToggleFavorite(contest.id)}
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, border: isFavorite ? '1px solid rgba(250,100,100,0.35)' : '1px solid rgba(243,239,229,0.18)', background: isFavorite ? 'rgba(250,100,100,0.18)' : 'rgba(243,239,229,0.07)', padding: '7px 12px', fontSize: 12, fontWeight: 600, color: isFavorite ? '#ffb3b3' : 'rgba(243,239,229,0.75)', cursor: 'pointer' }}>
                  <Heart size={13} style={{ fill: isFavorite ? 'currentColor' : 'none' }} />
                  {isFavorite ? 'Favoritado' : 'Favoritar'}
                </button>
              )}
              {contest?.edital_url && (
                <button type="button" onClick={() => window.open(contest.edital_url, '_blank', 'noopener,noreferrer')}
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, border: '1px solid rgba(243,239,229,0.18)', background: 'rgba(243,239,229,0.07)', padding: '7px 12px', fontSize: 12, fontWeight: 600, color: 'rgba(243,239,229,0.75)', cursor: 'pointer' }}>
                  <ExternalLink size={13} />
                  Edital
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Fact strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', borderTop: '1px solid rgba(243,239,229,0.1)', background: 'rgba(0,0,0,0.18)' }}>
          {[
            inscricaoPeriodo && { label: 'Inscrições', value: inscricaoPeriodo },
            { label: 'Taxa', value: contest?.inscricao_valor || 'A definir' },
            dia1Fmt && { label: '1º dia', value: dia1Fmt },
            dia2 && { label: '2º dia', value: dia2 },
            meta.duracao_dia1 && { label: 'Duração — dia 1', value: meta.duracao_dia1 },
            meta.duracao_dia2 && { label: 'Duração — dia 2', value: meta.duracao_dia2 },
          ].filter(Boolean).map((f, i, arr) => (
            <div key={f.label} style={{ padding: '13px 18px', borderRight: i < arr.length - 1 ? '1px solid rgba(243,239,229,0.07)' : 'none' }}>
              <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(243,239,229,0.38)' }}>{f.label}</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#f3efe5', lineHeight: 1.2 }}>{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Sobre o exame ─────────────────────────────────────────────── */}
      {contest?.descricao && (
        <div style={{ borderRadius: 14, background: '#fff', border: '1px solid rgba(20,17,13,0.09)', padding: '24px 28px', boxShadow: '0 1px 4px rgba(20,17,13,0.04)' }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, letterSpacing: '.24em', textTransform: 'uppercase', color: '#847b6c' }}>Sobre o exame</p>
          <h2 style={{ margin: '0 0 14px', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300, fontSize: 26, color: '#14110d', lineHeight: 1.15 }}>O principal exame do Brasil</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: '#3a342c', fontWeight: 500 }}>{contest.descricao}</p>
        </div>
      )}

      {/* ─── Estrutura da prova — dois dias ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {/* Dia 1 */}
        <div style={{ borderRadius: 14, overflow: 'hidden', background: '#1e3a5f', boxShadow: '0 4px 16px rgba(30,58,95,0.2)' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(243,239,229,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(243,239,229,0.45)' }}>1º Dia</p>
              {meta.duracao_dia1 && <span style={{ fontSize: 11, fontWeight: 700, color: '#f4d04e', background: 'rgba(244,208,78,0.12)', border: '1px solid rgba(244,208,78,0.3)', borderRadius: 6, padding: '2px 8px' }}>{meta.duracao_dia1}</span>}
            </div>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f3efe5', lineHeight: 1.1 }}>
              {dia1Fmt ? dia1Fmt : '8 de novembro de 2026'}
            </p>
          </div>
          <div style={{ padding: '14px 22px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { area: 'Linguagens, Códigos e suas Tecnologias', questoes: '45 questões' },
              { area: 'Ciências Humanas e suas Tecnologias', questoes: '45 questões' },
              { area: 'Redação', questoes: '1 texto' },
            ].map((item) => {
              const tint = ENEM_AREA_TINT[item.area] || '#f3efe5';
              const lightTint = item.area === 'Redação' ? '#f4d04e' : '#93b4ff';
              return (
                <div key={item.area} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: lightTint, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(243,239,229,0.8)', flex: 1 }}>{ENEM_AREA_SHORTNAME[item.area] || item.area}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(243,239,229,0.4)' }}>{item.questoes}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dia 2 — mesma base navy ENEM, diferenciado pelo acento amarelo */}
        <div style={{ borderRadius: 14, overflow: 'hidden', background: '#1e3a5f', boxShadow: '0 4px 16px rgba(30,58,95,0.2)' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(243,239,229,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(243,239,229,0.45)' }}>2º Dia</p>
              {meta.duracao_dia2 && <span style={{ fontSize: 11, fontWeight: 700, color: '#f4d04e', background: 'rgba(244,208,78,0.12)', border: '1px solid rgba(244,208,78,0.3)', borderRadius: 6, padding: '2px 8px' }}>{meta.duracao_dia2}</span>}
            </div>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f3efe5', lineHeight: 1.1 }}>
              {dia2 ? dia2 : '15 de novembro de 2026'}
            </p>
          </div>
          <div style={{ padding: '14px 22px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { area: 'Ciências da Natureza e suas Tecnologias', questoes: '45 questões' },
              { area: 'Matemática e suas Tecnologias', questoes: '45 questões' },
            ].map((item) => (
              <div key={item.area} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f4d04e', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(243,239,229,0.8)', flex: 1 }}>{ENEM_AREA_SHORTNAME[item.area] || item.area}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(243,239,229,0.4)' }}>{item.questoes}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Conteúdo programático — por dia ───────────────────────────── */}
      {(() => {
        const isDia1 = diaProg === '1';
        const materiasDia = ENEM_MATERIAS.filter((m) => m.dia === diaProg);
        const totalMat = ENEM_MATERIAS.length;
        const totalAreas = new Set(ENEM_MATERIAS.map((m) => m.area)).size;
        const accent = '#1e3a5f';
        const accentSoft = 'rgba(30,58,95,0.06)';
        return (
          <div style={{ borderRadius: 14, background: '#fff', border: '1px solid rgba(20,17,13,0.09)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(20,17,13,0.04)' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(20,17,13,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <div>
                  <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '.24em', textTransform: 'uppercase', color: '#847b6c' }}>Matriz de referência</p>
                  <h2 style={{ margin: 0, fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300, fontSize: 22, color: '#14110d', lineHeight: 1.1 }}>Conteúdo programático</h2>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#847b6c', border: '1px solid rgba(20,17,13,0.12)', borderRadius: 6, padding: '4px 10px' }}>
                  {totalAreas} áreas · {totalMat} matérias
                </span>
              </div>

              {/* Seletor de dia */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { id: '1', titulo: '1º Dia', data: dia1Fmt || '8 nov', dur: meta.duracao_dia1 || '5h30', areas: 'Linguagens · C. Humanas · Redação', tint: '#1e3a5f' },
                  { id: '2', titulo: '2º Dia', data: dia2 || '15 nov', dur: meta.duracao_dia2 || '5h', areas: 'C. da Natureza · Matemática', tint: '#1e3a5f' },
                ].map((d) => {
                  const active = diaProg === d.id;
                  return (
                    <button key={d.id} type="button" onClick={() => setDiaProg(d.id)}
                      style={{ textAlign: 'left', borderRadius: 12, border: active ? `1.5px solid ${d.tint}` : '1.5px solid rgba(20,17,13,0.1)', background: active ? d.tint : '#fff', padding: '12px 14px', cursor: 'pointer', transition: 'all .12s', boxShadow: active ? `0 4px 14px ${d.tint}33` : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ width: 20, height: 20, borderRadius: 6, background: active ? 'rgba(255,255,255,0.18)' : d.tint, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: active ? '#fff' : '#f3efe5', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{d.id}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: active ? '#fff' : '#14110d', letterSpacing: '.04em' }}>{d.titulo}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: active ? 'rgba(255,255,255,0.7)' : '#847b6c' }}>{d.data} · {d.dur}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: active ? 'rgba(255,255,255,0.75)' : '#847b6c', lineHeight: 1.3 }}>{d.areas}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Faixa do dia + matérias clicáveis */}
            <div>
              <div style={{ padding: '10px 24px', background: accentSoft, borderBottom: `1px solid ${accent}1a`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: accent, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                  {isDia1 ? 'Primeiro dia' : 'Segundo dia'} — {materiasDia.length} matérias
                </p>
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: '#a99f8d', fontStyle: 'italic' }}>toque para ver o que cai</span>
              </div>

              {materiasDia.map((m, idx) => {
                const tint = ENEM_AREA_TINT[m.area] || '#1e3a5f';
                const open = Boolean(expanded[m.nome]);
                const isLast = idx === materiasDia.length - 1;
                const isRedacao = m.tipo === 'redacao';
                return (
                  <div key={m.nome} style={{ borderBottom: isLast ? 'none' : '1px solid rgba(20,17,13,0.06)' }}>
                    <button type="button" onClick={() => setExpanded((p) => ({ ...p, [m.nome]: !p[m.nome] }))}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 24px', background: open ? `${tint}08` : 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', transition: 'background .1s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 4, background: tint, flexShrink: 0, display: 'inline-block' }} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#14110d', lineHeight: 1.25 }}>{m.nome}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#847b6c' }}>
                            {ENEM_AREA_SHORTNAME[m.area] || m.area} · {isRedacao ? '5 competências' : `${m.topicos.length} tópicos`}
                          </p>
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#847b6c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', display: 'block', flexShrink: 0 }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {open && (
                      <div style={{ padding: '0 24px 18px' }}>
                        <div style={{ paddingTop: 12, borderTop: `2px solid ${tint}22` }}>
                          {m.resumo && (
                            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#3a342c', lineHeight: 1.6, fontWeight: 500 }}>{m.resumo}</p>
                          )}

                          {isRedacao ? (
                            <div style={{ borderRadius: 10, border: '1px solid rgba(122,30,46,0.16)', overflow: 'hidden' }}>
                              <div style={{ padding: '10px 14px', background: 'rgba(122,30,46,0.05)', borderBottom: '1px solid rgba(122,30,46,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7a1e2e' }}>Avaliação por competência</p>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#7a1e2e' }}>0 – 1.000 pontos</span>
                              </div>
                              {COMPETENCIAS_REDACAO.map((comp, i) => (
                                <div key={comp.num} style={{ display: 'grid', gridTemplateColumns: '34px 1fr 56px', gap: 12, padding: '11px 14px', alignItems: 'center', borderTop: i > 0 ? '1px solid rgba(20,17,13,0.05)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(20,17,13,0.015)' }}>
                                  <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(122,30,46,0.08)', border: '1px solid rgba(122,30,46,0.18)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#7a1e2e', flexShrink: 0 }}>{comp.num}</span>
                                  <div>
                                    <p style={{ margin: '0 0 2px', fontSize: 12.5, fontWeight: 700, color: '#14110d' }}>{comp.titulo}</p>
                                    <p style={{ margin: 0, fontSize: 11.5, color: '#847b6c', lineHeight: 1.4 }}>{comp.desc}</p>
                                  </div>
                                  <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#7a1e2e', fontVariantNumeric: 'tabular-nums' }}>{comp.pts} pts</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                              {m.topicos.map((t) => (
                                <span key={t}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 7, border: `1px solid ${tint}30`, background: `${tint}0d`, fontSize: 12, fontWeight: 600, color: '#3a342c' }}>
                                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: tint, flexShrink: 0, display: 'inline-block' }} />
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ─── Eixos cognitivos ──────────────────────────────────────────── */}
      <div style={{ borderRadius: 14, background: '#fff', border: '1px solid rgba(20,17,13,0.09)', padding: '22px 24px 24px', boxShadow: '0 1px 4px rgba(20,17,13,0.04)' }}>
        <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, letterSpacing: '.24em', textTransform: 'uppercase', color: '#847b6c' }}>Avaliação interdisciplinar</p>
        <h2 style={{ margin: '0 0 18px', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300, fontSize: 22, color: '#14110d', lineHeight: 1.1 }}>Eixos cognitivos comuns</h2>
        <p style={{ margin: '0 0 18px', fontSize: 13.5, color: '#3a342c', lineHeight: 1.6, fontWeight: 500 }}>
          Além dos conteúdos de cada área, o ENEM avalia cinco eixos cognitivos presentes em todas as provas:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {EIXOS_COGNITIVOS.map((eixo) => (
            <div key={eixo.num} style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(30,58,95,0.12)', background: 'rgba(30,58,95,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: '#1e3a5f', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#f3efe5', flexShrink: 0 }}>
                  {eixo.num}
                </span>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e3a5f' }}>{eixo.titulo}</p>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#3a342c', lineHeight: 1.5 }}>{eixo.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Como o ENEM abre portas ───────────────────────────────────── */}
      <div style={{ borderRadius: 14, background: '#fff', border: '1px solid rgba(20,17,13,0.09)', padding: '22px 24px 24px', boxShadow: '0 1px 4px rgba(20,17,13,0.04)' }}>
        <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, letterSpacing: '.24em', textTransform: 'uppercase', color: '#847b6c' }}>Ingresso ao ensino superior</p>
        <h2 style={{ margin: '0 0 10px', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300, fontSize: 22, color: '#14110d' }}>Como o ENEM abre portas</h2>
        <p style={{ margin: '0 0 18px', fontSize: 13.5, lineHeight: 1.65, color: '#3a342c', fontWeight: 500 }}>
          A nota do ENEM é a principal porta de entrada ao ensino superior no Brasil, por três caminhos:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { sigla: 'SiSU', nome: 'Sistema Unificado de Seleção Unificada', descricao: 'Vagas em universidades públicas federais e estaduais com seleção inteiramente pela nota do ENEM.' },
            { sigla: 'ProU', nome: 'Programa Universidade para Todos', descricao: 'Bolsas integrais e parciais em faculdades privadas para candidatos de baixa renda.' },
            { sigla: 'Fies', nome: 'Financiamento Estudantil', descricao: 'Financiamento do governo federal para custear cursos em instituições privadas credenciadas.' },
          ].map((x) => (
            <div key={x.sigla} style={{ padding: '18px 20px', border: '1px solid rgba(30,58,95,0.12)', borderRadius: 12, background: 'rgba(30,58,95,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: '#1e3a5f', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#f3efe5', fontSize: 11, fontWeight: 800 }}>{x.sigla}</span>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#14110d', lineHeight: 1.2 }}>{x.nome}</p>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500, color: '#3a342c', lineHeight: 1.55 }}>{x.descricao}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Datas importantes ─────────────────────────────────────────── */}
      {datas.length > 0 && (
        <div style={{ borderRadius: 14, background: '#1e3a5f', padding: '22px 28px 26px', boxShadow: '0 4px 24px rgba(30,58,95,0.22)' }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(243,239,229,0.4)' }}>Calendário oficial 2026</p>
          <h2 style={{ margin: '0 0 20px', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300, fontSize: 22, color: '#f3efe5' }}>Datas importantes</h2>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {datas.map((dt, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '13px 0', borderBottom: i < datas.length - 1 ? '1px solid rgba(243,239,229,0.09)' : 'none', opacity: dt.past ? 0.55 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  {dt.past ? (
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(243,239,229,0.18)', border: '1px solid rgba(243,239,229,0.3)', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#f3efe5" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  ) : (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dt.dot, flexShrink: 0, display: 'inline-block' }} />
                  )}
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(243,239,229,0.8)', textDecoration: dt.past ? 'line-through' : 'none', textDecorationColor: 'rgba(243,239,229,0.4)' }}>{dt.evento}</span>
                  {dt.past && (
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(243,239,229,0.55)', border: '1px solid rgba(243,239,229,0.22)', borderRadius: 5, padding: '2px 7px', flexShrink: 0 }}>Encerrado</span>
                  )}
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f3efe5', whiteSpace: 'nowrap', textDecoration: dt.past ? 'line-through' : 'none', textDecorationColor: 'rgba(243,239,229,0.4)' }}>{dt.data}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VestSection({ title, children }) {
  return (
    <section className="pl-card" style={{ padding: 20 }}>
      <p className="pl-eyebrow" style={{ marginBottom: 12 }}>{title}</p>
      {children}
    </section>
  );
}

function VestibularDetalhe({
  contest,
  onBack,
  onImport,
  importingId = '',
  limiteAtingido = false,
  cursos = [],
}) {
  const [imageError, setImageError] = useState(false);

  // Carrega o conteúdo programático sob demanda (catálogo vem sem disciplinas).
  const [loadedDisc, setLoadedDisc] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setLoadedDisc(null);
    const id = contest?.id;
    const hasDisc = Array.isArray(contest?.disciplinas) && contest.disciplinas.length > 0;
    if (id && !hasDisc) {
      loadContestTemplateContent(supabase, id)
        .then((d) => { if (!cancelled && Array.isArray(d) && d.length > 0) setLoadedDisc(d); })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [contest?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const meta = contest?.meta && typeof contest.meta === 'object' ? contest.meta : {};
  const locality = contest?.scope === 'estadual' && contest?.uf ? String(contest.uf).toUpperCase() : 'Nacional';
  const modalityLabel = VEST_MODALITY_LABEL[contest?.modality] || null;
  const instLabel = VEST_INSTITUTION_TYPE_LABEL[contest?.institution_type] || null;
  const statusKey = normalizeContestStatus(contest?.status_concurso);
  const importing = importingId === contest?.id;
  const added = cursos.some((c) => c.plano === contest?.plano || c.nome === contest?.nome || c.concurso === contest?.concurso);

  const insStart = fmtDateBR(contest?.registration_start);
  const insEnd = fmtDateBR(contest?.registration_end);
  const inscricaoPeriodo = insStart || insEnd ? `${insStart || '—'} até ${insEnd || 'em aberto'}` : null;

  const effectiveDisc = (Array.isArray(contest?.disciplinas) && contest.disciplinas.length > 0)
    ? contest.disciplinas
    : (loadedDisc || []);
  const subjects = effectiveDisc.map((d) => (typeof d === 'string' ? d : d?.nome)).filter(Boolean);
  const subjectsSummary = Array.isArray(meta.subjects_summary) && meta.subjects_summary.length ? meta.subjects_summary : subjects;
  const timeline = Array.isArray(meta.timeline) ? meta.timeline.filter((t) => t && t.title) : [];
  const courses = Array.isArray(meta.courses_offered) ? meta.courses_offered.filter((c) => c && (c.name || typeof c === 'string')) : [];
  const readings = Array.isArray(meta.required_readings) ? meta.required_readings.filter(Boolean) : [];
  const entryMethods = Array.isArray(meta.entry_methods) ? meta.entry_methods.filter(Boolean) : [];
  const about = meta.about_institution || '';
  const site = meta.official_url || contest?.official_url || '';
  const regUrl = meta.registration_url || '';
  const editalUrl = contest?.edital_url || meta.edital_url || '';

  const facts = [
    { label: 'Data da prova', value: fmtDateBR(contest?.prova_data) || 'A definir' },
    inscricaoPeriodo ? { label: 'Inscrições', value: inscricaoPeriodo } : null,
    { label: 'Taxa', value: contest?.inscricao_valor || 'A definir' },
    contest?.escolaridade ? { label: 'Requisito', value: contest.escolaridade } : null,
    modalityLabel ? { label: 'Modalidade', value: modalityLabel } : null,
  ].filter(Boolean);

  const badges = [locality, instLabel, modalityLabel, STATUS_LABELS[statusKey] || 'Previsto'].filter(Boolean);

  return (
    <div className="pl-page" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <button type="button" onClick={onBack} className="pl-btn pl-btn-ghost pl-btn-sm" style={{ alignSelf: 'flex-start' }}>
        <ArrowLeft size={15} /> Voltar
      </button>

      {/* Cabeçalho */}
      <header className="pl-card" style={{ padding: 20, display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ width: 96, height: 96, borderRadius: 12, flexShrink: 0, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {contest?.imagem_url && !imageError
            ? <img src={storageThumb(contest.imagem_url, 160)} alt={contest.nome} onError={() => setImageError(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
            : <GraduationCap size={36} style={{ color: 'var(--pl-ink-4)' }} />}
        </div>
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{contest?.banca || 'Instituição'}</p>
          <h1 className="pl-display" style={{ fontSize: 32, margin: 0 }}>{contest?.nome}</h1>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {badges.map((b, i) => (
              <span key={`${b}-${i}`} className={`pl-tag ${i === 0 ? 'pl-tag-accent' : ''}`} style={{ textTransform: 'uppercase', fontSize: 10 }}>{b}</span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onImport?.(contest)}
          disabled={importing || limiteAtingido || added}
          className="pl-btn pl-btn-primary"
          style={{ alignSelf: 'center' }}
        >
          {added ? 'Já no painel' : importing ? 'Adicionando...' : limiteAtingido ? 'Limite atingido' : <>Adicionar ao painel <ArrowRight size={15} /></>}
        </button>
      </header>

      {/* Fatos-chave */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {facts.map((f) => (
          <div key={f.label} className="pl-card" style={{ padding: '12px 14px' }}>
            <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{f.label}</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)' }}>{f.value}</p>
          </div>
        ))}
      </div>

      {/* Como funciona */}
      {contest?.descricao && (
        <VestSection title="Como funciona">
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>{contest.descricao}</p>
        </VestSection>
      )}

      {/* Calendário */}
      {timeline.length > 0 && (
        <VestSection title="Calendário">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {timeline.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: i < timeline.length - 1 ? '1px solid var(--pl-rule)' : 'none' }}>
                <span style={{ fontSize: 13, color: 'var(--pl-ink-2)' }}>{t.title}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)', whiteSpace: 'nowrap' }}>{fmtDateBR(t.date) || 'a definir'}</span>
              </div>
            ))}
          </div>
        </VestSection>
      )}

      {/* Matérias cobradas */}
      {subjectsSummary.length > 0 && (
        <VestSection title="Matérias cobradas">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {subjectsSummary.map((s, i) => <span key={`${s}-${i}`} className="pl-tag">{s}</span>)}
          </div>
        </VestSection>
      )}

      {/* Leituras obrigatórias */}
      {readings.length > 0 && (
        <VestSection title="Leituras obrigatórias">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {readings.map((r, i) => <li key={i} style={{ fontSize: 13.5, color: 'var(--pl-ink-2)' }}>{r}</li>)}
          </ul>
        </VestSection>
      )}

      {/* Cursos oferecidos */}
      {courses.length > 0 && (
        <VestSection title="Cursos oferecidos">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {courses.map((c, i) => (
              <div key={i} style={{ padding: '8px 12px', border: '1px solid var(--pl-rule-2)', borderRadius: 6, background: 'var(--pl-surface-2)' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{c.name || c}</p>
                {(c.degree || c.modality) && (
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--pl-ink-3)' }}>{[c.degree, VEST_MODALITY_LABEL[c.modality] || c.modality].filter(Boolean).join(' · ')}</p>
                )}
              </div>
            ))}
          </div>
        </VestSection>
      )}

      {/* Formas de ingresso */}
      {entryMethods.length > 0 && (
        <VestSection title="Formas de ingresso">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {entryMethods.map((m, i) => <span key={`${m}-${i}`} className="pl-tag pl-tag-accent">{m}</span>)}
          </div>
        </VestSection>
      )}

      {/* Sobre a instituição */}
      {about && (
        <VestSection title="Sobre a instituição">
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>{about}</p>
        </VestSection>
      )}

      {/* Links oficiais */}
      {(site || regUrl || editalUrl) && (
        <VestSection title="Links oficiais">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {site && <a href={site} target="_blank" rel="noopener noreferrer" className="pl-btn pl-btn-ghost pl-btn-sm"><ExternalLink size={14} /> Site oficial</a>}
            {regUrl && <a href={regUrl} target="_blank" rel="noopener noreferrer" className="pl-btn pl-btn-ghost pl-btn-sm"><ExternalLink size={14} /> Inscrição</a>}
            {editalUrl && <a href={editalUrl} target="_blank" rel="noopener noreferrer" className="pl-btn pl-btn-ghost pl-btn-sm"><ExternalLink size={14} /> Edital</a>}
          </div>
        </VestSection>
      )}
    </div>
  );
}

function ConcursoDetalheBody({
  contest: rawContest,
  onBack,
  onImport,
  onToggleFavorite,
  onToggleInterested,
  onOpenDisciplinas,
  onOpenRelatedContest,
  contestTracker = {},
  onToggleContestTask,
  isTargetContest = false,
  onSetTargetContest,
  importingId = '',
  limiteAtingido = false,
  cursos = [],
  concursoCatalog = [],
  bancoDisciplinas = [],
  isAdmin = false,
  isFavorite = false,
  isInterested = false,
  onEditContest,
}) {
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [imageError, setImageError] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);

  // O catálogo carrega os concursos SEM disciplinas (sob demanda). Ao abrir o
  // detalhe, busca o conteúdo programático pelo id se ele não veio carregado —
  // senão a seção "Conteúdo programático" apareceria vazia mesmo havendo dados.
  const [loadedSubjects, setLoadedSubjects] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setLoadedSubjects(null);
    const id = rawContest?.id;
    const hasDisc = Array.isArray(rawContest?.disciplinas) && rawContest.disciplinas.length > 0;
    if (id && !hasDisc) {
      loadContestTemplateContent(supabase, id)
        .then((disc) => { if (!cancelled && Array.isArray(disc) && disc.length > 0) setLoadedSubjects(disc); })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [rawContest?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const roles = useMemo(() => getContestRoles(rawContest || {}), [rawContest]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const activeRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) || getPrimaryContestRole(rawContest || {}),
    [roles, selectedRoleId, rawContest]
  );
  const contest = useMemo(() => {
    if (!rawContest) return null;
    const built = buildContestForRole(rawContest, activeRole);
    // Injeta as disciplinas carregadas sob demanda quando o concurso veio sem elas.
    if (built && (!Array.isArray(built.disciplinas) || built.disciplinas.length === 0) && Array.isArray(loadedSubjects) && loadedSubjects.length > 0) {
      return { ...built, disciplinas: loadedSubjects };
    }
    return built;
  }, [rawContest, activeRole, loadedSubjects]);
  const normalizedStatus = normalizeContestStatus(contest?.status_concurso);
  const areaTheme = useMemo(() => getContestAreaTheme(contest?.area || 'Geral'), [contest?.area]);
  const relatedContests = useMemo(
    () => findRelatedContests(concursoCatalog, rawContest || {}),
    [concursoCatalog, rawContest]
  );

  useEffect(() => {
    setSelectedRoleId(getPrimaryContestRole(rawContest || {})?.id || '');
    setExpandedSubjects({});
  }, [rawContest]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setImageError(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [contest?.id, contest?.imagem_url]);

  const courseMatches = useMemo(() => {
    if (!contest) return [];

    return cursos.filter(
      (curso) =>
        curso.plano === contest.plano ||
        curso.nome === contest.nome ||
        curso.concurso === contest.concurso
    );
  }, [contest, cursos]);

  const startedSubjectsCount = useMemo(() => {
    if (!courseMatches.length) return 0;
    const planNames = new Set(courseMatches.map((curso) => curso.plano));
    return bancoDisciplinas.filter(
      (disciplina) =>
        planNames.has(disciplina.plano) &&
        ((disciplina.topicos || []).some((topico) => topico.concluido || topico.acertos || topico.erros) ||
          Number(disciplina.percentual || 0) > 0)
    ).length;
  }, [bancoDisciplinas, courseMatches]);

  const contestMoment = useMemo(() => {
    if (!contest) return null;

    if (normalizedStatus === 'homologado') {
      return {
        title: 'Concurso homologado',
        text: 'Esse concurso já teve resultado final homologado e hoje serve mais como referência de estrutura e histórico.',
        tone: 'gray',
      };
    }

    if (['inscricoes_abertas', 'prova_marcada', 'em_andamento'].includes(normalizedStatus)) {
      return {
        title: 'Concurso ativo',
        text: 'Esse concurso já exige atenção a prazos, prova e execução do plano de estudos.',
        tone: 'blue',
      };
    }

    if (contest.prova_data) {
      const provaDate = new Date(`${contest.prova_data}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((provaDate.getTime() - today.getTime()) / 86400000);

      if (diffDays >= 0 && diffDays <= 45) {
        return {
          title: 'Janela de prova próxima',
          text: `Faltam cerca de ${diffDays} dia(s) para a prova. Esse é o momento de priorizar revisão, questões e pontos de alto impacto.`,
          tone: 'red',
        };
      }
    }

    return {
      title: 'Bom momento para organizar',
      text: 'Esse concurso parece estar em uma fase útil para planejamento, estruturação das disciplinas e montagem do ciclo.',
      tone: 'blue',
    };
  }, [contest, normalizedStatus]);

  const contestAlerts = useMemo(() => {
    if (!contest) return [];

    const alerts = [];

    if (['previsto', 'autorizado', 'comissao_formada', 'banca_em_definicao', 'banca_definida', 'edital_iminente'].includes(normalizedStatus)) {
      alerts.push({
        title: STATUS_LABELS[normalizedStatus] || 'Fase inicial',
        text: 'Use essa fase para construir base e acompanhar as próximas publicações do órgão.',
        tone: 'blue',
      });
    }

    if (contest.prova_data) {
      const provaDate = new Date(`${contest.prova_data}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((provaDate.getTime() - today.getTime()) / 86400000);

      if (diffDays >= 0 && diffDays <= 60) {
        alerts.push({
          title: 'Prova no radar',
          text: `Faltam ${diffDays} dia(s) para a prova. Vale concentrar revisão, questões e simulados.`,
          tone: diffDays <= 30 ? 'red' : 'blue',
        });
      }
    } else {
      alerts.push({
        title: 'Data da prova pendente',
        text: 'Ainda não há uma data cadastrada. Bom momento para estruturar base e acompanhar retificações.',
        tone: 'gray',
      });
    }

    if (contest.edital_url) {
      alerts.push({
        title: 'Edital disponível',
        text: 'O PDF oficial já está anexado e pode ser consultado a qualquer momento.',
        tone: 'green',
      });
    }

    return alerts.slice(0, 3);
  }, [contest, normalizedStatus]);

  const formatDateBR = (value) => {
    if (!value) return 'Sem data';
    const [year, month, day] = String(value).split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
    return value;
  };

  const formatCurrencyBR = (value) => {
    const cleaned = String(value || '').trim();
    if (!cleaned) return 'A definir';
    if (/\s+a\s+R\$/i.test(cleaned)) return cleaned;

    const numeric = Number(cleaned.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric <= 0) return 'A definir';

    return numeric.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const agendaItems = [
    {
      label: 'Status do concurso',
      value: STATUS_LABELS[normalizedStatus] || 'Previsto',
    },
    {
      label: 'Data da prova',
      value: formatDateBR(contest?.prova_data),
    },
    {
      label: 'Valor da inscrição',
      value: formatCurrencyBR(contest?.inscricao_valor),
    },
    {
      label: 'Etapas mapeadas',
      value:
        contest?.etapas_tags?.length > 0
          ? `${contest.etapas_tags.length} etapa(s)`
          : contest?.etapas || 'A definir',
    },
  ];

  const actionChecklist = [
    {
      key: 'edital_lido',
      label: 'Ler o edital completo',
      hint: 'Marque quando já tiver passado pelos pontos principais do PDF.',
      done: Boolean(contestTracker.edital_lido),
    },
    {
      key: 'prova_no_calendario',
      label: 'Colocar a prova no calendário',
      hint: 'Serve para não perder datas importantes e ajustar o ciclo.',
      done: Boolean(contestTracker.prova_no_calendario),
    },
    {
      key: 'inscricao_planejada',
      label: 'Planejar a inscrição',
      hint: 'Separe valor, prazo e documentos necessários.',
      done: Boolean(contestTracker.inscricao_planejada),
    },
    {
      key: 'taf_em_preparacao',
      label: 'Iniciar preparação das etapas físicas',
      hint: 'Ative quando esse concurso tiver TAF ou etapas práticas.',
      done: Boolean(contestTracker.taf_em_preparacao),
      hidden: !contest?.etapas_tags?.includes('taf'),
    },
    {
      key: 'simulados_planejados',
      label: 'Reservar bloco de simulados',
      hint: 'Ajuda a transformar o edital em rotina de execução.',
      done: Boolean(contestTracker.simulados_planejados),
    },
  ].filter((item) => !item.hidden);

  const checklistDoneCount = actionChecklist.filter((item) => item.done).length;
  const logoSrc = contest?.imagem_url && !imageError ? storageThumb(contest.imagem_url, 160) : '';

  if (!contest) {
    return (
      <div className="pl-paper-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '100%', flexDirection: 'column', gap: 16 }}>
        <p className="pl-eyebrow">Concurso</p>
        <h2 style={{ fontSize: 28, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>Nenhum concurso selecionado</h2>
        <button
          type="button"
          onClick={onBack}
          className="pl-btn pl-btn-primary"
        >
          <ArrowLeft size={16} />
          Voltar para concursos
        </button>
      </div>
    );
  }

  return (
    <div className="pl-paper-bg" style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 20px 40px' }}>
      {/* Back + admin row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <button
          type="button"
          onClick={onBack}
          className="pl-btn pl-btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => onEditContest?.(rawContest || contest)}
            className="pl-btn pl-btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--pl-warn-soft)', border: '1px solid var(--pl-warn)', color: 'var(--pl-warn)' }}
          >
            <Pencil size={14} />
            Admin: editar
          </button>
        ) : null}
      </div>

      {/* Hero editorial */}
      <div className="pl-card" style={{ padding: '24px 28px', background: `linear-gradient(135deg, ${areaTheme.accentStart || 'var(--pl-ink)'} 0%, ${areaTheme.accentEnd || 'var(--pl-ink)'} 100%)`, border: 'none', color: '#f3efe5' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 20 }}>
          {logoSrc ? (
            <img
              src={logoSrc}
              alt=""
              onError={() => setImageError(true)}
              style={{ width: 80, height: 80, objectFit: 'contain', flexShrink: 0, borderRadius: 10, background: 'rgba(255,255,255,0.12)' }}
              aria-hidden
            />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LibraryBig size={30} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.65 }}>Concurso</p>
            <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 600, lineHeight: 1.1, color: '#f3efe5' }}>{contest.nome}</h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, fontWeight: 500, opacity: 0.8 }}>{contest.cargo || contest.concurso} · {contest.banca || 'Banca a definir'}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <span style={{ borderRadius: 999, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', padding: '3px 12px', fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                {contest.area || 'Geral'}
              </span>
              <span style={{ borderRadius: 999, border: '1px solid rgba(80,220,150,0.35)', background: 'rgba(80,220,150,0.15)', padding: '3px 12px', fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#b7f5d4' }}>
                {STATUS_LABELS[normalizedStatus] || 'Previsto'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => onToggleFavorite?.(contest.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10, border: isFavorite ? '1px solid rgba(250,100,100,0.4)' : '1px solid rgba(255,255,255,0.2)', background: isFavorite ? 'rgba(250,100,100,0.2)' : 'rgba(255,255,255,0.05)', padding: '6px 12px', fontSize: 12, fontWeight: 700, color: isFavorite ? '#ffb3b3' : '#f3efe5', cursor: 'pointer' }}
            >
              <Heart size={14} style={{ fill: isFavorite ? 'currentColor' : 'none' }} />
              {isFavorite ? 'Favoritado' : 'Favoritar'}
            </button>
            <button
              type="button"
              onClick={() => onToggleInterested?.(contest.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10, border: isInterested ? '1px solid rgba(250,180,60,0.4)' : '1px solid rgba(255,255,255,0.2)', background: isInterested ? 'rgba(250,180,60,0.2)' : 'rgba(255,255,255,0.05)', padding: '6px 12px', fontSize: 12, fontWeight: 700, color: isInterested ? '#ffd97d' : '#f3efe5', cursor: 'pointer' }}
            >
              <Bookmark size={14} style={{ fill: isInterested ? 'currentColor' : 'none' }} />
              {isInterested ? 'Quero estudar' : 'Interesse'}
            </button>
            <button
              type="button"
              onClick={() => onSetTargetContest?.(contest.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10, border: isTargetContest ? '1px solid rgba(250,220,60,0.4)' : '1px solid rgba(255,255,255,0.2)', background: isTargetContest ? 'rgba(250,220,60,0.2)' : 'rgba(255,255,255,0.05)', padding: '6px 12px', fontSize: 12, fontWeight: 700, color: isTargetContest ? '#fff3a3' : '#f3efe5', cursor: 'pointer' }}
            >
              <BadgeCheck size={14} style={{ fill: isTargetContest ? 'currentColor' : 'none' }} />
              {isTargetContest ? 'Alvo' : 'Como alvo'}
            </button>
            <button
              type="button"
              onClick={() => setImportConfirmOpen(true)}
              disabled={importingId === contest.id || limiteAtingido}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10, background: 'rgba(255,255,255,0.95)', color: 'var(--pl-ink)', padding: '6px 14px', fontSize: 13, fontWeight: 700, border: 'none', cursor: importingId === contest.id || limiteAtingido ? 'not-allowed' : 'pointer', opacity: importingId === contest.id || limiteAtingido ? 0.6 : 1 }}
            >
              {limiteAtingido ? 'Limite' : importingId === contest.id ? '...' : 'Adicionar aos estudos'}
              <ArrowRight size={14} />
            </button>
            {contest.edital_url ? (
              <button
                type="button"
                onClick={() => window.open(contest.edital_url, '_blank', 'noopener,noreferrer')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#f3efe5', cursor: 'pointer' }}
              >
                Edital
                <ExternalLink size={14} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {importConfirmOpen ? (
        <ImportContestModal
          contest={contest}
          isLoading={importingId === contest.id}
          limiteAtingido={limiteAtingido}
          onCancel={() => setImportConfirmOpen(false)}
          onConfirm={() => {
            onImport?.(contest);
            setImportConfirmOpen(false);
          }}
        />
      ) : null}

      {roles.length > 1 && (
        <div className="pl-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Cargos do concurso</p>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>Escolha o cargo para ver o edital correto</h2>
              <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 600 }}>
                Disciplinas, vagas, salário e lotação acompanham a opção selecionada.
              </p>
            </div>
            <span className="pl-tag pl-tag-accent">
              {roles.length} cargos cadastrados
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {roles.map((role) => {
              const selected = activeRole?.id === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  style={{
                    minHeight: 155,
                    borderRadius: 16,
                    border: selected ? '1.5px solid var(--pl-accent)' : '1px solid var(--pl-rule-2)',
                    background: selected ? 'var(--pl-accent-soft)' : 'var(--pl-bg-soft)',
                    padding: 16,
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: selected ? '0 8px 24px rgba(29,78,216,0.12)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)', lineHeight: 1.3 }}>{role.nome}</p>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: selected ? 'var(--pl-accent)' : 'var(--pl-rule-strong)', flexShrink: 0, marginTop: 3 }} />
                  </div>
                  <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {role.salario && <CargoInfo label="Salário" value={role.salario} tone="green" />}
                    {role.vagas && <CargoInfo label="Vagas" value={role.vagas} />}
                    {role.escolaridade && <CargoInfo label="Nível" value={role.escolaridade} tone="blue" />}
                    {role.lotacao && <CargoInfo label="Lotação" value={role.lotacao} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {relatedContests.length > 0 && (
        <div className="pl-card" style={{ padding: 20, background: 'var(--pl-accent-soft)', border: '1px solid rgba(29,78,216,0.12)' }}>
          <div style={{ marginBottom: 16 }}>
            <p className="pl-eyebrow" style={{ color: 'var(--pl-accent)', marginBottom: 6 }}>Concursos relacionados</p>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)' }}>Outros editais da mesma instituição</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
              Assim Oficial, Praça, PM e Bombeiros ficam vinculados, mas sem virar cargo um do outro.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {relatedContests.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenRelatedContest?.(item)}
                className="pl-card"
                style={{ padding: 16, textAlign: 'left', cursor: 'pointer', border: '1px solid var(--pl-rule-2)' }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.nome}</p>
                <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-2)' }}>{item.cargo || item.banca || 'Concurso relacionado'}</p>
                <span className="pl-tag pl-tag-accent" style={{ marginTop: 12, display: 'inline-block', fontSize: 9 }}>
                  {STATUS_LABELS[normalizeContestStatus(item.status_concurso)] || 'Previsto'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pl-card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '360px minmax(0, 1fr)' }}>
          <div style={{ borderRight: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)' }}>
            {contest.imagem_url && !imageError ? (
              <img
                src={storageThumb(contest.imagem_url, 320)}
                alt={contest.nome}
                loading="lazy"
                decoding="async"
                onError={() => setImageError(true)}
                style={{ height: '100%', minHeight: 260, width: '100%', objectFit: 'contain', background: 'var(--pl-surface)', padding: 24 }}
              />
            ) : (
              <div
                style={{ display: 'flex', minHeight: 260, width: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--pl-surface)', background: `linear-gradient(135deg, ${contest.cor || 'var(--pl-accent)'} 0%, var(--pl-accent) 100%)` }}
              >
                <LibraryBig size={56} />
              </div>
            )}
          </div>

          <div style={{ padding: '24px 32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <StatBox label="Inscrição" value={formatCurrencyBR(contest.inscricao_valor)} icon={DollarSign} />
              <StatBox label="Nível" value={contest.escolaridade || 'A definir'} icon={GraduationCap} />
              <StatBox label="Vagas" value={contest.vagas || 'A definir'} icon={Users} />
              <StatBox label="Lotação" value={contest.lotacao || 'A definir'} icon={Compass} />
            </div>

            {contest.descricao && (
              <div style={{ marginTop: 24, borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 20 }}>
                <p className="pl-eyebrow" style={{ marginBottom: 10 }}>Resumo</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>{contest.descricao}</p>
              </div>
            )}

            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <StatusPanel
                label="Já importado"
                value={courseMatches.length > 0 ? `${courseMatches.length} curso(s)` : 'Ainda não'}
                tone={courseMatches.length > 0 ? 'blue' : 'gray'}
              />
              <StatusPanel
                label="Disciplinas iniciadas"
                value={String(startedSubjectsCount)}
                tone={startedSubjectsCount > 0 ? 'green' : 'gray'}
              />
              <StatusPanel
                label="Interesse"
                value={isInterested ? 'Na sua mira' : 'Ainda não marcado'}
                tone={isInterested ? 'amber' : 'gray'}
              />
            </div>

            {contestMoment && (
              <div style={{ marginTop: 24, borderRadius: 12, border: '1px solid', padding: 20, ...momentToneStyles[contestMoment.tone] }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7 }}>Momento do concurso</p>
                <p style={{ margin: '10px 0 0', fontSize: 17, fontWeight: 600 }}>{contestMoment.title}</p>
                <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 500, lineHeight: 1.6 }}>{contestMoment.text}</p>
              </div>
            )}

            {courseMatches.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => onOpenDisciplinas?.(contest)}
                  className="pl-btn pl-btn-ghost"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  Abrir disciplinas desse concurso
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1.05fr 0.95fr' }}>
        <div className="pl-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Estrutura do edital</p>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>Disciplinas e tópicos</h2>
            </div>
            <span className="pl-tag">
              {contest.disciplinas?.length || 0} disciplinas
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(contest.disciplinas || []).map((disciplina) => {
              const isExpanded = Boolean(expandedSubjects[disciplina.nome]);
              return (
                <div key={disciplina.nome} className="pl-card" style={{ borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)' }}>{disciplina.nome}</p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                        {disciplina.topicos?.length || 0} tópicos mapeados
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSubjects((prev) => ({
                          ...prev,
                          [disciplina.nome]: !prev[disciplina.nome],
                        }))
                      }
                      style={{ borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 8, color: 'var(--pl-ink-2)', cursor: 'pointer' }}
                    >
                      <Plus size={16} style={{ transform: isExpanded ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 16, borderTop: '1px solid var(--pl-rule)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(disciplina.topicos || []).length > 0 ? (
                        (disciplina.topicos || []).map((topico) => (
                          <div
                            key={topico.id || topico.nome}
                            style={{ borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '8px 12px', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}
                          >
                            {topico.nome}
                          </div>
                        ))
                      ) : (
                        <div style={{ borderRadius: 10, border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '8px 12px', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
                          Nenhum tópico detalhado ainda.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pl-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Etapas e contexto</p>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>Leitura rápida</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <InfoCard label="Banca" value={contest.banca || 'A definir'} />
            <InfoCard label="Concurso" value={contest.concurso || contest.nome} />
            <InfoCard label="Cargo" value={contest.cargo || 'A definir'} />
            <InfoCard label="Área" value={contest.area || 'Geral'} />
          </div>

          {contestAlerts.length > 0 && (
            <div style={{ marginTop: 24, borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 20 }}>
              <p className="pl-eyebrow" style={{ marginBottom: 16 }}>Alertas do concurso</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {contestAlerts.map((alert) => (
                  <div
                    key={alert.title}
                    style={{ borderRadius: 10, border: '1px solid', padding: '16px', ...momentToneStyles[alert.tone] }}
                  >
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{alert.title}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>{alert.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 24, borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 20 }}>
            <p className="pl-eyebrow" style={{ marginBottom: 16 }}>Agenda essencial</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {agendaItems.map((item) => (
                <div key={item.label} style={{ borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16 }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--pl-ink-3)' }}>{item.label}</p>
                  <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24, borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <div>
                <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Próximos passos</p>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--pl-ink)' }}>Checklist de acompanhamento</p>
              </div>
              <span className="pl-tag pl-tag-accent">
                {checklistDoneCount}/{actionChecklist.length} concluído(s)
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {actionChecklist.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onToggleContestTask?.(contest.id, item.key)}
                  style={{
                    display: 'flex', width: '100%', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
                    borderRadius: 10, border: '1px solid', padding: 16, textAlign: 'left', cursor: 'pointer',
                    ...(item.done
                      ? { borderColor: 'var(--pl-success)', background: 'var(--pl-success-soft)', color: 'var(--pl-success)' }
                      : { borderColor: 'var(--pl-rule-2)', background: 'var(--pl-bg-soft)', color: 'var(--pl-ink)' })
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{item.label}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>{item.hint}</p>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 24, height: 24,
                      borderRadius: 999, border: '1px solid', padding: '0 8px', fontSize: 11, fontWeight: 600, flexShrink: 0,
                      ...(item.done
                        ? { borderColor: 'var(--pl-success)', background: 'var(--pl-surface)', color: 'var(--pl-success)' }
                        : { borderColor: 'var(--pl-rule-2)', background: 'var(--pl-surface)', color: 'var(--pl-ink-3)' })
                    }}
                  >
                    {item.done ? 'OK' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {(contest.etapas || contest.etapas_tags?.length > 0) && (
            <div style={{ marginTop: 24, borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 20 }}>
              <p className="pl-eyebrow" style={{ marginBottom: 12 }}>Etapas</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>
                {contest.etapas || 'Etapas não detalhadas.'}
              </p>

              {contest.etapas_tags?.length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {contest.etapas_tags.map((tag) => (
                    <span key={tag} className="pl-tag pl-tag-accent">
                      {STAGE_LABELS[tag] || tag}
                    </span>
                  ))}
                </div>
              )}

              {contest.taf_itens?.length > 0 && (
                <div style={{ marginTop: 16, borderRadius: 10, border: '1px solid var(--pl-accent-ring)', background: 'var(--pl-accent-soft)', padding: 16 }}>
                  <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--pl-accent)' }}>Itens do TAF</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {contest.taf_itens.map((item) => (
                      <span key={item} className="pl-tag">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CargoInfo({ label, value, tone = 'slate' }) {
  const toneStyles = {
    green: { background: 'var(--pl-success-soft)', color: 'var(--pl-success)' },
    blue: { background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' },
    slate: { background: 'var(--pl-surface)', color: 'var(--pl-ink-2)' },
  };

  return (
    <div style={{ borderRadius: 10, padding: '8px 12px', ...toneStyles[tone] }}>
      <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.6 }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 800, lineHeight: 1.3, wordBreak: 'break-word' }}>{value}</p>
    </div>
  );
}

function ImportContestModal({ contest, isLoading, limiteAtingido, onCancel, onConfirm }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.55)', padding: '24px 16px', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: 520, overflow: 'hidden', borderRadius: 24, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-high)' }}>
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%)', padding: '24px 28px', color: '#f3efe5' }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#93b4ff' }}>Adicionar aos estudos</p>
          <h3 style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{contest?.nome || 'Concurso selecionado'}</h3>
          <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 500, lineHeight: 1.6, color: 'rgba(243,239,229,0.7)' }}>
            Isso cria um curso na sua área de estudos com as disciplinas, tópicos e dados do edital.
          </p>
        </div>
        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {limiteAtingido ? (
            <div style={{ borderRadius: 12, border: '1px solid var(--pl-warn)', background: 'var(--pl-warn-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>
              Seu limite de cursos foi atingido. Remova algum curso ou ajuste seu plano antes de adicionar este concurso.
            </div>
          ) : (
            <div style={{ borderRadius: 12, border: '1px solid var(--pl-accent-ring)', background: 'var(--pl-accent-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-accent)' }}>
              Depois de adicionar, você encontra esse concurso em Meus cursos e pode estudar pelo edital verticalizado.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
            <span style={{ borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '12px 16px' }}>Banca: {contest?.banca || 'A definir'}</span>
            <span style={{ borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '12px 16px' }}>Área: {contest?.area || 'Geral'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="pl-btn pl-btn-ghost"
              style={{ minHeight: 44 }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading || limiteAtingido}
              className="pl-btn pl-btn-primary"
              style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {isLoading ? 'Adicionando...' : 'Adicionar agora'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon }) {
  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--pl-ink-3)' }}>
        <Icon size={14} />
        <p className="pl-eyebrow" style={{ margin: 0 }}>{label}</p>
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 17, fontWeight: 600, color: 'var(--pl-ink)' }}>{value}</p>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16 }}>
      <p className="pl-eyebrow" style={{ margin: 0, marginBottom: 8 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{value}</p>
    </div>
  );
}

function StatusPanel({ label, value, tone = 'gray' }) {
  const toneStyles = {
    gray: { borderColor: 'var(--pl-rule-2)', background: 'var(--pl-bg-soft)', color: 'var(--pl-ink-2)' },
    blue: { borderColor: 'var(--pl-accent-ring)', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' },
    green: { borderColor: 'var(--pl-success)', background: 'var(--pl-success-soft)', color: 'var(--pl-success)' },
    amber: { borderColor: 'var(--pl-warn)', background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)' },
  };

  return (
    <div style={{ borderRadius: 12, border: '1px solid', padding: 16, ...toneStyles[tone] }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.7 }}>{label}</p>
      <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 600 }}>{value}</p>
    </div>
  );
}

const momentToneStyles = {
  blue: { borderColor: 'var(--pl-accent-ring)', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' },
  amber: { borderColor: 'var(--pl-warn)', background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)' },
  red: { borderColor: 'var(--pl-danger)', background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)' },
  green: { borderColor: 'var(--pl-success)', background: 'var(--pl-success-soft)', color: 'var(--pl-success)' },
  gray: { borderColor: 'var(--pl-rule-2)', background: 'var(--pl-bg-soft)', color: 'var(--pl-ink-2)' },
};
