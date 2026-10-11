import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GripHorizontal, Pencil, Eraser, Type, Undo2, Trash2, X } from 'lucide-react';
import {
  LAPIS, BORRACHA, TEXTO, CORES, ESPESSURAS, TAMANHO_DO_TEXTO,
  corDoTema, fonteDoTema,
  folhaVazia, estaVazia, iniciarTraco, comPonto, textoEm, adicionar, desfazer,
  posicaoPermitida, tamanhoPermitido, posicaoInicial,
  folhaDaQuestao, guardarFolha, janelaGuardada, guardarJanela,
} from '../lib/rascunho';

// A folha de rascunho que flutua sobre a questão.
//
// É janela, não modal: modal escurece o fundo e bloqueia o que está atrás — e o que está
// atrás é justamente o enunciado que o aluno precisa ler enquanto faz a conta. Por isso ela
// arrasta, redimensiona e nunca trava a tela.

const TAMANHO_PADRAO = { largura: 380, altura: 340 };

function janelaAtual() {
  return {
    largura: typeof window === 'undefined' ? 1200 : window.innerWidth,
    altura: typeof window === 'undefined' ? 800 : window.innerHeight,
  };
}

// Redesenha a folha inteira. É chamado ao desfazer, ao limpar e ao redimensionar — nunca a
// cada movimento do ponteiro, que desenha direto por cima para não engasgar.
function pintar(contexto, folha, largura, altura, elemento) {
  contexto.clearRect(0, 0, largura, altura);
  folha.marcas.forEach((marca) => {
    if (marca.tipo === 'texto') {
      contexto.save();
      contexto.globalCompositeOperation = 'source-over';
      contexto.fillStyle = corDoTema(elemento, marca.cor);
      // `var(--pl-sans)` numa string de fonte de canvas é inválido, e atribuição inválida é
      // ignorada em silêncio: a fonte ficava no padrão de 10px e o texto saía minúsculo.
      contexto.font = fonteDoTema(elemento, marca.tamanho);
      contexto.textBaseline = 'middle';
      contexto.fillText(marca.texto, marca.x, marca.y);
      contexto.restore();
      return;
    }
    pintarTraco(contexto, marca, elemento);
  });
}

function pintarTraco(contexto, traco, elemento) {
  const cor = corDoTema(elemento, traco.cor);
  contexto.save();
  // A borracha apaga de verdade (destination-out) em vez de pintar de branco: pintar de
  // branco deixaria um rastro visível se o fundo da folha mudar, no tema escuro por exemplo.
  contexto.globalCompositeOperation = traco.ferramenta === BORRACHA ? 'destination-out' : 'source-over';
  contexto.strokeStyle = cor;
  contexto.fillStyle = cor;
  contexto.lineWidth = traco.espessura;
  contexto.lineCap = 'round';
  contexto.lineJoin = 'round';

  const pontos = traco.pontos;
  if (pontos.length === 1) {
    // Clique sem arrastar: um ponto redondo. Sem isto o clique não deixaria marca nenhuma.
    contexto.beginPath();
    contexto.arc(pontos[0].x, pontos[0].y, traco.espessura / 2, 0, Math.PI * 2);
    contexto.fill();
    contexto.restore();
    return;
  }

  contexto.beginPath();
  contexto.moveTo(pontos[0].x, pontos[0].y);
  pontos.slice(1).forEach((ponto) => contexto.lineTo(ponto.x, ponto.y));
  contexto.stroke();
  contexto.restore();
}

export default function Rascunho({ questaoId, aoFechar }) {
  // A folha vem da questão; o lugar e o tamanho da janela vêm do aluno. Ver os comentários
  // em src/lib/rascunho.js sobre por que são duas memórias separadas.
  const janela = janelaGuardada();

  const [folha, setFolha] = useState(() => folhaDaQuestao(questaoId) || folhaVazia());
  const [tamanho, setTamanho] = useState(() => janela?.tamanho || TAMANHO_PADRAO);
  const [posicao, setPosicao] = useState(() => janela?.posicao || posicaoInicial(janelaAtual(), janela?.tamanho || TAMANHO_PADRAO));
  const [ferramenta, setFerramenta] = useState(LAPIS);
  const [cor, setCor] = useState(CORES[0].token);
  const [espessura, setEspessura] = useState(ESPESSURAS[1].valor);
  const [escrevendo, setEscrevendo] = useState(null);

  const telaRef = useRef(null);
  const contextoRef = useRef(null);
  const tracoRef = useRef(null);
  const arrasteRef = useRef(null);

  // O que o aluno rabiscou volta se ele reabrir o rascunho na mesma questão.
  useEffect(() => {
    guardarFolha(questaoId, folha);
  }, [questaoId, folha]);

  useEffect(() => {
    guardarJanela(posicao, tamanho);
  }, [posicao, tamanho]);

  const areaDoDesenho = useCallback(() => ({
    largura: tamanho.largura,
    // A barra de ferramentas e o cabeçalho ficam fora da folha.
    altura: tamanho.altura - 84,
  }), [tamanho]);

  // O canvas é redimensionado pela densidade da tela, senão o traço sai borrado em telas
  // retina. `useLayoutEffect` porque o repinte tem de acontecer antes de o quadro aparecer:
  // com `useEffect` a folha pisca em branco a cada redimensionamento.
  useLayoutEffect(() => {
    const tela = telaRef.current;
    if (!tela) return;

    const { largura, altura } = areaDoDesenho();
    const densidade = typeof window === 'undefined' ? 1 : (window.devicePixelRatio || 1);

    tela.width = Math.max(1, Math.round(largura * densidade));
    tela.height = Math.max(1, Math.round(altura * densidade));
    tela.style.width = `${largura}px`;
    tela.style.height = `${altura}px`;

    const contexto = tela.getContext('2d');
    contexto.setTransform(densidade, 0, 0, densidade, 0, 0);
    contextoRef.current = contexto;

    pintar(contexto, folha, largura, altura, tela);
  }, [areaDoDesenho, folha]);

  // Se a janela do navegador encolher, a folha não pode ficar fora da tela.
  useEffect(() => {
    function aoRedimensionar() {
      const janela = janelaAtual();
      setTamanho((atual) => tamanhoPermitido(atual, janela));
      setPosicao((atual) => posicaoPermitida(atual, tamanho, janela));
    }
    window.addEventListener('resize', aoRedimensionar);
    return () => window.removeEventListener('resize', aoRedimensionar);
  }, [tamanho]);

  // Esc fecha. É o gesto que todo mundo tenta primeiro numa janela flutuante.
  useEffect(() => {
    function aoTeclar(evento) {
      if (evento.key === 'Escape' && !escrevendo) aoFechar?.();
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aoFechar, escrevendo]);

  function pontoDoEvento(evento) {
    const area = telaRef.current.getBoundingClientRect();
    return { x: evento.clientX - area.left, y: evento.clientY - area.top };
  }

  function comecarTraco(evento) {
    if (evento.button !== undefined && evento.button !== 0) return;

    // Sem isto a caixa de texto nasce e morre no mesmo clique: depois do nosso handler o
    // navegador roda o foco padrão do `pointerdown`, tira o foco do campo que acabou de
    // aparecer, o `onBlur` dispara e a caixa some antes de o aluno digitar a primeira letra.
    // Também evita o arrasto de seleção durante o traço.
    evento.preventDefault();

    const ponto = pontoDoEvento(evento);

    if (ferramenta === TEXTO) {
      setEscrevendo({ x: ponto.x, y: ponto.y, texto: '' });
      return;
    }

    evento.currentTarget.setPointerCapture?.(evento.pointerId);
    tracoRef.current = iniciarTraco({ ferramenta, cor, espessura, ponto });
    pintarTraco(contextoRef.current, tracoRef.current, telaRef.current);
  }

  function seguirTraco(evento) {
    if (!tracoRef.current) return;
    const anterior = tracoRef.current;
    tracoRef.current = comPonto(anterior, pontoDoEvento(evento));
    // Desenha só o segmento novo: repintar a folha inteira a cada movimento engasga o traço.
    pintarTraco(contextoRef.current, {
      ...anterior,
      pontos: tracoRef.current.pontos.slice(-2),
    }, telaRef.current);
  }

  function encerrarTraco() {
    if (!tracoRef.current) return;
    const traco = tracoRef.current;
    tracoRef.current = null;
    setFolha((atual) => adicionar(atual, traco));
  }

  function confirmarTexto() {
    if (!escrevendo) return;
    const marca = textoEm({ cor, x: escrevendo.x, y: escrevendo.y, texto: escrevendo.texto });
    setEscrevendo(null);
    if (marca) setFolha((atual) => adicionar(atual, marca));
  }

  function comecarArraste(evento, modo) {
    evento.preventDefault();
    arrasteRef.current = {
      modo,
      x: evento.clientX,
      y: evento.clientY,
      posicao: { ...posicao },
      tamanho: { ...tamanho },
    };

    function mover(movimento) {
      const inicio = arrasteRef.current;
      if (!inicio) return;
      const dx = movimento.clientX - inicio.x;
      const dy = movimento.clientY - inicio.y;
      const janela = janelaAtual();

      if (inicio.modo === 'mover') {
        setPosicao(posicaoPermitida(
          { x: inicio.posicao.x + dx, y: inicio.posicao.y + dy },
          inicio.tamanho,
          janela
        ));
        return;
      }

      setTamanho(tamanhoPermitido(
        { largura: inicio.tamanho.largura + dx, altura: inicio.tamanho.altura + dy },
        janela
      ));
    }

    function soltar() {
      arrasteRef.current = null;
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
    }

    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  }

  const area = areaDoDesenho();

  return (
    <div
      role="dialog"
      aria-label="Rascunho da questão"
      style={{
        position: 'fixed', left: posicao.x, top: posicao.y, zIndex: 80,
        width: tamanho.largura, height: tamanho.altura,
        display: 'flex', flexDirection: 'column',
        borderRadius: 12, overflow: 'hidden',
        background: 'var(--pl-surface)',
        border: '1px solid var(--pl-rule-strong)',
        boxShadow: 'var(--pl-sh-high)',
        boxSizing: 'border-box',
      }}
    >
      {/* Barra de título: a área que arrasta. `touch-action: none` é o que faz o arraste
          funcionar no toque — sem ele o navegador rola a página em vez de mover a janela. */}
      <div
        onPointerDown={(evento) => comecarArraste(evento, 'mover')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
          padding: '6px 8px 6px 10px',
          background: 'var(--pl-bg-soft)',
          borderBottom: '1px solid var(--pl-rule)',
          cursor: 'grab', touchAction: 'none', userSelect: 'none',
        }}
      >
        <GripHorizontal size={14} style={{ color: 'var(--pl-ink-4)' }} />
        <span style={{ flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-sans)' }}>
          Rascunho
        </span>
        <button
          type="button"
          onPointerDown={(evento) => evento.stopPropagation()}
          onClick={aoFechar}
          aria-label="Fechar rascunho"
          style={{ display: 'inline-flex', height: 24, width: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--pl-ink-3)', cursor: 'pointer' }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, flexWrap: 'wrap', padding: '5px 8px', borderBottom: '1px solid var(--pl-rule)' }}>
        <Ferramenta ativa={ferramenta === LAPIS} titulo="Desenhar" onClick={() => setFerramenta(LAPIS)}><Pencil size={13} /></Ferramenta>
        <Ferramenta ativa={ferramenta === TEXTO} titulo="Escrever" onClick={() => setFerramenta(TEXTO)}><Type size={13} /></Ferramenta>
        <Ferramenta ativa={ferramenta === BORRACHA} titulo="Apagar" onClick={() => setFerramenta(BORRACHA)}><Eraser size={13} /></Ferramenta>

        <span style={{ width: 1, height: 18, margin: '0 3px', background: 'var(--pl-rule-2)' }} />

        {CORES.map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            title={opcao.nome}
            onClick={() => { setCor(opcao.token); if (ferramenta === BORRACHA) setFerramenta(LAPIS); }}
            style={{
              height: 18, width: 18, borderRadius: '50%', cursor: 'pointer', padding: 0,
              background: `var(${opcao.token})`,
              border: cor === opcao.token ? '2px solid var(--pl-ink)' : '2px solid transparent',
              outline: cor === opcao.token ? '1px solid var(--pl-rule-strong)' : 'none',
            }}
          />
        ))}

        <span style={{ width: 1, height: 18, margin: '0 3px', background: 'var(--pl-rule-2)' }} />

        {ESPESSURAS.map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            title={`Traço ${opcao.id}`}
            onClick={() => setEspessura(opcao.valor)}
            style={{
              display: 'inline-flex', height: 22, width: 22, alignItems: 'center', justifyContent: 'center',
              borderRadius: 6, cursor: 'pointer', padding: 0,
              border: espessura === opcao.valor ? '1px solid var(--pl-accent)' : '1px solid transparent',
              background: espessura === opcao.valor ? 'var(--pl-accent-soft)' : 'transparent',
            }}
          >
            <span style={{ display: 'block', height: opcao.valor, width: opcao.valor, borderRadius: '50%', background: 'var(--pl-ink-2)' }} />
          </button>
        ))}

        <span style={{ flex: 1 }} />

        <Ferramenta titulo="Desfazer" desabilitada={estaVazia(folha)} onClick={() => setFolha(desfazer(folha))}><Undo2 size={13} /></Ferramenta>
        <Ferramenta titulo="Limpar tudo" desabilitada={estaVazia(folha)} onClick={() => setFolha(folhaVazia())}><Trash2 size={13} /></Ferramenta>
      </div>

      {/* A folha é branca, não bege: ela tem de parecer papel em branco e se separar do
          resto da janela. A borracha apaga para transparente, então o fundo aparece por
          baixo — e por isso ele é definido aqui, e não pintado no canvas. */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, background: 'var(--pl-surface)' }}>
        <canvas
          ref={telaRef}
          onPointerDown={comecarTraco}
          onPointerMove={seguirTraco}
          onPointerUp={encerrarTraco}
          onPointerLeave={encerrarTraco}
          onPointerCancel={encerrarTraco}
          style={{
            display: 'block',
            cursor: ferramenta === TEXTO ? 'text' : 'crosshair',
            touchAction: 'none',
          }}
        />

        {escrevendo ? (
          <input
            autoFocus
            value={escrevendo.texto}
            onChange={(evento) => setEscrevendo({ ...escrevendo, texto: evento.target.value })}
            onBlur={confirmarTexto}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') confirmarTexto();
              if (evento.key === 'Escape') setEscrevendo(null);
            }}
            placeholder="Escreva e tecle Enter"
            style={{
              position: 'absolute',
              left: Math.min(escrevendo.x, Math.max(0, area.largura - 160)),
              top: Math.max(0, escrevendo.y - TAMANHO_DO_TEXTO),
              width: 160,
              border: '1px solid var(--pl-accent)', borderRadius: 4,
              background: 'var(--pl-surface)', padding: '2px 5px',
              fontSize: TAMANHO_DO_TEXTO - 2, fontWeight: 600, color: `var(${cor})`,
              fontFamily: 'var(--pl-sans)', outline: 'none',
            }}
          />
        ) : null}
      </div>

      {/* Canto de redimensionar. */}
      <div
        onPointerDown={(evento) => comecarArraste(evento, 'tamanho')}
        aria-hidden="true"
        style={{
          position: 'absolute', right: 0, bottom: 0, height: 16, width: 16,
          cursor: 'nwse-resize', touchAction: 'none',
          background: 'linear-gradient(135deg, transparent 50%, var(--pl-rule-strong) 50%, var(--pl-rule-strong) 62%, transparent 62%, transparent 74%, var(--pl-rule-strong) 74%, var(--pl-rule-strong) 86%, transparent 86%)',
        }}
      />
    </div>
  );
}

function Ferramenta({ ativa = false, desabilitada = false, titulo, onClick, children }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      aria-pressed={ativa}
      disabled={desabilitada}
      onClick={onClick}
      style={{
        display: 'inline-flex', height: 24, width: 24, alignItems: 'center', justifyContent: 'center',
        borderRadius: 6, padding: 0,
        border: ativa ? '1px solid var(--pl-accent)' : '1px solid transparent',
        background: ativa ? 'var(--pl-accent-soft)' : 'transparent',
        color: desabilitada ? 'var(--pl-ink-5)' : (ativa ? 'var(--pl-accent)' : 'var(--pl-ink-2)'),
        cursor: desabilitada ? 'not-allowed' : 'pointer',
        opacity: desabilitada ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
