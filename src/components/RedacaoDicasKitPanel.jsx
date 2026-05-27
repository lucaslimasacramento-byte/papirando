import React from 'react';
import { Eye, LayoutTemplate, Lightbulb, Link2, Quote } from 'lucide-react';
import { getDefaultRedacaoKitBundle } from '../lib/redacaoKitMerge';

function KitDetails({ title, badge, children, defaultOpen = false }) {
  return (
    <details
      style={{
        width: '100%',
        borderRadius: 16,
        border: '1px solid var(--pl-rule-2)',
        background: 'var(--pl-surface)',
        boxShadow: 'var(--pl-sh-low)',
        transition: 'box-shadow 0.15s',
      }}
      open={defaultOpen}
    >
      <summary
        style={{
          display: 'flex',
          cursor: 'pointer',
          listStyle: 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '16px 20px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, color: 'var(--pl-ink)' }}>{title}</p>
          {badge ? (
            <p
              style={{
                marginTop: 4,
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--pl-ink-3)',
              }}
            >
              {badge}
            </p>
          ) : null}
        </div>
        <span
          className="kit-details-toggle"
          style={{
            flexShrink: 0,
            borderRadius: 999,
            border: '1px solid var(--pl-rule-2)',
            background: 'var(--pl-bg-soft)',
            padding: '4px 10px',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--pl-ink-2)',
          }}
        >
          {/* JS-free open/close label handled by CSS :is(details[open]) or kept static */}
          Abrir / Recolher
        </span>
      </summary>
      <div style={{ borderTop: '1px solid var(--pl-rule)', padding: '8px 20px 20px' }}>{children}</div>
    </details>
  );
}

function SectionHeading({ step, icon: Icon, title, description, headingId }) {
  return (
    <header
      style={{
        marginBottom: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            fontFamily: 'var(--pl-mono)',
            fontSize: 11,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--pl-accent)',
          }}
        >
          {step}
        </span>
        <div
          style={{
            display: 'flex',
            width: 44,
            height: 44,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
            border: '1px solid var(--pl-rule-2)',
            background: 'var(--pl-surface)',
            color: 'var(--pl-ink-2)',
            boxShadow: 'var(--pl-sh-low)',
          }}
        >
          <Icon size={22} strokeWidth={2} />
        </div>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h3
          id={headingId}
          style={{
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--pl-ink)',
          }}
        >
          {title}
        </h3>
        {description ? (
          <p
            style={{
              marginTop: 6,
              maxWidth: 672,
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.6,
              color: 'var(--pl-ink-2)',
            }}
          >
            {description}
          </p>
        ) : null}
      </div>
    </header>
  );
}

/**
 * @param {object} props
 * @param {object} [props.bundle]
 * @param {Array<{ id: string, title: string, body?: string }>} [props.expertTips]
 * @param {(tip: object) => void} [props.onOpenExpert]
 */
export function RedacaoDicasKitPanel({ bundle: bundleProp, expertTips = [], onOpenExpert }) {
  const bundle = bundleProp && typeof bundleProp === 'object' ? bundleProp : getDefaultRedacaoKitBundle();
  const conectivos = bundle.conectivos;
  const frases = bundle.frasesProntas;
  const modelos = bundle.modelos;
  const tips = Array.isArray(expertTips) ? expertTips.filter((t) => t?.title) : [];

  return (
    <article style={{ marginLeft: 'auto', marginRight: 'auto', width: '100%', maxWidth: 768, paddingBottom: 8 }}>
      {/* Conectivos */}
      <section style={{ scrollMarginTop: 24 }} aria-labelledby="dicas-conectivos">
        <SectionHeading
          step="01"
          icon={Link2}
          title="Conectivos"
          headingId="dicas-conectivos"
          description="Organizados por funcao na prova. Abra so o grupo que for usar naquele paragrafo — o conteudo desce inteiro na pagina, sem caixa rolante."
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {conectivos.map((bloco, i) => (
            <KitDetails key={bloco.id} title={`${bloco.emoji} ${bloco.titulo}`} defaultOpen={i === 0}>
              <ol
                style={{
                  marginTop: 4,
                  paddingLeft: 2,
                  fontSize: 14,
                  fontWeight: 500,
                  lineHeight: 1.6,
                  color: 'var(--pl-ink)',
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {bloco.itens.map((linha, idx) => (
                  <li key={linha} style={{ display: 'flex', gap: 12 }}>
                    <span
                      style={{
                        width: 24,
                        flexShrink: 0,
                        textAlign: 'right',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--pl-ink-3)',
                      }}
                    >
                      {idx + 1}.
                    </span>
                    <span>{linha}</span>
                  </li>
                ))}
              </ol>
            </KitDetails>
          ))}
        </div>
      </section>

      {/* Frases prontas */}
      <section
        style={{ scrollMarginTop: 24, borderTop: '1px solid var(--pl-rule-2)', paddingTop: 64, marginTop: 64 }}
        aria-labelledby="dicas-frases"
      >
        <SectionHeading
          step="02"
          icon={Quote}
          title="Frases prontas"
          headingId="dicas-frases"
          description="Substitua [TEMA] e complete os colchetes com seguranca. Treine encaixando no seu tempo — tudo visivel ao expandir o cartao."
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {frases.map((bloco, i) => (
            <KitDetails key={bloco.id} title={`${bloco.emoji} ${bloco.titulo}`} defaultOpen={i === 0}>
              <ol
                style={{
                  marginTop: 4,
                  paddingLeft: 2,
                  fontSize: 14,
                  fontWeight: 500,
                  lineHeight: 1.6,
                  color: 'var(--pl-ink)',
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {bloco.itens.map((linha, idx) => (
                  <li key={linha} style={{ display: 'flex', gap: 12 }}>
                    <span
                      style={{
                        width: 24,
                        flexShrink: 0,
                        textAlign: 'right',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--pl-ink-3)',
                      }}
                    >
                      {idx + 1}.
                    </span>
                    <span>{linha}</span>
                  </li>
                ))}
              </ol>
            </KitDetails>
          ))}
        </div>
      </section>

      {/* Modelos decoraveis */}
      <section
        style={{ scrollMarginTop: 24, borderTop: '1px solid var(--pl-rule-2)', paddingTop: 64, marginTop: 64 }}
        aria-labelledby="dicas-modelos"
      >
        <SectionHeading
          step="03"
          icon={LayoutTemplate}
          title="Modelos decoraveis"
          headingId="dicas-modelos"
          description="Troque os colchetes, leia em voz alta e adapte ao tema. O texto do modelo aparece completo abaixo — role a pagina do app, nao um bloco interno."
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {modelos.map((m, i) => (
            <KitDetails key={m.id} title={m.titulo} badge={m.badge} defaultOpen={i === 0}>
              <pre
                style={{
                  marginTop: 4,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  borderRadius: 16,
                  border: '1px solid var(--pl-rule)',
                  background: 'var(--pl-bg-soft)',
                  padding: 16,
                  fontFamily: 'var(--pl-sans)',
                  fontSize: 13,
                  fontWeight: 500,
                  lineHeight: 1.65,
                  color: 'var(--pl-ink)',
                }}
              >
                {m.corpo}
              </pre>
            </KitDetails>
          ))}
        </div>
      </section>

      {/* Dicas extras */}
      <section
        style={{ scrollMarginTop: 24, borderTop: '1px solid var(--pl-rule-2)', paddingTop: 64, marginTop: 64 }}
        aria-labelledby="dicas-extras"
      >
        <SectionHeading
          step="04"
          icon={Lightbulb}
          title="Dicas extras"
          headingId="dicas-extras"
          description={
            tips.length
              ? 'Publicadas em Admin → Configuracoes → Redacoes · dicas. Toque para ler o texto completo.'
              : 'Cadastre em Admin → Configuracoes → Redacoes · dicas. O kit (conectivos, frases e modelos) edita-se em Redacoes · dados, em formulario estruturado.'
          }
        />
        {tips.length === 0 ? (
          <p
            style={{
              borderRadius: 16,
              border: '1px dashed var(--pl-rule-2)',
              background: 'var(--pl-bg-soft)',
              padding: '32px 20px',
              textAlign: 'center',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--pl-ink-2)',
            }}
          >
            Nenhuma dica extra no servidor ainda.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            {tips.map((tip) => (
              <button
                key={tip.id}
                type="button"
                onClick={() => onOpenExpert?.(tip)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 12,
                  borderRadius: 16,
                  border: '1px solid var(--pl-rule-2)',
                  background: 'var(--pl-surface)',
                  padding: 20,
                  textAlign: 'left',
                  boxShadow: 'var(--pl-sh-low)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--pl-accent)';
                  e.currentTarget.style.boxShadow = 'var(--pl-sh-mid)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--pl-rule-2)';
                  e.currentTarget.style.boxShadow = 'var(--pl-sh-low)';
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 999,
                    border: '1px solid var(--pl-accent-soft)',
                    background: 'var(--pl-accent-soft)',
                    padding: '2px 10px',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--pl-accent)',
                  }}
                >
                  <Lightbulb size={12} strokeWidth={2.2} />
                  Especialista
                </span>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    color: 'var(--pl-ink)',
                  }}
                >
                  {tip.title}
                </span>
                <span
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    fontSize: 14,
                    fontWeight: 500,
                    lineHeight: 1.6,
                    color: 'var(--pl-ink-2)',
                  }}
                >
                  {tip.body || 'Ver conteudo'}
                </span>
                <span
                  style={{
                    marginTop: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--pl-accent)',
                  }}
                >
                  <Eye size={16} strokeWidth={2.2} />
                  Abrir
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
