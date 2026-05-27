import React from 'react';
import { Filter, X } from 'lucide-react';

export default function FiltrosAvancados({ isFilterPanelOpen, setIsFilterPanelOpen, bancoDisciplinas }) {
  if (!isFilterPanelOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(26,54,93,0.40)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ background: 'var(--pl-surface)', width: '100%', maxWidth: 420, height: '100%', boxShadow: 'var(--pl-sh-high)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--pl-ink)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Filter size={18} style={{ color: 'var(--pl-success)' }} />
            Filtros Avançados
          </h2>
          <button
            onClick={() => setIsFilterPanelOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-ink-3)', padding: 6, borderRadius: 10 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Período */}
          <div>
            <p className="pl-eyebrow" style={{ marginBottom: 12 }}>Período</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--pl-ink-3)', marginBottom: 4 }}>Início</label>
                <input type="date" className="pl-input" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--pl-ink-3)', marginBottom: 4 }}>Fim</label>
                <input type="date" className="pl-input" style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Hoje', '7 Dias', '30 Dias', 'Este Mês', 'Este Ano'].map(p => (
                <button
                  key={p}
                  className="pl-tag"
                  style={{ cursor: 'pointer', border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', fontSize: 10, fontWeight: 700 }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Disciplina e Tópico */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Disciplina</p>
              <select className="pl-input" style={{ width: '100%' }}>
                <option>Todas as disciplinas</option>
                {(bancoDisciplinas || []).map(d => <option key={d.id}>{d.nome}</option>)}
              </select>
            </div>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Tópico</p>
              <select className="pl-input" style={{ width: '100%' }}>
                <option>Todos os tópicos</option>
              </select>
            </div>
          </div>

          {/* Categoria */}
          <div>
            <p className="pl-eyebrow" style={{ marginBottom: 12 }}>Categoria</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {['Teoria', 'Revisão', 'Questões', 'Simulados', 'Redação', 'Leitura'].map(c => (
                <label
                  key={c}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--pl-rule-2)', cursor: 'pointer', background: 'var(--pl-surface)' }}
                >
                  <input type="checkbox" style={{ width: 14, height: 14, accentColor: 'var(--pl-accent)', cursor: 'pointer' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)' }}>{c}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Desempenho */}
          <div>
            <p className="pl-eyebrow" style={{ marginBottom: 12 }}>Desempenho (%)</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input type="number" placeholder="Min" min="0" max="100" className="pl-input" style={{ width: '100%', textAlign: 'center' }} />
              </div>
              <span style={{ fontWeight: 700, color: 'var(--pl-ink-3)' }}>—</span>
              <div style={{ flex: 1, position: 'relative' }}>
                <input type="number" placeholder="Max" min="0" max="100" className="pl-input" style={{ width: '100%', textAlign: 'center' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', display: 'flex', gap: 10 }}>
          <button className="pl-btn pl-btn-ghost" style={{ flex: 1 }} onClick={() => setIsFilterPanelOpen(false)}>
            Limpar Tudo
          </button>
          <button className="pl-btn pl-btn-primary" style={{ flex: 1 }} onClick={() => setIsFilterPanelOpen(false)}>
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>
  );
}
