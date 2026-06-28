import React, { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Pencil, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { DEFAULT_COURSE_TEMPLATES } from '../lib/courseTemplates';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getBase(templates, intentFilter) {
  const arr = Array.isArray(templates) ? templates : DEFAULT_COURSE_TEMPLATES;
  return arr.filter((t) => t.intent === intentFilter || !intentFilter);
}

function getAreas(items) {
  const seen = new Set();
  const result = [];
  items.forEach((t) => {
    if (t.area && !seen.has(t.area)) { seen.add(t.area); result.push(t.area); }
  });
  return result;
}

// ─── Logo uploader — usa <label> para garantir que o file picker abre ────────

function LogoUploader({ url, onChange }) {
  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await fileToBase64(file);
      onChange(b64);
    } catch (err) {
      console.error('Logo upload error', err);
    }
    e.target.value = '';
  }

  return (
    <label
      title="Clique para enviar logo (PNG, SVG, JPG)"
      style={{
        width: 48, height: 48, borderRadius: 8, flexShrink: 0,
        border: '1.5px dashed var(--pl-rule-strong)',
        background: url ? 'transparent' : 'var(--pl-bg-soft)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        transition: 'border-color .12s',
      }}
    >
      {url
        ? <img src={url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        : <ImagePlus size={16} style={{ color: 'var(--pl-ink-4)', pointerEvents: 'none' }} />
      }
      <input
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </label>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminCourseTemplatesEditor({
  templates = [],
  setTemplates,
  isSaving = false,
  onSave,
  intentFilter = 'faculdade',
  title = 'Cursos de faculdade',
  subtitle = 'Organize por área. O aluno escolhe o curso e monta as próprias disciplinas.',
  emptyLabel = 'Nenhum curso cadastrado ainda.',
}) {
  const visible = getBase(templates, intentFilter);
  const areas = getAreas(visible);

  const [selectedArea, setSelectedArea] = useState(() => areas[0] || '');
  const [newAreaDraft, setNewAreaDraft] = useState('');
  const [addingArea, setAddingArea] = useState(false);

  // mantém selectedArea válida quando áreas mudam (ex: após mutação que adiciona primeira área)
  const prevAreasRef = useRef(areas);
  useEffect(() => {
    const prev = prevAreasRef.current;
    prevAreasRef.current = areas;
    if (areas.length > 0 && !areas.includes(selectedArea)) {
      // preferir preservar a mesma posição relativa se possível
      const idx = Math.min(prev.indexOf(selectedArea), areas.length - 1);
      setSelectedArea(areas[Math.max(0, idx)] || areas[0]);
    }
  }, [areas.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeArea = areas.includes(selectedArea) ? selectedArea : (areas[0] || '');
  const coursesInArea = visible.filter((t) => t.area === activeArea);

  // ── mutações — operam no array inteiro (templates prop), sem normalizar ─────

  function mutate(fn) {
    setTemplates?.((prev) => {
      const base = Array.isArray(prev) ? prev : DEFAULT_COURSE_TEMPLATES;
      return fn(base);
    });
  }

  function addCourse() {
    if (!activeArea) return;
    const id = `${intentFilter}-${Date.now()}`;
    mutate((base) => [
      ...base,
      { id, nome: '', area: activeArea, intent: intentFilter, imagem_url: '', subjects: [] },
    ]);
  }

  function updateCourse(id, patch) {
    mutate((base) => base.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeCourse(id) {
    mutate((base) => base.filter((item) => item.id !== id));
  }

  function confirmNewArea() {
    const nome = newAreaDraft.trim();
    if (!nome || areas.includes(nome)) { setAddingArea(false); setNewAreaDraft(''); return; }
    const id = `${intentFilter}-${Date.now()}`;
    mutate((base) => [
      ...base,
      { id, nome: `Novo curso em ${nome}`, area: nome, intent: intentFilter, imagem_url: '', subjects: [] },
    ]);
    setSelectedArea(nome);
    setAddingArea(false);
    setNewAreaDraft('');
  }

  function renameArea(oldName, newName) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    mutate((base) =>
      base.map((item) => item.area === oldName && item.intent === intentFilter ? { ...item, area: trimmed } : item)
    );
    if (selectedArea === oldName) setSelectedArea(trimmed);
  }

  function deleteArea(area) {
    mutate((base) => base.filter((item) => !(item.area === area && item.intent === intentFilter)));
    if (selectedArea === area) setSelectedArea(areas.find((a) => a !== area) || '');
  }

  const [confirmRestore, setConfirmRestore] = useState(false);

  function loadDefaults() {
    if (!confirmRestore) { setConfirmRestore(true); return; }
    const defaults = DEFAULT_COURSE_TEMPLATES.filter((t) => t.intent === intentFilter);
    setTemplates?.((prev) => {
      const other = Array.isArray(prev) ? prev.filter((t) => t.intent !== intentFilter) : [];
      return [...other, ...defaults];
    });
    setSelectedArea(defaults[0]?.area || '');
    setConfirmRestore(false);
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Catálogo</p>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--pl-ink)' }}>{title}</h3>
          <p style={{ margin: '6px 0 0', maxWidth: 560, color: 'var(--pl-ink-2)', fontSize: 13, lineHeight: 1.55 }}>{subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            className={`pl-btn ${confirmRestore ? 'pl-btn-ghost' : 'pl-btn-ghost'}`}
            onClick={loadDefaults}
            onBlur={() => setConfirmRestore(false)}
            title="Substitui o catálogo pelo catálogo padrão do Papirando"
            style={{
              fontSize: 12,
              color: confirmRestore ? 'var(--pl-danger)' : 'var(--pl-ink-3)',
              borderColor: confirmRestore ? 'var(--pl-danger)' : undefined,
            }}
          >
            <RefreshCw size={13} />
            {confirmRestore ? 'Confirmar restore?' : 'Catálogo padrão'}
          </button>
          <button type="button" className="pl-btn pl-btn-primary" disabled={isSaving} onClick={onSave}>
            <Save size={14} /> {isSaving ? 'Salvando…' : 'Salvar catálogo'}
          </button>
        </div>
      </div>

      {/* Layout: áreas (esq) + cursos (dir) */}
      <div style={{ display: 'grid', gridTemplateColumns: '192px 1fr', gap: 16, alignItems: 'start' }}>

        {/* Painel de áreas */}
        <div className="pl-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Áreas</p>

          {areas.length === 0 && !addingArea && (
            <p style={{ fontSize: 12, color: 'var(--pl-ink-4)', fontStyle: 'italic', padding: '4px 2px' }}>
              Nenhuma área criada.
            </p>
          )}

          {areas.map((area) => (
            <AreaItem
              key={area}
              area={area}
              isActive={area === activeArea}
              count={visible.filter((t) => t.area === area).length}
              onSelect={() => setSelectedArea(area)}
              onRename={(v) => renameArea(area, v)}
              onDelete={() => deleteArea(area)}
            />
          ))}

          {addingArea ? (
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <input
                type="text"
                autoFocus
                value={newAreaDraft}
                onChange={(e) => setNewAreaDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmNewArea();
                  if (e.key === 'Escape') { setAddingArea(false); setNewAreaDraft(''); }
                }}
                placeholder="Nome da área"
                className="pl-input"
                style={{ flex: 1, fontSize: 12, padding: '4px 8px', height: 28 }}
              />
              <button type="button" className="pl-btn pl-btn-sm" onClick={confirmNewArea} style={{ padding: '0 7px', height: 28 }}>
                <Check size={12} />
              </button>
              <button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => { setAddingArea(false); setNewAreaDraft(''); }} style={{ padding: '0 7px', height: 28 }}>
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingArea(true)}
              style={{
                marginTop: 6, display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 8px', borderRadius: 6,
                border: '1px dashed var(--pl-rule-strong)',
                background: 'transparent', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)',
                width: '100%',
              }}
            >
              <Plus size={12} /> Nova área
            </button>
          )}
        </div>

        {/* Painel de cursos */}
        <div>
          {!activeArea ? (
            <div className="pl-card-paper" style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--pl-ink-3)' }}>Crie uma área para começar a adicionar cursos.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)' }}>
                  {activeArea}
                  <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--pl-ink-3)', fontWeight: 400 }}>
                    {coursesInArea.length} curso{coursesInArea.length !== 1 ? 's' : ''}
                  </span>
                </p>
                <button type="button" className="pl-btn pl-btn-ghost pl-btn-sm" onClick={addCourse}>
                  <Plus size={13} /> Novo curso
                </button>
              </div>

              {coursesInArea.length === 0 ? (
                <div className="pl-card-paper" style={{ padding: 24, textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: 'var(--pl-ink-4)', fontStyle: 'italic' }}>{emptyLabel}</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
                  {coursesInArea.map((template) => (
                    <CourseCard
                      key={template.id}
                      template={template}
                      onUpdate={(patch) => updateCourse(template.id, patch)}
                      onRemove={() => removeCourse(template.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── AreaItem ──────────────────────────────────────────────────────────────────

function AreaItem({ area, isActive, count, onSelect, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(area);

  function commit() { onRename(draft); setEditing(false); }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(area); setEditing(false); }
        }}
        onBlur={commit}
        className="pl-input"
        style={{ fontSize: 12, padding: '4px 8px', height: 28, width: '100%' }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button
        type="button"
        onClick={onSelect}
        onDoubleClick={() => { setDraft(area); setEditing(true); }}
        title="Clique para selecionar · duplo clique para renomear"
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 8px', borderRadius: 6,
          border: isActive ? '1px solid var(--pl-accent)' : '1px solid transparent',
          background: isActive ? 'var(--pl-accent-soft)' : 'transparent',
          cursor: 'pointer', textAlign: 'left',
          fontSize: 12, fontWeight: isActive ? 700 : 500,
          color: isActive ? 'var(--pl-accent)' : 'var(--pl-ink-2)',
          transition: 'all .1s', minWidth: 0,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{area}</span>
        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 400, marginLeft: 4, color: isActive ? 'var(--pl-accent)' : 'var(--pl-ink-4)' }}>{count}</span>
      </button>
      <button
        type="button"
        onClick={() => { setDraft(area); setEditing(true); }}
        title="Renomear área"
        style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--pl-ink-4)', padding: 3, borderRadius: 4, flexShrink: 0, lineHeight: 0 }}
      >
        <Pencil size={11} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="Excluir área e todos os cursos"
        style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--pl-ink-4)', padding: 3, borderRadius: 4, flexShrink: 0, lineHeight: 0 }}
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

// ─── CourseCard ───────────────────────────────────────────────────────────────

function CourseCard({ template, onUpdate, onRemove }) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className="pl-card" style={{ padding: '12px 12px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Linha de logo + nome + ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LogoUploader url={template.imagem_url} onChange={(v) => onUpdate({ imagem_url: v })} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setEditOpen(true)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditOpen(true); } }}
              title={template.nome || 'Editar nome do curso'}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 6px', borderRadius: 6, cursor: 'pointer',
                border: '1px solid transparent',
                transition: 'border-color .1s, background .1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--pl-rule-2)'; e.currentTarget.style.background = 'var(--pl-bg-soft)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{
                flex: 1, fontSize: 13, fontWeight: 600, color: template.nome ? 'var(--pl-ink)' : 'var(--pl-ink-4)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontStyle: template.nome ? 'normal' : 'italic',
              }}>
                {template.nome || 'Nome do curso'}
              </span>
              <Pencil size={11} style={{ color: 'var(--pl-ink-4)', flexShrink: 0 }} />
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            title="Excluir curso"
            style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--pl-ink-4)', padding: 4, flexShrink: 0, lineHeight: 0 }}
          >
            <X size={13} />
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 10, color: 'var(--pl-ink-4)', fontStyle: 'italic', lineHeight: 1.4 }}>
          Disciplinas configuradas pelo aluno.
        </p>
      </div>

      {editOpen && (
        <CourseNameModal
          initial={template.nome}
          onSave={(v) => { onUpdate({ nome: v }); setEditOpen(false); }}
          onClose={() => setEditOpen(false)}
        />
      )}
    </>
  );
}

// ─── CourseNameModal — edição do nome completo em modal ────────────────────────

function CourseNameModal({ initial, onSave, onClose }) {
  const [value, setValue] = useState(initial || '');
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function save() { onSave((value || '').trim()); }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(20,17,13,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="pl-card"
        style={{ width: '100%', maxWidth: 480, padding: 20, boxShadow: 'var(--pl-sh-high)' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div>
            <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Curso</p>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--pl-ink)' }}>Editar nome do curso</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--pl-ink-4)', padding: 4, lineHeight: 0, flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save(); }}
          placeholder="Nome do curso"
          rows={3}
          className="pl-input"
          style={{ width: '100%', fontSize: 14, fontWeight: 600, lineHeight: 1.5, resize: 'vertical', minHeight: 76 }}
        />
        <p style={{ margin: '6px 2px 0', fontSize: 11, color: 'var(--pl-ink-4)' }}>
          {value.trim().length} caractere{value.trim().length !== 1 ? 's' : ''}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" className="pl-btn pl-btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="pl-btn pl-btn-primary" onClick={save}>
            <Check size={14} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
