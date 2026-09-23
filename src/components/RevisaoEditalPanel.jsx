// Revisão do que a IA leu do edital, antes de aquilo virar o eixo da plataforma.
//
// Existe porque o produto passou a se montar inteiro a partir do PDF que o aluno sobe: não
// há catálogo para cair de volta, então uma leitura ruim não gera um plano pobre — gera um
// app errado. O aluno confere, corrige e confirma. Ver docs/TESTE-EXTRACAO-EDITAL.md.

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, FileText, Check } from 'lucide-react';
import { fichaComparativa, provasComparativas, nomeDoCargo as rotuloDoCargo } from '../lib/comparativoDeCargos';

// Grade de comparacao: uma linha por campo, uma coluna por cargo.
//
// Cada cargo tinha o proprio bloco de cartoezinhos, empilhado. Para comparar salario, vagas
// ou data da prova o aluno rolava de um bloco ao outro guardando numero de cabeca — e e
// nessa comparacao que ele decide o que vai prestar.
function GradeComparativa({ colunas, children, rotuloDaPrimeiraColuna }) {
  const grade = {
    display: 'grid',
    gridTemplateColumns: `minmax(0, 1.1fr) repeat(${colunas.length}, minmax(0, 1fr))`,
    alignItems: 'center',
  };

  return (
    <div>
      <div style={{ ...grade, padding: '8px 0 7px', borderBottom: '1px solid var(--pl-rule-2)' }}>
        <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>{rotuloDaPrimeiraColuna}</span>
        {colunas.map((coluna) => (
          <span
            key={coluna}
            title={coluna}
            style={{
              fontSize: 10.5, fontWeight: 700, lineHeight: 1.25, color: 'var(--pl-ink-2)',
              padding: '0 8px',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}
          >
            {coluna}
          </span>
        ))}
      </div>
      {children(grade)}
    </div>
  );
}

function QuadroDeProvas({ cargos }) {
  const { colunas, linhas, totais, temDados } = provasComparativas(cargos);

  if (!temDados) {
    return (
      <p style={{ fontSize: 12, color: 'var(--pl-ink-3)', margin: 0 }}>
        O edital não trouxe o número de questões por disciplina. Sem isso a plataforma trata
        todas com o mesmo peso — dá para ajustar depois em cada disciplina.
      </p>
    );
  }

  return (
    <GradeComparativa colunas={colunas} rotuloDaPrimeiraColuna="Disciplina">
      {(grade) => (
        <>
          {linhas.map((linha) => (
            <div key={linha.disciplina} style={{ ...grade, padding: '7px 0', borderBottom: '1px solid var(--pl-rule)' }}>
              <span
                title={linha.disciplina}
                style={{
                  minWidth: 0, paddingRight: 12, fontSize: 12.5,
                  fontWeight: linha.emTodos ? 700 : 500,
                  color: linha.emTodos ? 'var(--pl-ink)' : 'var(--pl-ink-2)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {linha.disciplina}
              </span>
              {linha.celulas.map((celula, indice) => (
                <span key={colunas[indice]} style={{ padding: '0 8px', fontSize: 12.5 }}>
                  {celula ? (
                    <>
                      <span className="pl-num" style={{ color: 'var(--pl-ink)' }}>{celula.questoes}</span>
                      <span style={{ color: 'var(--pl-ink-3)' }}> questões</span>
                      {/* Peso 1 e o padrao: repetir "peso 1" em toda linha so cansa a
                          vista. So aparece quando muda a conta. */}
                      {celula.peso && celula.peso !== '1' && (
                        <span style={{ color: 'var(--pl-ink-3)' }}> · peso {celula.peso}</span>
                      )}
                    </>
                  ) : (
                    <span style={{ color: 'var(--pl-ink-5)' }}>—</span>
                  )}
                </span>
              ))}
            </div>
          ))}

          <div style={{ ...grade, padding: '8px 0 0' }}>
            <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>Total</span>
            {totais.map((total, indice) => (
              <span key={colunas[indice]} style={{ padding: '0 8px', fontSize: 12.5, fontWeight: 700, color: 'var(--pl-ink)' }}>
                <span className="pl-num">{total}</span> questões
              </span>
            ))}
          </div>
        </>
      )}
    </GradeComparativa>
  );
}

function DisciplinaRevisavel({ item, onToggle, onRenomear, onToggleTopico, rotuloDeCargo = null }) {
  const [aberta, setAberta] = useState(false);
  const topicosMarcados = item.topicos.filter((topico) => topico.incluir).length;
  // Com dois cargos na mesma lista, saber de quem e a disciplina e o que da sentido a
  // revisao: desmarcar uma compartilhada tira ela dos dois cursos.
  const marca = rotuloDeCargo ? rotuloDeCargo(item.cargos || []) : null;

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
        {marca && (
          <span
            className={marca.compartilhada ? 'pl-tag pl-tag-success' : 'pl-tag'}
            style={{ flexShrink: 0, fontSize: 11, whiteSpace: 'nowrap' }}
          >
            {marca.texto}
          </span>
        )}
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
              {/* O recorte da mesma disciplina muda de um cargo para o outro; sem dizer de
                  quem e o topico, o aluno nao tem como conferir. */}
              {rotuloDeCargo && !rotuloDeCargo(topico.cargos || []).compartilhada && (
                <span className="pl-tag" style={{ fontSize: 10, flexShrink: 0 }}>
                  {rotuloDeCargo(topico.cargos || []).texto}
                </span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function RevisaoEditalPanel({
  cargos = [],
  analysis,
  revisao,
  onAlterarDisciplina,
  avisos = [],
  nomeDoArquivo = '',
}) {
  if (!cargos.length || !Array.isArray(revisao)) return null;

  const disciplinasMarcadas = revisao.filter((item) => item.incluir);
  const topicosMarcados = disciplinasMarcadas.reduce(
    (acc, item) => acc + item.topicos.filter((topico) => topico.incluir).length,
    0
  );

  const nomeDoCargo = (cargo, indice) => rotuloDoCargo(cargo, indice);
  const ficha = fichaComparativa(cargos, analysis);

  // Com um cargo so, marcar cada linha com o nome dele seria ruido: todas sao dele.
  const rotuloDeCargo = cargos.length < 2
    ? null
    : (idsDoItem) => {
        const dono = cargos.filter((cargo) => idsDoItem.includes(cargo.id));
        if (dono.length >= cargos.length) return { compartilhada: true, texto: 'Nos dois' };
        if (!dono.length) return { compartilhada: false, texto: '—' };
        return { compartilhada: false, texto: `Só ${nomeDoCargo(dono[0], cargos.indexOf(dono[0]))}` };
      };

  // Quantas disciplinas cada curso vai levar. E o que o aluno precisa ver antes de
  // confirmar: desmarcar uma compartilhada mexe nos dois.
  const porCargo = cargos.map((cargo, indice) => ({
    nome: nomeDoCargo(cargo, indice),
    disciplinas: disciplinasMarcadas.filter((item) => (item.cargos || []).includes(cargo.id)).length,
  }));

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

      {/* Ficha dos cargos lado a lado, nao um bloco empilhado por cargo. */}
      <section className="pl-card" style={{ padding: '4px 16px 14px' }}>
        <GradeComparativa colunas={ficha.colunas} rotuloDaPrimeiraColuna={cargos.length > 1 ? 'Comparativo' : 'Dados do cargo'}>
          {(grade) => ficha.linhas.map((linha) => (
            <div key={linha.label} style={{ ...grade, padding: '9px 0', borderBottom: '1px solid var(--pl-rule)' }}>
              <span className="pl-eyebrow" style={{ fontSize: 9.5, paddingRight: 12 }}>{linha.label}</span>
              {linha.valores.map((valor, indice) => (
                <span
                  key={ficha.colunas[indice]}
                  style={{
                    padding: '0 8px', fontSize: 13, lineHeight: 1.4,
                    // O que muda de um cargo para o outro e o que o aluno veio procurar.
                    fontWeight: linha.diferente ? 700 : 500,
                    color: valor === '—' ? 'var(--pl-ink-4)' : 'var(--pl-ink)',
                  }}
                >
                  {valor}
                </span>
              ))}
            </div>
          ))}
        </GradeComparativa>
      </section>

      {/* O quadro de provas tambem e comparativo: e ele que diz onde estao os pontos, e
          dois cargos do mesmo edital raramente pesam as disciplinas igual. */}
      <section className="pl-card" style={{ padding: '4px 16px 14px' }}>
        <p className="pl-eyebrow" style={{ margin: '12px 0 2px' }}>Quadro de provas</p>
        <QuadroDeProvas cargos={cargos} />
      </section>

      {analysis?.etapas?.length > 0 && (
        <section>
          <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Etapas do certame</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {analysis.etapas.map((etapa) => (
              <span key={etapa} className="pl-tag pl-tag-accent">{etapa}</span>
            ))}
          </div>
        </section>
      )}

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
              rotuloDeCargo={rotuloDeCargo}
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
          {cargos.length > 1 ? (
            <>
              Vai ser criado <strong style={{ color: 'var(--pl-ink)' }}>1 curso</strong> com os{' '}
              {cargos.length} cargos:{' '}
              {porCargo.map((cargo) => `${cargo.nome} (${cargo.disciplinas} disciplinas)`).join(' e ')}.
              {' '}A matéria que cai nos dois é estudada uma vez e conta para os dois.
            </>
          ) : (
            <>
              Vão ser criadas <strong style={{ color: 'var(--pl-ink)' }}>{disciplinasMarcadas.length} disciplinas</strong>
              {' '}e <strong style={{ color: 'var(--pl-ink)' }}>{topicosMarcados} tópicos</strong>.
            </>
          )}
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
