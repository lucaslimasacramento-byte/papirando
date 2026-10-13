// Saudação pelo horário de quem está na tela.
//
// A conta antiga era `hora < 12 ? 'Bom dia' : ...`, e à 01h24 da madrugada o app dizia
// "Bom dia" — técnicamente é antes do meio-dia, na vida real é outra coisa. Concurseiro
// vira noite estudando; ser saudado como se fosse manhã denuncia que ninguém pensou nele.
//
// Os cortes seguem o uso comum no Brasil: a madrugada vai até as 5h, quando "bom dia" passa
// a fazer sentido mesmo para quem acordou cedo.
const FAIXAS = [
  { ate: 5, saudacao: 'Boa madrugada', periodo: 'madrugada' },
  { ate: 12, saudacao: 'Bom dia', periodo: 'manha' },
  { ate: 18, saudacao: 'Boa tarde', periodo: 'tarde' },
  { ate: 24, saudacao: 'Boa noite', periodo: 'noite' },
];

export function saudacaoDoHorario(data = new Date()) {
  const hora = data instanceof Date && !Number.isNaN(data.getTime()) ? data.getHours() : 12;
  return FAIXAS.find((faixa) => hora < faixa.ate) || FAIXAS[FAIXAS.length - 1];
}

// Quanto falta para a próxima virada de faixa, em milissegundos.
//
// Serve para a tela não congelar no horário em que foi aberta: quem deixa o app aberto a
// noite toda via "Boa tarde" às duas da manhã, e a data parada no dia anterior.
export function msAteProximaFaixa(data = new Date()) {
  const agora = data instanceof Date && !Number.isNaN(data.getTime()) ? data : new Date();
  const proximaHora = FAIXAS.find((faixa) => agora.getHours() < faixa.ate)?.ate ?? 24;

  const virada = new Date(agora);
  virada.setHours(proximaHora, 0, 0, 0);
  // `ate: 24` cai na meia-noite do dia seguinte — setHours(24) ja rola a data sozinho.
  return Math.max(1000, virada.getTime() - agora.getTime());
}
