import React from 'react';
import { Palette } from 'lucide-react';
import { AREA_LOGOS, COURSE_LOGOS } from '../lib/courseLogos';

// ─── Guia de Design — sistema de logos dos cursos ──────────────────────────────
// Documentação viva: como entender, manter e expandir os ícones SVG dos cursos.

const AREAS = [
  { nome: 'Educação', traco: '#4ade80', fundo: '#071408' },
  { nome: 'Artes e Humanidades', traco: '#fbbf24', fundo: '#181200' },
  { nome: 'Ciências Sociais, Comunicação e Informação', traco: '#f472b6', fundo: '#160710' },
  { nome: 'Negócios, Administração e Direito', traco: '#fbbf24', fundo: '#171000' },
  { nome: 'Ciências Naturais, Matemática e Estatística', traco: '#93c5fd', fundo: '#040c1e' },
  { nome: 'Computação e TIC', traco: '#60a5fa', fundo: '#091624' },
  { nome: 'Engenharia, Produção e Construção', traco: '#fb923c', fundo: '#180d00' },
  { nome: 'Agricultura, Silvicultura, Pesca e Veterinária', traco: '#86efac', fundo: '#081408' },
  { nome: 'Saúde e Bem-estar', traco: '#2dd4bf', fundo: '#061b1a' },
  { nome: 'Serviços', traco: '#a78bfa', fundo: '#0d0c1a' },
];

const REGRAS = [
  { attr: 'stroke-width', valor: '1.5', quando: 'Use 1.8 ou 2 em 1–2 traços principais de destaque' },
  { attr: 'stroke-linecap', valor: 'round', quando: 'Sempre' },
  { attr: 'stroke-linejoin', valor: 'round', quando: 'Sempre' },
  { attr: 'fill de áreas', valor: 'fill-opacity 0.12 a 0.30', quando: 'Até 0.4 em shapes pequenos de destaque' },
  { attr: 'Área segura', valor: 'de 8 a 40 (x e y)', quando: 'Até 6/42 em pontas finas' },
  { attr: 'Centro', valor: 'cx="24" cy="24"', quando: 'Ponto de referência central' },
];

const PASSOS_CURSO = [
  { n: 1, t: 'Cadastre o curso no catálogo', d: 'Admin → Catálogo → Faculdade → "Novo curso". O nome precisa ser exato (é a chave do logo).' },
  { n: 2, t: 'Desenhe o SVG 48×48', d: 'Use as cores da área correspondente (tabela acima). Centralize em cx/cy 24.' },
  { n: 3, t: 'Adicione o logo ao mapa', d: 'Em src/lib/courseLogos.js, adicione "Nome do Curso": s48(fundo, corpoSVG) — ou cole o data URI já pronto.' },
  { n: 4, t: 'Aplique no curso', d: 'O courseTemplates.js preenche imagem_url automaticamente pelo nome. Ou suba a imagem direto no card (modal de edição do curso).' },
];

const FORMAS = [
  { nome: 'Círculo', code: '<circle cx="24" cy="24" r="10"\n  fill="#4ade80" fill-opacity="0.2"\n  stroke="#4ade80" stroke-width="1.5"/>' },
  { nome: 'Linha', code: '<line x1="10" y1="24" x2="38" y2="24"\n  stroke="#4ade80" stroke-width="1.5" stroke-linecap="round"/>' },
  { nome: 'Retângulo', code: '<rect x="12" y="14" width="24" height="20" rx="2"\n  fill="#4ade80" fill-opacity="0.15"\n  stroke="#4ade80" stroke-width="1.5"/>' },
  { nome: 'Path (caminho livre)', code: '<path d="M24 10 L36 18 L36 30 L24 38 L12 30 L12 18 Z"\n  fill="#4ade80" fill-opacity="0.15"\n  stroke="#4ade80" stroke-width="1.5" stroke-linejoin="round"/>' },
  { nome: 'Polilinha (gráfico)', code: '<polyline points="10,35 16,25 22,28 30,16 38,10"\n  stroke="#4ade80" stroke-width="1.8"\n  fill="none" stroke-linecap="round" stroke-linejoin="round"/>' },
  { nome: 'Elipse', code: '<ellipse cx="24" cy="24" rx="13" ry="5"\n  fill="none" stroke="#4ade80" stroke-width="1.5"/>\n<!-- girar: transform="rotate(60 24 24)" -->' },
];

const codeBlock = {
  background: '#1a1510', borderRadius: 10, padding: '16px 18px', overflowX: 'auto',
  margin: '10px 0 4px', fontFamily: 'var(--pl-mono)', fontSize: 12.5, lineHeight: 1.7,
  color: '#e8e0d0', whiteSpace: 'pre',
};

function Mono({ children }) {
  return (
    <code style={{ fontFamily: 'var(--pl-mono)', fontSize: 12.5, background: 'var(--pl-bg-soft)', borderRadius: 4, padding: '2px 6px', color: 'var(--pl-accent)' }}>
      {children}
    </code>
  );
}

function SectionTitle({ n, children }) {
  return (
    <h2 style={{ margin: '40px 0 14px', paddingBottom: 8, borderBottom: '2px solid var(--pl-rule-2)', fontSize: 18, fontWeight: 700, color: 'var(--pl-ink)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--pl-accent)', color: 'var(--pl-bg)', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
      {children}
    </h2>
  );
}

export default function AdminDesign() {
  // amostra de ícones reais para o cabeçalho
  const sample = ['Pedagogia', 'Medicina', 'Engenharia Civil', 'Direito', 'Ciência da Computação', 'Música', 'Agronomia', 'Gastronomia']
    .filter((k) => COURSE_LOGOS[k]);

  return (
    <div className="pl-paper-bg" style={{ padding: '28px 28px 64px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Hero */}
        <div style={{ marginBottom: 28 }}>
          <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Admin · Design</p>
          <h1 className="pl-display" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Palette size={28} style={{ color: 'var(--pl-accent)' }} />
            Guia de criação de logos
          </h1>
          <p style={{ fontSize: 14, color: 'var(--pl-ink-2)', maxWidth: 560, lineHeight: 1.6 }}>
            Como entender, manter e expandir o sistema de ícones SVG dos cursos de faculdade — 100 logos prontos, 10 por área.
          </p>

          {/* amostra de ícones */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
            {sample.map((k) => (
              <div key={k} title={k} style={{ width: 44, height: 44, borderRadius: 10, backgroundImage: `url("${COURSE_LOGOS[k]}")`, backgroundSize: 'cover', boxShadow: 'var(--pl-sh-low)' }} />
            ))}
          </div>
        </div>

        {/* 1. Como funcionam */}
        <SectionTitle n={1}>Como os logos funcionam</SectionTitle>
        <p style={{ fontSize: 14, color: 'var(--pl-ink-2)', lineHeight: 1.7, marginBottom: 8 }}>
          Cada logo é um <strong>SVG de 48×48px</strong> embutido como <Mono>data URI</Mono>. Uma função auxiliar <Mono>s48</Mono> monta o SVG a partir de uma cor de fundo e do corpo do desenho:
        </p>
        <div style={codeBlock}>{`const s48 = (bg, body) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    \`<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" fill="\${bg}"/>
      \${body}
    </svg>\`
  );`}</div>
        <p style={{ fontSize: 13.5, color: 'var(--pl-ink-2)', lineHeight: 1.7, marginTop: 12 }}>
          O resultado vira o <Mono>imagem_url</Mono> do curso (usado como imagem do card). No app, o mapa fica em <Mono>src/lib/courseLogos.js</Mono> e é aplicado por nome em <Mono>src/lib/courseTemplates.js</Mono>.
        </p>

        {/* 2. Paleta por área */}
        <SectionTitle n={2}>Paleta de cores por área</SectionTitle>
        <p style={{ fontSize: 14, color: 'var(--pl-ink-2)', lineHeight: 1.7, marginBottom: 14 }}>
          Cada área tem uma <strong>cor de traço</strong> e uma <strong>cor de fundo</strong> fixas. Use sempre esses valores para manter coerência.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
          {AREAS.map((a) => (
            <div key={a.nome} className="pl-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 9, flexShrink: 0, backgroundImage: AREA_LOGOS[a.nome === 'Computação e TIC' ? 'Computação e TIC' : a.nome] ? `url("${AREA_LOGOS[a.nome]}")` : 'none', backgroundSize: 'cover', background: AREA_LOGOS[a.nome] ? undefined : a.fundo, border: `1.5px solid ${a.traco}` }} />
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--pl-ink)', lineHeight: 1.25 }}>{a.nome}</strong>
                <span style={{ fontSize: 11, color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-mono)' }}>traço {a.traco} · fundo {a.fundo}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 3. Regras visuais */}
        <SectionTitle n={3}>Padrões de desenho (regras visuais)</SectionTitle>
        <div className="pl-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Atributo', 'Valor padrão', 'Quando variar'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '9px 14px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--pl-ink-3)', background: 'var(--pl-bg-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REGRAS.map((r, i) => (
                <tr key={r.attr} style={{ borderTop: i > 0 ? '1px solid var(--pl-rule)' : 'none' }}>
                  <td style={{ padding: '9px 14px' }}><Mono>{r.attr}</Mono></td>
                  <td style={{ padding: '9px 14px', color: 'var(--pl-ink)' }}>{r.valor}</td>
                  <td style={{ padding: '9px 14px', color: 'var(--pl-ink-2)' }}>{r.quando}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ background: 'var(--pl-accent-soft)', borderRadius: 8, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: 'var(--pl-ink-2)', borderLeft: '3px solid var(--pl-accent)' }}>
          <strong style={{ color: 'var(--pl-accent)' }}>Regra de ouro:</strong> o ícone precisa ser reconhecível a 48px e até 22px (tamanho no card). Evite detalhes com menos de 1px de largura visível.
        </div>

        {/* 4. Adicionar curso */}
        <SectionTitle n={4}>Como adicionar um novo curso</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PASSOS_CURSO.map((p) => (
            <div key={p.n} className="pl-card" style={{ padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--pl-accent)', color: 'var(--pl-bg)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{p.n}</span>
              <div>
                <strong style={{ fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)', display: 'block', marginBottom: 3 }}>{p.t}</strong>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--pl-ink-2)', lineHeight: 1.6 }}>{p.d}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={codeBlock}>{`// Em src/lib/courseLogos.js — exemplo para Saúde (traço #2dd4bf, fundo #061b1a):
'Meu Novo Curso': s48('#061b1a',
  '<circle cx="24" cy="20" r="8" fill="#2dd4bf" fill-opacity="0.15" stroke="#2dd4bf" stroke-width="1.5"/>' +
  '<line x1="24" y1="12" x2="24" y2="38" stroke="#2dd4bf" stroke-width="2" stroke-linecap="round"/>'
),`}</div>

        {/* 5. Referência de formas */}
        <SectionTitle n={5}>Referência rápida de formas SVG</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {FORMAS.map((f) => (
            <div key={f.nome}>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{f.nome}</p>
              <div style={{ ...codeBlock, margin: 0, fontSize: 11.5 }}>{f.code}</div>
            </div>
          ))}
        </div>

        {/* 6. Ferramentas */}
        <SectionTitle n={6}>Ferramentas recomendadas</SectionTitle>
        <p style={{ fontSize: 14, color: 'var(--pl-ink-2)', lineHeight: 1.7, marginBottom: 8 }}>
          Para desenhar paths visualmente e copiar o atributo <Mono>d="..."</Mono>, use o <a href="https://yqnn.github.io/svg-path-editor/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pl-accent)', fontWeight: 600 }}>SVG Path Editor</a> (gratuito, configure o viewBox para <Mono>0 0 48 48</Mono>). Para conferir o resultado, cole o SVG no <a href="https://www.svgviewer.dev/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pl-accent)', fontWeight: 600 }}>svgviewer.dev</a>.
        </p>
        <p style={{ fontSize: 13.5, color: 'var(--pl-ink-2)', lineHeight: 1.7 }}>
          Alternativa: desenhe em <strong>Figma</strong> ou <strong>Inkscape</strong> a 48×48px, exporte como SVG e copie só o conteúdo interno (sem o wrapper <Mono>&lt;svg&gt;</Mono>).
        </p>

        <p style={{ marginTop: 44, fontSize: 12, color: 'var(--pl-ink-4)' }}>
          Papirando · Sistema de Logos — arquivos: <Mono>src/lib/courseLogos.js</Mono> (mapa) e <Mono>src/lib/courseTemplates.js</Mono> (aplicação por nome).
        </p>
      </div>
    </div>
  );
}
