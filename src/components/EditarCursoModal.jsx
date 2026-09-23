import React, { useRef, useState } from 'react';
import { ModalShell, InputField } from './ModalShell';
import { BookOpen, Plus, Trash2, Upload } from 'lucide-react';
import { objetivosDoCurso } from '../lib/objetivos';
import { tipoDoObjetivo, LISTA_DE_TIPOS } from '../lib/tiposDeObjetivo';
import { apelidoSugerido } from '../lib/apelidoCurso';
import { CORES_DE_CURSO, limparDescricao, LIMITE_DA_DESCRICAO, recomendacaoDaImagem, avisoDaImagem } from '../lib/personalizacaoCurso';

// Personalizacao do curso do aluno: nome, apelido, descricao, cor, capa, selo e os objetivos
// que ele agrupa.
//
// Vivia dentro de Planos.jsx, mas a tela de Objetivos precisa do mesmo modal: era la que o
// aluno olhava os objetivos do edital e nao tinha como editar nada. Duas copias divergiriam
// na primeira mudanca.

// A IA devolve "Não encontrado" quando o campo não está no edital. Renderizar isso como
// dado produzia chips do tipo "Nao encontrado vagas".
const semValor = (valor) => {
  const texto = String(valor || '').trim();
  return !texto || /^n[ãa]o\s*encontrado$/i.test(texto);
};

// Rotulo e exemplo de cada campo editavel do objetivo. Quais aparecem depende do tipo —
// ver src/lib/tiposDeObjetivo.js.
const CAMPOS_DO_OBJETIVO = [
  { id: 'banca', label: 'Banca', placeholder: 'A definir' },
  { id: 'cargo', label: 'Cargo', placeholder: 'Nome do cargo' },
  { id: 'vagas', label: 'Vagas', placeholder: 'Não informado' },
  { id: 'salario', label: 'Remuneração', placeholder: 'Não informada' },
  { id: 'escolaridade', label: 'Escolaridade', placeholder: 'Não informada' },
  { id: 'instituicao', label: 'Instituição', placeholder: 'Nome da faculdade' },
  { id: 'periodo', label: 'Período', placeholder: '2026.2' },
];

export default function EditarCursoModal({ curso, onClose, onSave, onOpenDisciplinas, onUploadImage }) {
  const EDIT_TYPES = [
    { id: 'concurso', label: 'Concurso' },
    { id: 'vestibular', label: 'Vestibular' },
    { id: 'faculdade', label: 'Graduação' },
    { id: 'livre', label: 'Livre' },
  ];
  const fileInputRef = useRef(null);
  const capaInputRef = useRef(null);
  const [nome, setNome] = useState(curso?.nome || '');
  // Nome curto para as telas apertadas. "Concurso Publico para Admissao ao Curso de
  // Formacao de Oficiais (..." cortado no meio nao ajuda ninguem; o nome oficial fica na
  // ficha, o apelido aparece nos cartoes.
  const [apelido, setApelido] = useState(curso?.apelido || '');
  const [intent, setIntent] = useState(curso?.intent || curso?.tipo || 'livre');
  const [imagemUrl, setImagemUrl] = useState(curso?.imagem_url || '');
  // Capa e cor sao a cara do curso no cartao. O curso e o caderno que o aluno criou e vai
  // abrir todo dia: deixar ele dar cara propria e o que separa "uma lista de materias" de
  // "o meu plano".
  const [capaUrl, setCapaUrl] = useState(curso?.capa_url || '');
  const [cor, setCor] = useState(curso?.cor || CORES_DE_CURSO[0].id);
  const [descricao, setDescricao] = useState(curso?.descricao || '');
  // Os dados que sao do alvo vivem em cada objetivo, nao no curso: um curso pode agrupar
  // dois concursos com datas e bancas diferentes. O edital da o ponto de partida, nao a
  // verdade eterna — adiamento de prova e rotina, e vagas as vezes so saem em retificacao.
  const [objetivos, setObjetivos] = useState(() =>
    objetivosDoCurso(curso).map((objetivo) => ({
      ...objetivo,
      vagas: semValor(objetivo.vagas) ? '' : String(objetivo.vagas || ''),
      salario: semValor(objetivo.salario) ? '' : String(objetivo.salario || ''),
    }))
  );

  const alterarObjetivo = (id, campo, valor) =>
    setObjetivos((prev) => prev.map((item) => (item.id === id ? { ...item, [campo]: valor } : item)));

  // Objetivo que nao veio de edital: a faculdade do aluno, um estudo livre. E o que permite
  // o curso misturar tipos sem precisar de um PDF para cada coisa.
  const adicionarObjetivo = () =>
    setObjetivos((prev) => [
      ...prev,
      { id: `manual-${Date.now()}`, nome: '', tipo: 'faculdade', prova_data: '', prova: [] },
    ]);

  // O ultimo nao sai: curso sem objetivo nenhum nao tem alvo, nem prazo, nem prioridade.
  const removerObjetivo = (id) =>
    setObjetivos((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  const [uploading, setUploading] = useState(false);
  // Dimensoes reais do que o aluno escolheu, lidas quando a previa carrega. E o que permite
  // avisar "vai ser cortada" antes de ele estranhar o resultado no cartao.
  const [dimensoes, setDimensoes] = useState({ capa: null, selo: null });
  const medir = (chave) => (evento) =>
    setDimensoes((prev) => ({
      ...prev,
      [chave]: { largura: evento.target.naturalWidth, altura: evento.target.naturalHeight },
    }));
  const [uploadError, setUploadError] = useState('');

  const canSave = Boolean(nome.trim());

  // destino: 'selo' (o quadradinho do cartao) ou 'capa' (a faixa do topo).
  const enviarImagem = (destino) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reenviar o mesmo arquivo
    if (!file || !onUploadImage) return;
    setUploadError('');
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      if (url) (destino === 'capa' ? setCapaUrl : setImagemUrl)(url);
    } catch (err) {
      setUploadError(err?.message || 'Falha ao enviar a imagem.');
    } finally {
      setUploading(false);
    }
  };
  const handlePickFile = enviarImagem('selo');
  const handlePickCapa = enviarImagem('capa');

  return (
    <ModalShell
      title="Personalizar curso"
      subtitle="Nome, capa, cor e os objetivos deste curso. As matérias e tópicos você edita em Disciplinas."
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <InputField label="Nome do curso" value={nome} onChange={setNome} placeholder="Ex.: Meu plano para a PM" />

        <div>
          <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Tipo</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EDIT_TYPES.map((t) => {
              const active = intent === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setIntent(t.id)}
                  style={{
                    border: `1px solid ${active ? 'var(--pl-accent)' : 'var(--pl-rule-2)'}`,
                    borderRadius: 999,
                    background: active ? 'var(--pl-accent-soft)' : 'var(--pl-surface)',
                    color: active ? 'var(--pl-accent)' : 'var(--pl-ink-2)',
                    padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Apelido (opcional)</label>
          <input
            value={apelido}
            onChange={(e) => setApelido(e.target.value)}
            placeholder={apelidoSugerido(curso)}
            className="pl-input"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--pl-ink-3)' }}>
            Nome curto para os cartões. O nome completo continua guardado.
          </p>
        </div>

        <div>
          <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Descrição (opcional)</label>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value.slice(0, LIMITE_DA_DESCRICAO))}
            placeholder="Ex.: Plano para a prova de outubro, focado em Penal"
            className="pl-input"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--pl-ink-3)' }}>
            Aparece no cartão em vez da linha automática. {LIMITE_DA_DESCRICAO - descricao.length} caracteres restantes.
          </p>
        </div>

        {/* Paleta fechada em vez de color picker: os tons saem da familia do acento da marca
            e todos aceitam texto claro em cima. */}
        <div>
          <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Cor do curso</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CORES_DE_CURSO.map((opcao) => {
              const ativa = cor === opcao.id;
              return (
                <button
                  key={opcao.id}
                  type="button"
                  onClick={() => setCor(opcao.id)}
                  title={opcao.label}
                  aria-label={opcao.label}
                  aria-pressed={ativa}
                  style={{
                    width: 34, height: 34, borderRadius: 8, cursor: 'pointer',
                    background: `linear-gradient(135deg, ${opcao.base} 0%, ${opcao.claro} 100%)`,
                    border: ativa ? '2px solid var(--pl-ink)' : '1px solid var(--pl-rule-2)',
                    boxShadow: ativa ? 'var(--pl-sh-low)' : 'none',
                  }}
                />
              );
            })}
          </div>
        </div>

        <div>
          <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Capa (opcional)</label>
          <div
            style={{
              height: 72, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--pl-rule-2)',
              background: `linear-gradient(135deg, ${(CORES_DE_CURSO.find((c) => c.id === cor) || CORES_DE_CURSO[0]).base} 0%, ${(CORES_DE_CURSO.find((c) => c.id === cor) || CORES_DE_CURSO[0]).claro} 100%)`,
            }}
          >
            {capaUrl && (
              <img
                src={capaUrl}
                alt=""
                onLoad={medir('capa')}
                onError={() => setDimensoes((prev) => ({ ...prev, capa: null }))}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {onUploadImage && (
              <>
                <input ref={capaInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handlePickCapa} style={{ display: 'none' }} />
                <button
                  type="button"
                  className="pl-btn pl-btn-sm"
                  disabled={uploading}
                  onClick={() => capaInputRef.current?.click()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Upload size={14} /> {uploading ? 'Enviando…' : 'Enviar capa'}
                </button>
              </>
            )}
            {capaUrl && (
              <button type="button" className="pl-btn pl-btn-sm" disabled={uploading} onClick={() => setCapaUrl('')}>
                Remover capa
              </button>
            )}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--pl-ink-3)' }}>
            {recomendacaoDaImagem('capa')}
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--pl-ink-3)' }}>
            Faixa larga no topo do cartão — o centro da imagem é o que aparece. Sem capa, o
            cartão usa a cor escolhida.
          </p>
          {avisoDaImagem('capa', dimensoes.capa?.largura, dimensoes.capa?.altura) && (
            <p style={{ margin: '6px 0 0', fontSize: 11.5, fontWeight: 700, color: 'var(--pl-warn)' }}>
              {avisoDaImagem('capa', dimensoes.capa?.largura, dimensoes.capa?.altura)}
            </p>
          )}
        </div>

        <div>
          <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Selo do curso (opcional)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
              border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {imagemUrl
                ? (
                  <img
                    src={imagemUrl}
                    alt=""
                    onLoad={medir('selo')}
                    onError={() => setDimensoes((prev) => ({ ...prev, selo: null }))}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )
                : <BookOpen size={20} style={{ color: 'var(--pl-ink-4)' }} />}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {onUploadImage && (
                <>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handlePickFile} style={{ display: 'none' }} />
                  <button
                    type="button"
                    className="pl-btn pl-btn-sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Upload size={14} /> {uploading ? 'Enviando…' : 'Enviar foto'}
                  </button>
                </>
              )}
              {imagemUrl && (
                <button type="button" className="pl-btn pl-btn-sm" disabled={uploading} onClick={() => setImagemUrl('')}>
                  Remover
                </button>
              )}
            </div>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--pl-ink-3)' }}>
            {recomendacaoDaImagem('selo')}
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--pl-ink-3)' }}>
            Quadrado, tipo o brasão do órgão. Aparece pequeno, ao lado do nome.
          </p>
          {avisoDaImagem('selo', dimensoes.selo?.largura, dimensoes.selo?.altura) && (
            <p style={{ margin: '6px 0 0', fontSize: 11.5, fontWeight: 700, color: 'var(--pl-warn)' }}>
              {avisoDaImagem('selo', dimensoes.selo?.largura, dimensoes.selo?.altura)}
            </p>
          )}
          {uploadError && <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--pl-danger)' }}>{uploadError}</p>}
          <div style={{ marginTop: 10 }}>
            <InputField label="Ou cole a URL de uma imagem" value={imagemUrl} onChange={setImagemUrl} placeholder="https://..." />
          </div>
        </div>

        {/* Um bloco por objetivo. A data e a banca sao de cada alvo, nao do curso — e um
            curso pode juntar um concurso com a faculdade, que nem tem prova unica. Cada
            bloco pergunta o tipo e mostra so os campos daquele tipo (ver
            src/lib/tiposDeObjetivo.js). */}
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <p className="pl-eyebrow" style={{ margin: 0 }}>
              {objetivos.length > 1 ? `Objetivos deste curso (${objetivos.length})` : 'Objetivo'}
            </p>
            <button type="button" className="pl-btn pl-btn-sm" onClick={adicionarObjetivo}>
              <Plus size={13} /> Adicionar objetivo
            </button>
          </div>

          {objetivos.map((objetivo) => {
            const tipo = tipoDoObjetivo(objetivo);
            return (
              <div key={objetivo.id} className="pl-card" style={{ padding: '12px 14px', display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={objetivo.nome || ''}
                    onChange={(e) => alterarObjetivo(objetivo.id, 'nome', e.target.value)}
                    placeholder="Nome do objetivo"
                    className="pl-input"
                    style={{ flex: 1, minWidth: 0, fontWeight: 700 }}
                  />
                  {objetivos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerObjetivo(objetivo.id)}
                      title="Remover este objetivo"
                      style={{ border: 0, background: 'transparent', color: 'var(--pl-ink-4)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {LISTA_DE_TIPOS.map((opcao) => (
                    <button
                      key={opcao.id}
                      type="button"
                      onClick={() => alterarObjetivo(objetivo.id, 'tipo', opcao.id)}
                      className={objetivo.tipo === opcao.id ? 'pl-chip is-active' : 'pl-chip'}
                    >
                      {opcao.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                  {/* Estudo livre nao tem prazo: o campo some em vez de ficar vazio
                      sugerindo que falta preencher. */}
                  {tipo.temPrazo && (
                    <div>
                      <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 5, fontSize: 9.5 }}>
                        {tipo.rotuloDoPrazo}
                      </label>
                      <input
                        type="date"
                        value={objetivo.prova_data ? String(objetivo.prova_data).slice(0, 10) : ''}
                        onChange={(e) => alterarObjetivo(objetivo.id, 'prova_data', e.target.value)}
                        className="pl-input"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}

                  {CAMPOS_DO_OBJETIVO.filter((campo) => tipo.campos.includes(campo.id)).map((campo) => (
                    <div key={campo.id}>
                      <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 5, fontSize: 9.5 }}>
                        {campo.label}
                      </label>
                      <input
                        value={objetivo[campo.id] || ''}
                        onChange={(e) => alterarObjetivo(objetivo.id, campo.id, e.target.value)}
                        placeholder={campo.placeholder}
                        className="pl-input"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: '1px solid var(--pl-rule)', paddingTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => onOpenDisciplinas?.(curso)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={14} /> Editar matérias e tópicos
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="pl-btn pl-btn-sm" onClick={onClose}>Cancelar</button>
            <button
              className="pl-btn pl-btn-primary pl-btn-sm"
              disabled={!canSave}
              onClick={() => {
                onSave?.({
                  nome,
                  apelido: apelido.trim(),
                  intent,
                  imagem_url: imagemUrl,
                  capa_url: capaUrl.trim(),
                  cor,
                  descricao: limparDescricao(descricao),
                  objetivos: objetivos.map((objetivo) => ({
                    ...objetivo,
                    nome: String(objetivo.nome || '').trim() || 'Objetivo',
                    banca: String(objetivo.banca || '').trim(),
                    vagas: String(objetivo.vagas || '').trim(),
                    salario: String(objetivo.salario || '').trim(),
                  })),
                  // O curso segue o primeiro objetivo nos campos que telas antigas ainda
                  // leem direto (curso.prova_data).
                  prova_data: objetivos[0]?.prova_data || '',
                });
                onClose?.();
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
