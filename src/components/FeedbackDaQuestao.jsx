import React, { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, Check, Loader2 } from 'lucide-react';
import {
  UTIL, RUIM, LIMITE_DO_TEXTO,
  normalizarVoto, textoDentroDoLimite, restamCaracteres, podeEnviar,
  meuFeedback, enviarFeedback,
} from '../lib/feedbackDaQuestao';

// O joinha da questão, com espaço para dizer o que está errado.
//
// O voto sozinho diz que algo incomodou; o texto diz o quê. Por isso clicar num dos dois
// polegares abre o campo em vez de já enviar: é no segundo em que o aluno acabou de marcar
// "não ajudou" que ele ainda lembra por quê.

export default function FeedbackDaQuestao({ questaoId, currentUserId }) {
  const [voto, setVoto] = useState('');
  const [texto, setTexto] = useState('');
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  // O que ele já respondeu antes volta: assim ele vê que o recado foi registrado, em vez de
  // mandar o mesmo de novo achando que se perdeu.
  useEffect(() => {
    let valido = true;
    setVoto(''); setTexto(''); setAberto(false); setEnviado(false); setErro('');

    meuFeedback(questaoId, currentUserId).then((salvo) => {
      if (!valido || !salvo) return;
      setVoto(salvo.voto);
      setTexto(salvo.comentario);
      setEnviado(true);
    });

    return () => { valido = false; };
  }, [questaoId, currentUserId]);

  if (!currentUserId) return null;

  function escolher(escolha) {
    const novo = normalizarVoto(escolha);
    setErro('');
    // Clicar de novo no mesmo polegar desfaz a escolha — é o que todo mundo tenta.
    if (novo === voto && aberto) {
      setVoto('');
      setAberto(false);
      return;
    }
    setVoto(novo);
    setAberto(true);
    setEnviado(false);
  }

  async function enviar() {
    if (!podeEnviar({ voto, enviando })) return;
    setEnviando(true);
    setErro('');
    const resultado = await enviarFeedback(questaoId, currentUserId, { voto, comentario: texto });
    setEnviando(false);
    if (!resultado.ok) {
      setErro(resultado.erro || 'Não consegui enviar agora.');
      return;
    }
    setEnviado(true);
    setAberto(false);
  }

  const restam = restamCaracteres(texto);

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0,
        // Fechado, é só um par de polegares no meio do rodapé. Aberto, desce para uma linha
        // só dele: espremido entre "Rascunho" e "Responder" o campo de texto virava uma
        // fresta de três palavras por linha, e ninguém escreve um relato ali.
        ...(aberto ? { flexBasis: '100%', order: 9 } : { flexShrink: 0 }),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-ink-4)', fontFamily: 'var(--pl-sans)' }}>
          Esta questão
        </span>
        <Polegar
          ativo={voto === UTIL}
          titulo="Esta questão é boa"
          tom="var(--pl-success)"
          fundo="var(--pl-success-soft)"
          onClick={() => escolher(UTIL)}
        >
          <ThumbsUp size={13} />
        </Polegar>
        <Polegar
          ativo={voto === RUIM}
          titulo="Esta questão tem problema"
          tom="var(--pl-danger)"
          fundo="var(--pl-danger-soft)"
          onClick={() => escolher(RUIM)}
        >
          <ThumbsDown size={13} />
        </Polegar>

        {enviado && !aberto ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--pl-success)', fontFamily: 'var(--pl-sans)' }}>
            <Check size={12} />
            Obrigado
          </span>
        ) : null}
      </div>

      {aberto ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: 620 }}>
          <textarea
            autoFocus
            rows={2}
            value={texto}
            maxLength={LIMITE_DO_TEXTO}
            onChange={(evento) => setTexto(textoDentroDoLimite(evento.target.value))}
            placeholder={voto === RUIM ? 'O que está errado? (opcional)' : 'Quer dizer mais alguma coisa? (opcional)'}
            style={{
              width: '100%', resize: 'vertical', minHeight: 44,
              borderRadius: 8, border: '1px solid var(--pl-rule-2)',
              background: 'var(--pl-bg)', padding: '6px 9px',
              fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: 'var(--pl-ink)',
              outline: 'none', fontFamily: 'var(--pl-sans)', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {/* O contador só vira aviso perto do fim: um número vermelho desde o primeiro
                caractere faz o campo parecer um formulário com regra, e não um recado. */}
            <span style={{ fontSize: 10, fontWeight: 600, color: restam <= 50 ? 'var(--pl-warn)' : 'var(--pl-ink-4)', fontFamily: 'var(--pl-mono)' }}>
              {restam}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => { setAberto(false); setErro(''); }}>
                Cancelar
              </button>
              <button
                type="button"
                className="pl-btn pl-btn-primary pl-btn-sm"
                onClick={enviar}
                disabled={!podeEnviar({ voto, enviando })}
                style={!podeEnviar({ voto, enviando }) ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
              >
                {enviando ? <Loader2 size={12} className="animate-spin" /> : null}
                Enviar
              </button>
            </div>
          </div>
          {erro ? (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-danger)', fontFamily: 'var(--pl-sans)' }}>{erro}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Polegar({ ativo, titulo, tom, fundo, onClick, children }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      aria-pressed={ativo}
      onClick={onClick}
      style={{
        display: 'inline-flex', height: 26, width: 26, alignItems: 'center', justifyContent: 'center',
        borderRadius: 7, padding: 0, cursor: 'pointer',
        border: `1px solid ${ativo ? tom : 'var(--pl-rule-2)'}`,
        background: ativo ? fundo : 'var(--pl-surface)',
        color: ativo ? tom : 'var(--pl-ink-3)',
        transition: 'border-color 0.15s, background 0.15s, color 0.15s',
      }}
    >
      {children}
    </button>
  );
}
