// Revisão do que a IA leu do edital, antes de aquilo virar o eixo da plataforma.
//
// Existe porque o produto passou a se montar inteiro a partir do PDF que o aluno sobe: não
// há catálogo para cair de volta, então uma leitura ruim não gera um plano pobre — gera um
// app errado. O aluno confere, corrige e confirma. Ver docs/TESTE-EXTRACAO-EDITAL.md.

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, FileText, Check } from 'lucide-react';

const NAO_ENCONTRADO = /^n[ãa]o\s*encontrado$/i;

function valorOuTraco(valor) {
  const texto = String(valor || '').trim();
  return !texto || NAO_ENCONTRADO.test(texto) ? '—' : texto;
}

function DadoDoCargo({ label, valor }) {
  return (
    <div className="pl-card" style={{ padding: '10px 14px' }}>
      <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>
        {valorOuTraco(valor)}
      </p>
    </div>
  );
}

function QuadroDeProvas({ prova }) {
  if (!prova?.length) {
    return (
      <p style={{ fontSize: 12, color: 'var(--pl-ink-3)', margin: 0 }}>
        O edital não trouxe o número de questões por disciplina. Sem isso a plataforma trata
        todas com o mesmo peso — dá para ajustar depois em cada disciplina.
      </p>
    );
  }

  const totalQuestoes = prova.reduce((acc, linha) => acc + (Number(linha.questoes) || 0), 0);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Disciplina', 'Questões', 'Peso'].map((coluna, i) => (
              <th
                key={coluna}
                className="pl-eyebrow"
                style={{ textAlign: i === 0 ? 'left' : 'right', padding: '6px 8px', borderBottom: '1px solid var(--pl-rule-2)' }}
              >
                {coluna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {prova.map((linha, i) => (
            <tr key={`${linha.disciplina}-${i}`}>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--pl-rule)', color: 'var(--pl-ink)' }}>
                {linha.disciplina}
              </td>
              <td className="pl-num" style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid var(--pl-rule)' }}>
                {linha.questoes}
              </td>
              <td className="pl-num" style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid var(--pl-rule)' }}>
                {linha.peso}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalQuestoes > 0 && (
        <p style={{ fontSize: 12, color: 'var(--pl-ink-3)', marginTop: 8, marginBottom: 0 }}>
          {totalQuestoes} questões no total.
        </p>
      )}
    </div>
  );
}

function DisciplinaRevisavel({ item, onToggle, onRenomear, onToggleTopico }) {
  const [aberta, setAberta] = useState(false);
  const topicosMarcados = item.topicos.filter((topico) => topico.incluir).length;

  return (
    <div className="pl-card" style={{ padding: 0, opacity: item.incluir ? 1 : 0.5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
        <input
          type="checkbox"
          checked={item.incluir}
          onChange={(e) => onToggle(e.target.checked)}
          aria-label={`Incluir ${item.nome}`}
          style={{ width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
        />
        <input
          value={item.nome}
          onChange={(e) => onRenomear(e.target.value)}
          disabled={!item.incluir}
          className="pl-input"
          style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, padding: '6px 10px' }}
        />
        <button
          type="button"
          onClick={() => setAberta((v) => !v)}
          className="pl-btn pl-btn-ghost pl-btn-sm"
          style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          {aberta ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {topicosMarcados} de {item.topicos.length} tópicos
        </button>
      </div>

      {aberta && (
        <div style={{ borderTop: '1px solid var(--pl-rule)', padding: '8px 12px 12px 38px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {item.topicos.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--pl-ink-3)', margin: 0 }}>
              A IA não quebrou esta disciplina em tópicos. Dá para adicionar depois, na tela da disciplina.
            </p>
          )}
          {item.topicos.map((topico, indice) => (
            <label key={`${topico.nome}-${indice}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={topico.incluir}
                onChange={(e) => onToggleTopico(indice, e.target.checked)}
                disabled={!item.incluir}
                style={{ width: 14, height: 14, marginTop: 2, flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ color: topico.incluir ? 'var(--pl-ink-2)' : 'var(--pl-ink-4)' }}>{topico.nome}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function RevisaoEditalPanel({
  contest,
  analysis,
  revisao,
  onAlterarDisciplina,
  avisos = [],
  nomeDoArquivo = '',
}) {
  if (!contest || !Array.isArray(revisao)) return null;

  const disciplinasMarcadas = revisao.filter((item) => item.incluir);
  const topicosMarcados = disciplinasMarcadas.reduce(
    (acc, item) => acc + item.topicos.filter((topico) => topico.incluir).length,
    0
  );

  return (
    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Confira antes de confirmar</p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--pl-ink-2)' }}>
          É esta leitura que vira o seu plano de estudo. Desmarque o que não cai na sua prova
          e corrija o que a IA entendeu errado.
        </p>
      </div>

      {avisos.map((aviso) => (
        <div
          key={aviso}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, borderRadius: 4,
            border: '1px solid var(--pl-warn)', borderLeft: '3px solid var(--pl-warn)',
            background: 'var(--pl-warn-soft)', padding: '10px 14px',
            fontSize: 13, fontWeight: 600, color: 'var(--pl-warn)',
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{aviso}</span>
        </div>
      ))}

      <section>
        <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Dados do cargo</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <DadoDoCargo label="Cargo" valor={contest.roleName || contest.title} />
          <DadoDoCargo label="Vagas" valor={contest.vagas} />
          <DadoDoCargo label="Remuneração" valor={contest.salario} />
          <DadoDoCargo label="Escolaridade" valor={contest.escolaridade} />
          <DadoDoCargo label="Lotação" valor={contest.lotacao} />
          <DadoDoCargo label="Carga horária" valor={contest.cargaHoraria} />
          <DadoDoCargo label="Data da prova" valor={contest.examDate} />
          <DadoDoCargo label="Taxa de inscrição" valor={analysis?.inscricaoValor} />
        </div>
        {analysis?.etapas?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {analysis.etapas.map((etapa) => (
              <span key={etapa} className="pl-tag pl-tag-accent">{etapa}</span>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Quadro de provas</p>
        <QuadroDeProvas prova={contest.prova} />
      </section>

      <section>
        <p className="pl-eyebrow" style={{ marginBottom: 8 }}>
          Disciplinas e tópicos ({disciplinasMarcadas.length} de {revisao.length} marcadas)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {revisao.map((item, indice) => (
            <DisciplinaRevisavel
              key={`${item.nomeOriginal}-${indice}`}
              item={item}
              onToggle={(incluir) => onAlterarDisciplina(indice, { incluir })}
              onRenomear={(nome) => onAlterarDisciplina(indice, { nome })}
              onToggleTopico={(topicoIndice, incluir) =>
                onAlterarDisciplina(indice, { topicoIndice, incluirTopico: incluir })
              }
            />
          ))}
        </div>
      </section>

      <div
        className="pl-card-paper"
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', fontSize: 13 }}
      >
        <Check size={16} style={{ color: 'var(--pl-success)', flexShrink: 0 }} />
        <span style={{ color: 'var(--pl-ink-2)' }}>
          Vão ser criadas <strong style={{ color: 'var(--pl-ink)' }}>{disciplinasMarcadas.length} disciplinas</strong>
          {' '}e <strong style={{ color: 'var(--pl-ink)' }}>{topicosMarcados} tópicos</strong>.
        </span>
      </div>

      {nomeDoArquivo && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0, fontSize: 12, color: 'var(--pl-ink-3)' }}>
          <FileText size={13} />
          Lido de {nomeDoArquivo} em {new Date().toLocaleDateString('pt-BR')}. Se sair
          retificação depois, este plano não muda sozinho.
        </p>
      )}
    </div>
  );
}
