import React, { useMemo, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { blocosDoEnunciado } from '../lib/textoDaQuestao';

// O enunciado desenhado: parágrafo é parágrafo, figura é figura.
//
// Antes isto era uma única linha — `<p>{question.statement}</p>` — e o markdown ia inteiro
// para a tela. Em questão de matemática do ENEM o gráfico É a questão: sem ele o aluno lia
// "O gráfico apresenta a massa corporal" seguido de uma URL e não tinha como responder.
//
// A figura é o elemento ELÁSTICO do cartão. Um teto fixo (300px, 30vh) não resolve o
// problema real, que é "a questão inteira tem de caber na tela sem rolagem": o que sobra
// para a figura depende do tamanho do enunciado, de quantas alternativas existem e da altura
// da janela — três variáveis que nenhum número escrito à mão acerta em todos os casos. Aqui
// a figura recebe `flex: 1` dentro de uma coluna de altura limitada e fica exatamente com o
// que sobrou, encolhendo sem distorcer (`object-fit: contain`).

// Abaixo disto o gráfico deixa de ser legível, e a rolagem passa a ser o mal menor.
const ALTURA_MINIMA_DA_FIGURA = 132;

// Depois de responder, a figura cede espaço. O aluno já leu o gráfico; o que ele precisa
// agora é do comentário, e disputar altura com ele faria o cartão rolar justamente quando
// há mais o que ler.
const ALTURA_DA_FIGURA_RESPONDIDA = 110;

function Figura({ url, alt, elastica, compacta }) {
  const [quebrada, setQuebrada] = useState(false);

  if (quebrada) {
    // A figura some de vez em quando (link da fonte muda, CDN fora do ar). Um aviso explícito
    // vale mais do que um espaço em branco: o aluno entende que falta algo e pula a questão
    // em vez de achar que ela não tem resposta.
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0', flexShrink: 0,
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
    <figure
      style={{
        margin: '10px 0',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        // `minHeight: 0` é o que permite encolher: sem ele um item de flex nunca fica menor
        // do que o próprio conteúdo, e a imagem empurraria as alternativas para fora da tela.
        ...(compacta
          ? { flex: '0 0 auto', height: ALTURA_DA_FIGURA_RESPONDIDA }
          : elastica
            ? { flex: '1 1 auto', minHeight: ALTURA_MINIMA_DA_FIGURA }
            : { flexShrink: 0 }),
      }}
    >
      <img
        src={url}
        alt={alt || 'Figura da questão'}
        loading="lazy"
        decoding="async"
        onError={() => setQuebrada(true)}
        style={{
          display: 'block',
          maxWidth: '100%',
          maxHeight: '100%',
          minHeight: 0,
          width: 'auto',
          objectFit: 'contain',
          borderRadius: 8, border: '1px solid var(--pl-rule)', background: 'white',
        }}
      />
      {alt ? (
        <figcaption style={{ marginTop: 6, flexShrink: 0, textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>
          {alt}
        </figcaption>
      ) : null}
    </figure>
  );
}

export default function EnunciadoDaQuestao({ enunciado, imagem = '', fontSize = 13.5, compacto = false }) {
  const blocos = useMemo(() => blocosDoEnunciado(enunciado, imagem), [enunciado, imagem]);

  if (blocos.length === 0) return null;

  // Só faz sentido esticar quando há exatamente uma figura. Com duas ou mais, dividir o
  // espaço entre elas deixaria as duas pequenas demais — ali a rolagem é a resposta certa.
  const figuras = blocos.filter((bloco) => bloco.tipo === 'figura').length;
  const elastica = figuras === 1;

  return (
    <div
      style={{
        marginBottom: 10,
        display: 'flex', flexDirection: 'column',
        // NÃO colocar `min-height: 0` aqui. Parece inofensivo — é o que se usa para deixar
        // um item de flex encolher — mas aqui ele desliga a proteção que impede o bloco de
        // ficar MENOR do que o próprio conteúdo. Quando o comentário da resposta aparecia e
        // apertava a coluna, o enunciado era espremido abaixo do tamanho dos seus parágrafos,
        // que não encolhem, e eles transbordavam desenhando POR CIMA das alternativas.
        //
        // Sem ele, o piso do bloco é: parágrafos + a altura mínima da figura. Quando sobra
        // espaço, a figura cresce e ocupa o que sobrou; quando não sobra, o cartão rola — que
        // é o comportamento certo, e não a sobreposição.
        flex: elastica && !compacto ? '1 1 auto' : '0 0 auto',
      }}
    >
      {blocos.map((bloco, indice) => (
        bloco.tipo === 'figura' ? (
          <Figura key={`figura-${bloco.url}-${indice}`} url={bloco.url} alt={bloco.alt} elastica={elastica} compacta={compacto} />
        ) : (
          <p
            key={`paragrafo-${indice}`}
            style={{
              margin: indice === 0 ? 0 : '8px 0 0',
              flexShrink: 0,
              fontSize, fontWeight: 500, lineHeight: 1.55,
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
