// Nome de exibição do aluno.
//
// O app mostrava o começo do e-mail enquanto o perfil não tinha chegado do Supabase, e
// trocava pelo nome real quando chegava: quem entra com contato@empresa.com era saudado
// como "Boa noite, Contato" e via virar "Lucas" um segundo depois. Além de feio, é um
// palpite apresentado como fato — e logo no cumprimento, que é onde o app diz que conhece
// quem está do outro lado.
//
// A regra passa a ser uma só, aqui: enquanto o perfil não carregou, não há nome. A tela
// cumprimenta sem nome ("Boa noite.") e completa quando o dado existir de verdade.
//
// A ordem de fallback é nome real > username > primeira palavra do e-mail. O username vinha
// antes do nome em versões anteriores, o que fazia "Lucas Lima" ser ignorado em favor de
// "lucasl".

function capitalizar(texto) {
  const limpo = String(texto || '').trim();
  return limpo ? limpo.charAt(0).toUpperCase() + limpo.slice(1) : '';
}

// Só a primeira "palavra" da parte local do e-mail: separa por qualquer coisa que não seja
// letra, então lucas.lima@ e lucas_lima@ viram "Lucas".
function primeiraPalavraDoEmail(email) {
  const parteLocal = String(email || '').split('@')[0];
  return (
    parteLocal
      .replace(/[^a-záéíóúâêîôûãõàèìòùç]/gi, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)[0] || ''
  );
}

export function primeiroNomeDoPerfil(perfil, email, { carregado = true } = {}) {
  // Sem perfil carregado não se chuta: o nome errado aparece e desaparece, e quem viu fica
  // com a impressao de que o app se confundiu de conta.
  if (!carregado) return '';

  const nomeCompleto = String(perfil?.nome || perfil?.name || perfil?.full_name || '').trim();
  const primeiro = capitalizar(nomeCompleto.split(/\s+/).filter(Boolean)[0] || '');
  if (primeiro) return primeiro;

  const username = String(perfil?.username || perfil?.user_name || '').trim();
  if (username) return capitalizar(username);

  return capitalizar(primeiraPalavraDoEmail(email));
}
