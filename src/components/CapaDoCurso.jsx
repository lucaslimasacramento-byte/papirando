import React from 'react';
import { storageBanner } from '../lib/imageUrl';
import { capaDoCurso } from '../lib/personalizacaoCurso';

// A capa do curso como destaque, com conteudo por cima.
//
// A capa vinha sendo uma tarja decorativa no alto do cartao: a foto ficava ali, e logo abaixo
// comecava outro bloco com o brasao, o cargo e o nome. Duas faixas empilhadas sem relacao —
// a capa nao era a cara do curso, era um enfeite antes dele.
//
// Aqui ela vira o proprio cabecalho: a identidade fica POR CIMA da imagem. Isso exige um
// veu (scrim), porque o aluno sobe a foto que quiser e texto branco sobre ceu claro some.
// O degrade escurece so a base, que e onde o texto vai — o topo da foto continua limpo.
export default function CapaDoCurso({
  curso,
  altura = 168,
  children,
  aoClicar = null,
  // Onde o conteudo se apoia. 'base' para titulo e brasao; 'entre' quando ha algo no topo
  // (selos, acoes) e algo embaixo.
  ancora = 'base',
}) {
  const capa = capaDoCurso(curso);
  const temImagem = capa.tipo === 'imagem';

  return (
    <div
      onClick={aoClicar || undefined}
      style={{
        position: 'relative',
        height: altura,
        flexShrink: 0,
        overflow: 'hidden',
        background: capa.gradiente,
        cursor: aoClicar ? 'pointer' : undefined,
      }}
    >
      {temImagem && (
        <img
          src={storageBanner(capa.url)}
          alt=""
          loading="lazy"
          decoding="async"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'cover',
            // Qual faixa da imagem aparece — escolha do aluno no modal de personalizacao.
            objectPosition: capa.enquadramento,
          }}
        />
      )}

      {/* O veu. Sobre foto ele precisa ser mais forte na base (texto branco em cima de
          qualquer imagem); sobre o degrade de cor, um toque so, para o texto nao brigar
          com o tom claro do gradiente. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: temImagem
            ? 'linear-gradient(to top, rgba(12,10,8,0.88) 0%, rgba(12,10,8,0.62) 32%, rgba(12,10,8,0.18) 62%, rgba(12,10,8,0.10) 100%)'
            : 'linear-gradient(to top, rgba(12,10,8,0.34) 0%, rgba(12,10,8,0.06) 60%, transparent 100%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: ancora === 'entre' ? 'space-between' : 'flex-end',
          padding: '12px 16px',
          gap: 8,
          // Explicito de proposito: `height: 100%` mais padding so cabe na capa porque o
          // reset global define border-box. Depender disso deixaria o conteudo vazar para
          // fora da capa em qualquer contexto sem o reset — e vazar aqui significa o nome do
          // curso cair no corpo branco do cartao, fora do veu que o torna legivel.
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </div>
  );
}
