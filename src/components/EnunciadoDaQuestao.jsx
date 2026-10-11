import React, { useMemo, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { blocosDoEnunciado } from '../lib/textoDaQuestao';

// O enunciado desenhado: parágrafo é parágrafo, figura é figura.
//
// Antes isto era uma única linha — `<p>{question.statement}</p>` — e o markdown ia inteiro
// para a tela. Em questão de matemática do ENEM o gráfico É a questão: sem ele o aluno lia
// "O gráfico apresenta a massa corporal" seguido de uma URL e não tinha como responder.
function Figura({ url, alt }) {
  const [quebrada, setQuebrada] = useState(false);

  if (quebrada) {
    // A figura some de vez em quando (link da fonte muda, CDN fora do ar). Um aviso explícito
    // vale mais do que um espaço em branco: o aluno entende que falta algo e pula a questão
    // em vez de achar que ela não tem resposta.
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0',
          borderRadius: 8, border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-bg-soft)',
          padding: '12px 14px', fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)',
          fontFamily: 'var(--pl-sans)',
        }}
      >
        <ImageOff size={15} />
        A imagem desta questão não está disponível.
      </div>
    );
  }

  return (
    <figure style={{ margin: '14px 0' }}>
      <img
        src={url}
        alt={alt || 'Figura da questão'}
        loading="lazy"
        decoding="async"
        onError={() => setQuebrada(true)}
        style={{
          display: 'block', maxWidth: '100%', height: 'auto', margin: '0 auto',
          borderRadius: 8, border: '1px solid var(--pl-rule)', background: 'white',
        }}
      />
      {alt ? (
        <figcaption style={{ marginTop: 6, textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>
          {alt}
        </figcaption>
      ) : null}
    </figure>
  );
}

export default function EnunciadoDaQuestao({ enunciado, imagem = '', fontSize = 14 }) {
  const blocos = useMemo(() => blocosDoEnunciado(enunciado, imagem), [enunciado, imagem]);

  if (blocos.length === 0) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      {blocos.map((bloco, indice) => (
        bloco.tipo === 'figura' ? (
          <Figura key={`figura-${bloco.url}-${indice}`} url={bloco.url} alt={bloco.alt} />
        ) : (
          <p
            key={`paragrafo-${indice}`}
            style={{
              margin: indice === 0 ? 0 : '10px 0 0',
              fontSize, fontWeight: 500, lineHeight: 1.6,
              color: 'var(--pl-ink-2)', fontFamily: 'var(--pl-sans)',
            }}
          >
            {bloco.texto}
          </p>
        )
      ))}
    </div>
  );
}
