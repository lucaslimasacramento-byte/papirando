import { getAiUnavailableMessage, resolveAiBaseUrl, resolveAiHeaders } from './aiRuntime';

export async function analyzeEditalWithRealAI(editalText) {
  const baseUrl = resolveAiBaseUrl();
  if (!baseUrl) {
    throw new Error(getAiUnavailableMessage());
  }

  const response = await fetch(`${baseUrl}/api/analyze-edital`, {
    method: 'POST',
    headers: resolveAiHeaders(),
    body: JSON.stringify({ editalText }),
  });

  const responseText = await response.text().catch(() => '');
  let payload = {};

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      if (!response.ok) {
        throw new Error('O servidor de IA respondeu em formato inválido.');
      }

      throw new Error('A resposta da análise do edital veio vazia ou inválida.');
    }
  }

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        (responseText ? 'Não foi possível analisar o edital com IA.' : 'O servidor de IA não retornou resposta.')
    );
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

    return {
      id: String(contest.id || contest.title || 'opcao').trim(),
      title: String(contest.title || contest.role_name || analysis.exam_name || 'Edital completo').trim(),
      institution: String(contest.institution || analysis.organization || 'Não encontrado').trim(),
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

  return {
    source: payload?.source || payload?.provider || 'ai',
    sourceLabel: buildSourceLabel(payload),
    model: payload?.model || 'AI',
    banca: String(analysis.banca || 'A definir').trim(),
    examName: String(analysis.exam_name || 'Não encontrado').trim(),
    organization: String(analysis.organization || 'Não encontrado').trim(),
    examType: String(analysis.exam_type || 'Não encontrado').trim(),
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

  if (provider === 'ollama') return 'IA local';
  if (provider === 'openai') return 'IA real';
  if (provider === 'gemini') return 'Gemini';
  return 'IA';
}
