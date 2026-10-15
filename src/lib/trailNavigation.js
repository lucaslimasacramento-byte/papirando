// Filtro deixado para a tela de Questões ler ao abrir (sessionStorage, consumido uma vez).
export const QUESTION_PRESET_KEY = 'papirando_questoes_preset';

// Leva o aluno da trilha do curso pronto para a prática do tema.
// Questões abre filtrada pela matéria; Flashcards abre a lista de baralhos (um por tema).
export function goToPracticeStep(setActiveTab, step, topic = {}) {
  if (step === 'questoes') {
    try {
      sessionStorage.setItem(QUESTION_PRESET_KEY, JSON.stringify({ disciplina: topic.materia || '', tema: topic.tema || '' }));
    } catch {
      // sem sessionStorage: abre Questões sem filtro
    }
    setActiveTab('questoes');
    return;
  }
  setActiveTab('flashcards');
}
