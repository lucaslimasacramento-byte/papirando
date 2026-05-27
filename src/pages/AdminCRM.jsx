import React, { useMemo, useState } from 'react';
import {
  BadgeCheck,
  Download,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import AdminPageHeader from '../components/AdminPageHeader';
import { showConfirm } from '../lib/dialogs';
import { buildCrmSnapshot, CRM_STAGE_OPTIONS, normalizeLead } from '../lib/adminCrm';
import { formatCurrency } from '../lib/adminFinance';

const CHANNEL_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'trafego_pago', label: 'Tráfego pago' },
  { value: 'organico', label: 'Orgânico' },
  { value: 'outro', label: 'Outro' },
];

const EMPTY_LEAD = {
  id: '',
  nome: '',
  contato: '',
  canal: 'instagram',
  interesse: '',
  stage: 'novo',
  monthly_value: '',
  observacao: '',
};

function exportLeadsCsv(leads) {
  const headers = ['Nome', 'Contato', 'Canal', 'Interesse', 'Etapa', 'Valor mensal (R$)', 'Observação', 'Cadastrado em'];
  const rows = leads.map((l) => [
    l.nome || '',
    l.contato || '',
    CHANNEL_OPTIONS.find((c) => c.value === l.canal)?.label || l.canal || '',
    l.interesse || '',
    CRM_STAGE_OPTIONS.find((s) => s.value === l.stage)?.label || l.stage || '',
    String(Number(l.monthly_value || 0).toFixed(2)).replace('.', ','),
    l.observacao || '',
    l.created_at ? String(l.created_at).slice(0, 10).split('-').reverse().join('/') : '',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads_crm_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminCRM({ leads = [], currentUserEmail = '', onSaveLead, onDeleteLead }) {
  const [form, setForm] = useState(EMPTY_LEAD);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [filterCanal, setFilterCanal] = useState('');
  const [filterStage, setFilterStage] = useState('');

  const crm = useMemo(() => buildCrmSnapshot(leads), [leads]);

  const filteredLeads = useMemo(() => {
    let list = [...leads];
    if (filterCanal) list = list.filter((l) => l.canal === filterCanal);
    if (filterStage) list = list.filter((l) => l.stage === filterStage);
    return list.sort((a, b) => {
      if (a.stage !== b.stage) return String(a.stage).localeCompare(String(b.stage));
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
  }, [leads, filterCanal, filterStage]);

  const handleSave = async () => {
    const payload = normalizeLead({
      ...form,
      monthly_value: Number(String(form.monthly_value).replace(',', '.')),
    });

    if (!payload.nome) {
      setFeedback({ type: 'error', message: 'Digite o nome do lead.' });
      return;
    }

    setSaving(true);
    setFeedback({ type: '', message: '' });
    try {
      await onSaveLead?.(payload);
      setForm(EMPTY_LEAD);
      setFeedback({ type: 'success', message: 'Lead salvo com sucesso.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Não foi possível salvar o lead.' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (lead) => {
    setForm({
      id: lead.id,
      nome: lead.nome || '',
      contato: lead.contato || '',
      canal: lead.canal || 'instagram',
      interesse: lead.interesse || '',
      stage: lead.stage || 'novo',
      monthly_value: String(lead.monthly_value || ''),
      observacao: lead.observacao || '',
    });
  };

  const handleDelete = async (lead) => {
    const confirmed = await showConfirm(`Excluir o lead "${lead.nome}"?`, { confirmLabel: 'Excluir', danger: true });
    if (!confirmed) return;
    setFeedback({ type: '', message: '' });
    try {
      await onDeleteLead?.(lead);
      if (form.id === lead.id) setForm(EMPTY_LEAD);
      setFeedback({ type: 'success', message: 'Lead removido.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Não foi possível excluir o lead.' });
    }
  };

  return (
    <div className="pl-page">
      {feedback.message ? (
        <div
          role="status"
          style={{
            borderRadius: 10,
            border: `1px solid ${feedback.type === 'success' ? 'var(--pl-success)' : 'var(--pl-danger)'}`,
            background: feedback.type === 'success' ? 'var(--pl-success-soft)' : 'var(--pl-danger-soft)',
            padding: '12px 16px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--pl-ink)',
          }}
        >
          {feedback.message}
        </div>
      ) : null}

      <AdminPageHeader
        icon={Users}
        badgeIcon={Users}
        badge="CRM admin"
        title="Leads e oportunidades"
        subtitle="Registre interessados, acompanhe o funil comercial e enxergue o potencial de receita que ainda não virou assinatura."
        stats={[
          { key: 'total', label: 'Leads', value: String(crm.total), icon: Users, accent: 'blue' },
          { key: 'contato', label: 'Em contato', value: String(crm.emContato), icon: MessageCircle, accent: 'indigo' },
          { key: 'prop', label: 'Propostas', value: String(crm.propostas), icon: Target, accent: 'violet' },
          { key: 'fech', label: 'Fechados', value: String(crm.fechados), icon: BadgeCheck, accent: 'emerald' },
          { key: 'pipe', label: 'Pipeline', value: formatCurrency(crm.pipelineMensal), icon: TrendingUp, accent: 'orange' },
        ]}
      />

      <div style={{ display: 'grid', gap: 32, gridTemplateColumns: '0.8fr 1.2fr' }}>
        <section className="pl-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 24 }}>
            <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Cadastro comercial</p>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--pl-ink)' }}>{form.id ? 'Editar lead' : 'Novo lead'}</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Nome">
              <input value={form.nome} onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))} className="pl-input" style={{ width: '100%' }} />
            </Field>
            <Field label="Contato">
              <input value={form.contato} onChange={(e) => setForm((prev) => ({ ...prev, contato: e.target.value }))} placeholder="Telefone, e-mail ou @usuario" className="pl-input" style={{ width: '100%' }} />
            </Field>
            <Field label="Canal">
              <select value={form.canal} onChange={(e) => setForm((prev) => ({ ...prev, canal: e.target.value }))} className="pl-input" style={{ width: '100%' }}>
                {CHANNEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Interesse principal">
              <input value={form.interesse} onChange={(e) => setForm((prev) => ({ ...prev, interesse: e.target.value }))} placeholder="Ex: PMAL, carreiras policiais, plano elite" className="pl-input" style={{ width: '100%' }} />
            </Field>
            <Field label="Etapa do funil">
              <select value={form.stage} onChange={(e) => setForm((prev) => ({ ...prev, stage: e.target.value }))} className="pl-input" style={{ width: '100%' }}>
                {CRM_STAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Valor mensal potencial">
              <input value={form.monthly_value} onChange={(e) => setForm((prev) => ({ ...prev, monthly_value: e.target.value }))} placeholder="59,90" className="pl-input" style={{ width: '100%' }} />
            </Field>
            <Field label="Observação">
              <textarea value={form.observacao} onChange={(e) => setForm((prev) => ({ ...prev, observacao: e.target.value }))} rows={4} className="pl-input" style={{ width: '100%', resize: 'vertical' }} />
            </Field>
          </div>

          <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12 }}>
            {form.id && (
              <button type="button" onClick={() => setForm(EMPTY_LEAD)} className="pl-btn pl-btn-ghost pl-btn-sm">
                Cancelar edição
              </button>
            )}
            <button type="button" onClick={handleSave} disabled={saving} className="pl-btn pl-btn-primary pl-btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Plus size={16} />
              {saving ? 'Salvando...' : form.id ? 'Atualizar lead' : 'Cadastrar lead'}
            </button>
          </div>
        </section>

        <section className="pl-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Funil comercial</p>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--pl-ink)' }}>Leads cadastrados</h3>
            </div>
            <button
              type="button"
              onClick={() => exportLeadsCsv(filteredLeads)}
              disabled={filteredLeads.length === 0}
              className="pl-btn pl-btn-ghost pl-btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Download size={15} />
              Exportar CSV
            </button>
          </div>

          <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <select
              value={filterCanal}
              onChange={(e) => setFilterCanal(e.target.value)}
              className="pl-input"
              style={{ width: 'auto' }}
            >
              <option value="">Todos os canais</option>
              {CHANNEL_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="pl-input"
              style={{ width: 'auto' }}
            >
              <option value="">Todas as etapas</option>
              {CRM_STAGE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {(filterCanal || filterStage) && (
              <button
                type="button"
                onClick={() => { setFilterCanal(''); setFilterStage(''); }}
                className="pl-btn pl-btn-ghost pl-btn-sm"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredLeads.map((lead) => (
              <div key={lead.id} className="pl-card pl-card-paper" style={{ padding: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <p style={{ fontWeight: 600, color: 'var(--pl-ink)' }}>{lead.nome}</p>
                      <span className="pl-tag pl-tag-accent">
                        {CRM_STAGE_OPTIONS.find((option) => option.value === lead.stage)?.label || lead.stage}
                      </span>
                    </div>
                    <p style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                      {lead.contato || 'Sem contato'} • {CHANNEL_OPTIONS.find((c) => c.value === lead.canal)?.label || lead.canal} • {lead.interesse || 'Sem interesse definido'}
                    </p>
                    <p style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--pl-success)' }}>{formatCurrency(lead.monthly_value || 0)} / mês</p>
                    {lead.observacao && <p style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>{lead.observacao}</p>}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button type="button" onClick={() => handleEdit(lead)} className="pl-btn pl-btn-ghost pl-btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Pencil size={15} />
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(lead)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 8, border: '1px solid var(--pl-danger)', background: 'var(--pl-danger-soft)', padding: '6px 14px', fontSize: 13, fontWeight: 600, color: 'var(--pl-danger)', cursor: 'pointer' }}>
                      <Trash2 size={15} />
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredLeads.length === 0 && (
              <div style={{ borderRadius: 10, border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '40px 24px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                {leads.length === 0
                  ? 'Nenhum lead cadastrado ainda. Comece registrando os interessados que chegarem por WhatsApp, Instagram ou indicação.'
                  : 'Nenhum lead corresponde aos filtros selecionados.'}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
}
