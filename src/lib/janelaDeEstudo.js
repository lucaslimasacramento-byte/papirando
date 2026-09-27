// Quanto tempo dura um bloco de estudo de uma mesma disciplina.
//
// Havia duas verdades sobre isso no app, e elas nao conversavam. O wizard de planejamento
// salvava a escolha do aluno em `planningSessionWindow` ({minMinutes, maxMinutes}), numerica.
// O montador do ciclo, porem, lia `wizData.minSessao` / `wizData.maxSessao` — dois textos
// ("1h 30m" / "2h 00m") que nenhuma tela jamais escrevia. Resultado: o aluno escolhia
// "45m a 1h" e recebia blocos de 1h30, porque o montador continuava lendo o valor de
// fabrica. Este modulo passa a ser o unico lugar que responde essa pergunta, e a escolha
// numerica do aluno ganha do texto legado.

export const JANELA_PADRAO = { minMinutes: 60, maxMinutes: 120 };

// Aceita "1h 30m", "45m", "2h", "90" — o formato legado do wizData.
export function minutosDoRotulo(rotulo) {
  const texto = String(rotulo ?? '').toLowerCase().trim();
  if (!texto) return 0;

  const horas = texto.match(/(\d+)\s*h/);
  const minutos = texto.match(/(\d+)\s*m/);
  if (horas || minutos) {
    return (horas ? Number(horas[1]) * 60 : 0) + (minutos ? Number(minutos[1]) : 0);
  }

  // Numero solto ja e minuto.
  const solto = Number(texto.replace(',', '.'));
  return Number.isFinite(solto) && solto > 0 ? Math.round(solto) : 0;
}

function numeroValido(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? Math.round(numero) : 0;
}

// A janela que vale, em minutos. `janelaSalva` e o que o aluno escolheu no wizard;
// `wizardData` e o pacote legado, usado so quando nao ha escolha salva.
export function janelaDeEstudo(wizardData, janelaSalva) {
  const minSalvo = numeroValido(janelaSalva?.minMinutes);
  const maxSalvo = numeroValido(janelaSalva?.maxMinutes);

  const min = minSalvo
    || minutosDoRotulo(wizardData?.minSessao)
    || JANELA_PADRAO.minMinutes;
  const max = maxSalvo
    || minutosDoRotulo(wizardData?.maxSessao)
    || JANELA_PADRAO.maxMinutes;

  // Minimo de 15: abaixo disso nao e bloco de estudo, e interrupcao.
  const minFinal = Math.max(15, min);
  return { min: minFinal, max: Math.max(minFinal, max) };
}
