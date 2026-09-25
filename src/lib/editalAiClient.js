import { resolveAiBaseUrl, resolveAiHeaders } from './aiRuntime';

export async function analyzeEditalWithRealAI(editalText) {
  const baseUrl = resolveAiBaseUrl();

  const response = await fetch(`${baseUrl}/api/ai/analyze-edital`, {
    method: 'POST',
    headers: await resolveAiHeaders(),
    body: JSON.stringify({ editalText }),
  });

  const responseText = await response.text().catch(() => '');
  let payload = {};

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      if (!response.ok) {
        // O status era descartado aqui — o mesmo erro que o fetchJson do backend cometia.
        // Sem ele, "formato inválido" cobre coisas com soluções opostas: 504 é a função
        // estourando o tempo, 413 é o PDF grande demais, 5xx é a função quebrando. Quando
        // não é o nosso JSON, a resposta vem da própria Vercel, que carrega o código do
        // erro no corpo (FUNCTION_INVOCATION_TIMEOUT e afins) — vale repassar.
        const codigo = responseText.match(/[A-Z][A-Z_]{8,}/)?.[0] || '';
        const pista =
          response.status === 504 || codigo.includes('TIMEOUT')
            ? ' A análise passou do tempo limite do servidor.'
            : response.status === 413
              ? ' O arquivo enviado é grande demais para o servidor.'
              : '';

        throw new Error(
          `A leitura respondeu em formato inválido (HTTP ${response.status}` +
            `${codigo ? ` · ${codigo}` : ''}).${pista}`
        );
      }

      throw new Error('A resposta da análise do edital veio vazia ou inválida.');
    }
  }

  if (!response.ok) {
    // O backend manda a mensagem publica em `error` e o motivo tecnico em `detail`.
    // Sem o detail, "falha temporaria no servico de IA" nao distingue chave invalida de
    // modelo inexistente, cota estourada ou timeout.
    const base =
      payload?.error ||
      (responseText ? 'Não foi possível analisar o edital agora.' : 'Não veio resposta do servidor.');
    const detalhe = String(payload?.detail || '').trim();
    throw new Error(detalhe && detalhe !== base ? `${base} — ${detalhe}` : base);
  }

  return normalizeOpenAiAnalysis(payload);
}

function normalizeOpenAiAnalysis(payload) {
  const analysis = payload?.analysis || {};
  const contests = Array.isArray(analysis.contests) ? analysis.contests : [];

  const normalizedContests = contests.map((contest) => {
    const disciplinas = Array.isArray(contest.subjects)
      ? contest.subjects
          .map((subject) => ({
            nome: String(subject?.name || '').trim(),
            topicos: Array.isArray(subject?.topics)
              ? subject.topics.map((topic) => String(topic || '').trim()).filter(Boolean)
              : [],
          }))
          .filter((subject) => subject.nome)
      : [];

    // Quadro de provas: quantas questões e que peso cada disciplina tem NESTE cargo.
    // É o que permite a plataforma priorizar em vez de tratar tudo como igual.
    const prova = Array.isArray(contest.prova)
      ? contest.prova
          .map((linha) => ({
            disciplina: String(linha?.disciplina || '').trim(),
            questoes: String(linha?.questoes || '').trim(),
            peso: String(linha?.peso || '').trim() || '1',
          }))
          .filter((linha) => linha.disciplina && linha.questoes)
      : [];

    return {
      id: String(contest.id || contest.title || 'opcao').trim(),
      title: String(contest.title || contest.role_name || analysis.exam_name || 'Edital completo').trim(),
      roleName: String(contest.role_name || contest.title || '').trim(),
      institution: String(contest.institution || analysis.organization || 'Não encontrado').trim(),
      // Dados do cargo — o curso do aluno (App.jsx createCourse) já carrega todos eles.
      vagas: String(contest.vagas || '').trim(),
      salario: String(contest.salario || '').trim(),
      escolaridade: String(contest.escolaridade || '').trim(),
      lotacao: String(contest.lotacao || '').trim(),
      cargaHoraria: String(contest.carga_horaria || '').trim(),
      prova,
      totalQuestoes: prova.reduce((acc, linha) => acc + (Number(linha.questoes) || 0), 0),
      examDate: String(contest.exam_date || analysis?.dates?.exam_date || 'Não encontrado').trim(),
      publicationDate: String(
        contest.publication_date || analysis?.dates?.publication_date || 'Não encontrado'
      ).trim(),
      registrationPeriod: String(
        contest.registration_period || analysis?.dates?.registration_period || 'Não encontrado'
      ).trim(),
      disciplinas,
      disciplinasCount: disciplinas.length,
      topicosCount: disciplinas.reduce((acc, disciplina) => acc + disciplina.topicos.length, 0),
    };
  });

  // O id vem do titulo do cargo; dois cargos com o mesmo titulo geravam o mesmo id. Isso
  // era inofensivo com um dropdown de escolha unica, mas a escolha multipla passa a casar
  // disciplina com cargo por esse id — dois cargos iguais virariam um so, silenciosamente.
  const idsVistos = new Set();
  normalizedContests.forEach((contest, indice) => {
    let id = contest.id || `cargo-${indice + 1}`;
    if (idsVistos.has(id)) id = `${id}-${indice + 1}`;
    idsVistos.add(id);
    contest.id = id;
  });

  return {
    source: payload?.source || payload?.provider || 'ai',
    sourceLabel: buildSourceLabel(payload),
    model: payload?.model || 'AI',
    banca: String(analysis.banca || 'A definir').trim(),
    examName: String(analysis.exam_name || 'Não encontrado').trim(),
    organization: String(analysis.organization || 'Não encontrado').trim(),
    examType: String(analysis.exam_type || 'Não encontrado').trim(),
    inscricaoValor: String(analysis.inscricao_valor || '').trim(),
    // Etapas do certame — decidem o que a plataforma mostra ou esconde para este aluno
    // (Redações só faz sentido se houver discursiva; TAF idem).
    etapas: Array.isArray(analysis.etapas)
      ? analysis.etapas.map((etapa) => String(etapa || '').trim()).filter(Boolean)
      : [],
    dates: {
      publicationDate: String(analysis?.dates?.publication_date || 'Não encontrado').trim(),
      examDate: String(analysis?.dates?.exam_date || 'Não encontrado').trim(),
      registrationPeriod: String(analysis?.dates?.registration_period || 'Não encontrado').trim(),
    },
    contests: normalizedContests,
    detectedContests: normalizedContests.length,
  };
}

function buildSourceLabel(payload) {
  const provider = String(payload?.provider || payload?.source || '').toLowerCase();

  if (provider === 'openrouter') return 'OpenRouter';
  if (provider === 'groq') return 'Groq';
  if (provider === 'openai') return 'OpenAI';
  if (provider === 'gemini') return 'Gemini';
  return 'Leitura automática';
}
