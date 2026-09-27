import React, { useState, useEffect, useRef } from 'react';
import { Timer, Loader2, Upload } from 'lucide-react';
import { formatarDuracao, formatarRitmo, minutosDaProva } from '../lib/ritmoDaProva';

// O retrato da prova: duracao, total de questoes, redacao e o tempo por questao.
//
// Sao dados que o edital sempre trouxe e que ninguem cruzava. Deles sai o numero que separa
// uma prova de velocidade de uma de profundidade — e que nenhum aluno calcula sozinho.
// Ver src/lib/ritmoDaProva.js.
//
// Este cartao vivia duplicado no Edital e no Planejamento, com comportamentos ja diferentes
// entre si (um mostrava a duracao faltante, o outro escondia). Duas copias da mesma ideia
// divergem sempre; aqui ha uma so.
//
// Quando falta a duracao, o cartao NAO some o campo em silencio: dizer "nao tenho esse dado"
// vale mais do que mostrar dois numeros e omitir justamente o mais util. Ha dois caminhos
// para preencher, porque todo edital lido antes de o campo existir ficou sem ele:
//
//   1. Reenviar o PDF do edital. O texto do edital NAO fica guardado em lugar nenhum — ele
//      so existe em memoria durante a importacao —, entao nao ha o que reler: o arquivo
//      precisa vir de novo. Em compensacao, so a duracao e aproveitada, e nada do que o
//      aluno ja marcou e tocado.
//   2. Digitar. O aluno esta com o edital aberto na frente dele.
export default function RitmoDaProvaCard({
  perfil,
  ritmo,
  duracaoSalva = '',
  onSalvarDuracao = null,
  onLerDoEdital = null,
  lendoEdital = false,
  erroDaLeitura = '',
}) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(duracaoSalva);
  const inputDeArquivo = useRef(null);

  useEffect(() => { setRascunho(duracaoSalva); }, [duracaoSalva]);

  if (!perfil || perfil.totalQuestoes === 0) return null;

  const faltaDuracao = perfil.duracaoMin === 0;
  const minutosDoRascunho = minutosDaProva(rascunho);
  const podeDigitar = Boolean(onSalvarDuracao);

  // O que o ritmo ficaria com a duracao que esta sendo digitada, ja descontada a redacao.
  const previaDoRitmo = minutosDoRascunho > 0 && perfil.totalQuestoes > 0
    ? Math.round((Math.max(0, minutosDoRascunho - perfil.minutosDaRedacao) / perfil.totalQuestoes) * 10) / 10
    : 0;

  const salvar = () => {
    if (minutosDoRascunho <= 0) return;
    onSalvarDuracao(rascunho.trim());
    setEditando(false);
  };

  const cancelar = () => {
    setEditando(false);
    setRascunho(duracaoSalva);
  };

  return (
    <section className="pl-card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <p className="pl-eyebrow" style={{ margin: 0 }}>
          <Timer size={11} style={{ verticalAlign: '-1px', marginRight: 5 }} />
          O ritmo desta prova
        </p>
        {ritmo ? <span className="pl-tag pl-tag-accent">{ritmo.titulo}</span> : null}
      </div>

      <div style={{ marginTop: 10, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <Fato rotulo="Questões" valor={String(perfil.totalQuestoes)} />
        <Fato
          rotulo="Redação"
          valor={perfil.temRedacao ? `sim · ${formatarDuracao(perfil.minutosDaRedacao)}` : 'não'}
        />
        <Fato
          rotulo="Duração"
          valor={faltaDuracao ? '—' : formatarDuracao(perfil.duracaoMin)}
          ausente={faltaDuracao}
        />
        <Fato
          rotulo="Por questão"
          valor={perfil.minutosPorQuestao > 0 ? formatarRitmo(perfil.minutosPorQuestao) : '—'}
          ausente={perfil.minutosPorQuestao === 0}
        />
      </div>

      {ritmo ? (
        <p style={{ margin: '10px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--pl-ink-2)' }}>{ritmo.detalhe}</p>
      ) : null}

      {faltaDuracao && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--pl-rule)' }}>
          {editando ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <input
                className="pl-input"
                autoFocus
                value={rascunho}
                onChange={(evento) => setRascunho(evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter') { evento.preventDefault(); salvar(); }
                  if (evento.key === 'Escape') cancelar();
                }}
                placeholder="4 horas, 3h30, 240 minutos..."
                style={{ flex: '1 1 200px', minWidth: 0 }}
              />
              <button type="button" className="pl-btn pl-btn-primary pl-btn-sm" onClick={salvar} disabled={minutosDoRascunho <= 0}>
                Salvar
              </button>
              <button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" onClick={cancelar}>
                Cancelar
              </button>
              {/* Confirma o que foi entendido ANTES de salvar: "4h30" e "4,30" nao sao a
                  mesma coisa, e este numero vai calibrar o cronograma inteiro. */}
              <span style={{ fontSize: 12, fontWeight: 650, color: minutosDoRascunho > 0 ? 'var(--pl-ink-2)' : 'var(--pl-ink-3)' }}>
                {minutosDoRascunho > 0
                  ? `entendi ${formatarDuracao(minutosDoRascunho)} · ${formatarRitmo(previaDoRitmo)} por questão`
                  : 'não consegui ler essa duração'}
              </span>
            </div>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--pl-ink-2)' }}>
                Falta a <strong>duração da prova</strong> — sem ela não dá para calcular o tempo por questão.
                A leitura deste edital não capturou esse dado.
              </p>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {onLerDoEdital && (
                  <>
                    <input
                      ref={inputDeArquivo}
                      type="file"
                      accept=".pdf,.txt,application/pdf,text/plain"
                      style={{ display: 'none' }}
                      onChange={(evento) => {
                        const arquivo = evento.target.files?.[0];
                        // Limpa o valor para que escolher o MESMO arquivo de novo (depois de
                        // um erro) continue disparando o onChange.
                        evento.target.value = '';
                        if (arquivo) onLerDoEdital(arquivo);
                      }}
                    />
                    <button
                      type="button"
                      className="pl-btn pl-btn-ai pl-btn-sm"
                      onClick={() => inputDeArquivo.current?.click()}
                      disabled={lendoEdital}
                    >
                      {lendoEdital ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                      {lendoEdital ? 'Lendo o edital…' : 'Puxar do edital (PDF)'}
                    </button>
                  </>
                )}
                {podeDigitar && (
                  <button type="button" className="pl-btn pl-btn-sm" onClick={() => setEditando(true)}>
                    Informar na mão
                  </button>
                )}
              </div>
              {erroDaLeitura ? (
                <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--pl-warn)' }}>
                  {erroDaLeitura}
                </p>
              ) : null}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Fato({ rotulo, valor, ausente = false }) {
  return (
    <div>
      <p className="pl-eyebrow" style={{ margin: 0 }}>{rotulo}</p>
      <p
        className="pl-num"
        style={{ margin: '2px 0 0', fontSize: 20, color: ausente ? 'var(--pl-ink-4)' : 'var(--pl-ink)' }}
      >
        {valor}
      </p>
    </div>
  );
}
