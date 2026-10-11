import React, { useMemo, useState } from 'react';
import { ClipboardPaste, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { lerLote, estaPronta } from '../lib/questoesColadas';
import { salvarQuestoes } from '../lib/salvarQuestoesColadas';
import { showToast } from '../lib/dialogs';

// Importar questoes colando o texto do export.
//
// A previa nao e enfeite: o lote real chega com furos (gabarito ausente, texto-base por
// referencia), e importar as cegas enche o banco de questao que o aluno abre, responde e nao
// recebe correcao. Aqui da para ver o que entrou, o que faltou e em qual questao — antes de
// gravar qualquer coisa.
export default function AdminQuestoesColar() {
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const questoes = useMemo(() => (texto.trim() ? lerLote(texto) : []), [texto]);
  const prontas = questoes.filter(estaPronta);
  const comFuro = questoes.filter((questao) => !estaPronta(questao));

  const importar = async () => {
    setSalvando(true);
    setResultado(null);
    try {
      const saida = await salvarQuestoes(questoes);
      if (saida.erro) {
        showToast(saida.erro, 'error');
      } else {
        setResultado(saida);
        showToast(`${saida.salvas} questão(ões) no banco.`, 'success');
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="pl-page">
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Banco de questões</p>
          <h1 className="pl-display" style={{ margin: 0, fontSize: 'clamp(28px, 4vw, 44px)', color: 'var(--pl-ink)' }}>
            Colar questões.
          </h1>
          <p style={{ margin: '10px 0 0', maxWidth: 620, fontSize: 14, lineHeight: 1.5, color: 'var(--pl-ink-2)' }}>
            Cole o lote exportado. Cada questão é conferida antes de ir para o banco, e recolar
            o mesmo lote atualiza em vez de duplicar.
          </p>
        </div>

        <textarea
          className="pl-input"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder={'QUESTÃO 1\nID TEC: #551858\nBanca: ...\n\nENUNCIADO:\n...\n\nALTERNATIVAS:\nCerto\nErrado\n\nGABARITO: Certo'}
          spellCheck={false}
          style={{ width: '100%', minHeight: 220, fontFamily: 'var(--pl-mono)', fontSize: 12.5, lineHeight: 1.5, resize: 'vertical' }}
        />

        {questoes.length > 0 && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <span className="pl-tag pl-tag-success">{prontas.length} prontas</span>
              {comFuro.length > 0 && <span className="pl-tag pl-tag-warn">{comFuro.length} incompletas</span>}
              <button
                type="button"
                className="pl-btn pl-btn-primary"
                onClick={importar}
                disabled={salvando || prontas.length === 0}
                style={{ marginLeft: 'auto' }}
              >
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <ClipboardPaste size={14} />}
                {salvando ? 'Importando…' : `Importar ${prontas.length}`}
              </button>
            </div>

            {resultado && (
              <div style={{ borderRadius: 6, border: '1px solid var(--pl-success)', background: 'var(--pl-success-soft)', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--pl-success)' }}>
                {resultado.salvas} gravada(s).
                {resultado.ignoradas > 0 ? ` ${resultado.ignoradas} ficou(ram) de fora por estar(em) incompleta(s).` : ''}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {questoes.map((questao, indice) => (
                <LinhaDaPrevia key={questao.idTec || indice} questao={questao} numero={indice + 1} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LinhaDaPrevia({ questao, numero }) {
  const pronta = estaPronta(questao);
  const procedencia = [questao.banca, questao.orgao, questao.ano].filter(Boolean).join(' · ');

  return (
    <div
      className="pl-card"
      style={{ padding: '12px 14px', borderLeft: `3px solid ${pronta ? 'var(--pl-success)' : 'var(--pl-warn)'}` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {pronta
          ? <Check size={13} style={{ color: 'var(--pl-success)', flexShrink: 0 }} />
          : <AlertTriangle size={13} style={{ color: 'var(--pl-warn)', flexShrink: 0 }} />}
        <strong style={{ fontSize: 12.5, color: 'var(--pl-ink)' }}>{numero}.</strong>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--pl-ink)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {questao.materia || 'sem matéria'}
        </span>
        {questao.assunto ? <span style={{ fontSize: 12, color: 'var(--pl-ink-3)' }}>· {questao.assunto}</span> : null}
        {questao.idTec ? (
          <span style={{ fontFamily: 'var(--pl-mono)', fontSize: 10, color: 'var(--pl-ink-4)' }}>#{questao.idTec}</span>
        ) : null}
        {/* O texto emprestado de outra questao e o ponto mais facil de dar errado em
            silencio: se a referencia nao resolvesse, a questao iria para o banco com
            "[Mesmo texto da Questão 3]" no lugar do enunciado. */}
        {questao.textoHerdado ? <span className="pl-tag" style={{ fontSize: 9.5 }}>texto da #{questao.textoDe}</span> : null}
      </div>

      <p style={{ margin: '7px 0 0', fontSize: 12, lineHeight: 1.45, color: 'var(--pl-ink-2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {questao.enunciado || '— sem enunciado —'}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7, flexWrap: 'wrap', fontSize: 11, color: 'var(--pl-ink-3)' }}>
        {procedencia ? <span>{procedencia}</span> : null}
        <span>{questao.alternativas?.length || 0} alternativas</span>
        <span style={{ fontWeight: 700, color: questao.gabarito ? 'var(--pl-ink-2)' : 'var(--pl-warn)' }}>
          {questao.gabarito ? `gabarito ${questao.gabarito}` : 'sem gabarito'}
        </span>
        <span style={{ color: questao.comentario ? 'var(--pl-ink-3)' : 'var(--pl-ink-4)' }}>
          {questao.comentario ? 'com comentário' : 'sem comentário'}
        </span>
      </div>

      {!pronta && (
        <p style={{ margin: '7px 0 0', fontSize: 11.5, fontWeight: 650, color: 'var(--pl-warn)' }}>
          Falta: {questao.faltando.join(', ')} — esta não vai ser importada.
        </p>
      )}
    </div>
  );
}
