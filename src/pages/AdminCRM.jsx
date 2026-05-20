import React, { useMemo, useState } from 'react';
import {
  BadgeCheck,
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
import { buildCrmSnapshot, CRM_STAGE_OPTIONS, normalizeLead } from '../lib/adminCrm';
import { formatCurrency } from '../lib/adminFinance';

const CHANNEL_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'indicacao', label: 'IndicaÃ§Ã£o' },
  { value: 'trafego_pago', label: 'TrÃ¡fego pago' },
  { value: 'organico', label: 'OrgÃ¢nico' },
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

export default function AdminCRM({ leads = [], currentUserEmail = '', onSaveLead, onDeleteLead }) {
  const [form, setForm] = useState(EMPTY_LEAD);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const crm = useMemo(() => buildCrmSnapshot(leads), [leads]);

  const sortedLeads = useMemo(
    () =>
      [...leads].sort((first, second) => {
        if (first.stage !== second.stage) return String(first.stage).localeCompare(String(second.stage));
        return String(second.created_at || '').localeCompare(String(first.created_at || ''));
      }),
    [leads]
  );

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
      setFeedback({ type: 'error', message: error.message || 'NÃ£o foi possÃ­vel salvar o lead.' });
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
    const confirmed = window.confirm(`Excluir o lead "${lead.nome}"?`);
    if (!confirmed) return;
    setFeedback({ type: '', message: '' });
    try {
      await onDeleteLead?.(lead);
      if (form.id === lead.id) setForm(EMPTY_LEAD);
      setFeedback({ type: 'success', message: 'Lead removido.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'NÃ£o foi possÃ­vel excluir o lead.' });
    }
  };

  return (
    <div className="page-shell mx-auto flex h-full w-full max-w-[1320px] flex-col gap-6">
      {feedback.message ? (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
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
        trailingClassName="xl:max-w-[16rem]"
        trailing={
          <div className="rounded-[1.5rem] border border-white/15 bg-white/10 px-4 py-3 text-left text-sm sm:px-5 sm:py-4 sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Operando como</p>
            <p className="mt-1.5 min-w-0 break-all font-semibold text-white">{currentUserEmail}</p>
          </div>
        }
      />

      <section className="rounded-[2.4rem] border border-ink-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="grid gap-4 md:grid-cols-5">
          <SummaryCard icon={Users} label="Leads" value={crm.total} />
          <SummaryCard icon={MessageCircle} label="Em contato" value={crm.emContato} />
          <SummaryCard icon={Target} label="Propostas" value={crm.propostas} />
          <SummaryCard icon={BadgeCheck} label="Fechados" value={crm.fechados} />
          <SummaryCard icon={TrendingUp} label="Pipeline" value={formatCurrency(crm.pipelineMensal)} />
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-[2rem] border border-ink-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Cadastro comercial</p>
            <h3 className="mt-2 text-2xl font-semibold text-ink-900">{form.id ? 'Editar lead' : 'Novo lead'}</h3>
          </div>

          <div className="grid gap-4">
            <Field label="Nome">
              <input value={form.nome} onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))} className="w-full rounded-2xl border border-ink-200 bg-ink-50/70 px-4 py-3 text-sm font-semibold text-ink-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50" />
            </Field>
            <Field label="Contato">
              <input value={form.contato} onChange={(e) => setForm((prev) => ({ ...prev, contato: e.target.value }))} placeholder="Telefone, e-mail ou @usuario" className="w-full rounded-2xl border border-ink-200 bg-ink-50/70 px-4 py-3 text-sm font-semibold text-ink-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50" />
            </Field>
            <Field label="Canal">
              <select value={form.canal} onChange={(e) => setForm((prev) => ({ ...prev, canal: e.target.value }))} className="w-full rounded-2xl border border-ink-200 bg-ink-50/70 px-4 py-3 text-sm font-semibold text-ink-700 outline-none focus:border-brand-500">
                {CHANNEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Interesse principal">
              <input value={form.interesse} onChange={(e) => setForm((prev) => ({ ...prev, interesse: e.target.value }))} placeholder="Ex: PMAL, carreiras policiais, plano elite" className="w-full rounded-2xl border border-ink-200 bg-ink-50/70 px-4 py-3 text-sm font-semibold text-ink-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50" />
            </Field>
            <Field label="Etapa do funil">
              <select value={form.stage} onChange={(e) => setForm((prev) => ({ ...prev, stage: e.target.value }))} className="w-full rounded-2xl border border-ink-200 bg-ink-50/70 px-4 py-3 text-sm font-semibold text-ink-700 outline-none focus:border-brand-500">
                {CRM_STAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Valor mensal potencial">
              <input value={form.monthly_value} onChange={(e) => setForm((prev) => ({ ...prev, monthly_value: e.target.value }))} placeholder="59,90" className="w-full rounded-2xl border border-ink-200 bg-ink-50/70 px-4 py-3 text-sm font-semibold text-ink-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50" />
            </Field>
            <Field label="ObservaÃ§Ã£o">
              <textarea value={form.observacao} onChange={(e) => setForm((prev) => ({ ...prev, observacao: e.target.value }))} rows={4} className="w-full rounded-[1.5rem] border border-ink-200 bg-ink-50/70 px-4 py-4 text-sm font-semibold text-ink-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50" />
            </Field>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {form.id && (
              <button type="button" onClick={() => setForm(EMPTY_LEAD)} className="rounded-xl border border-ink-200 bg-white px-5 py-3 text-sm font-bold text-ink-600">
                Cancelar ediÃ§Ã£o
              </button>
            )}
            <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-70">
              <Plus size={16} />
              {saving ? 'Salvando...' : form.id ? 'Atualizar lead' : 'Cadastrar lead'}
            </button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-ink-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Funil comercial</p>
            <h3 className="mt-2 text-2xl font-semibold text-ink-900">Leads cadastrados</h3>
          </div>

          <div className="space-y-3">
            {sortedLeads.map((lead) => (
              <div key={lead.id} className="rounded-[1.4rem] border border-ink-200 bg-ink-50/70 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink-900">{lead.nome}</p>
                      <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                        {CRM_STAGE_OPTIONS.find((option) => option.value === lead.stage)?.label || lead.stage}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-ink-500">
                      {lead.contato || 'Sem contato'} â€¢ {lead.canal} â€¢ {lead.interesse || 'Sem interesse definido'}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-emerald-700">{formatCurrency(lead.monthly_value || 0)} / mÃªs</p>
                    {lead.observacao && <p className="mt-2 text-sm font-medium text-ink-500">{lead.observacao}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleEdit(lead)} className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-600">
                      <Pencil size={15} />
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(lead)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      <Trash2 size={15} />
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {sortedLeads.length === 0 && (
              <div className="rounded-[1.5rem] border border-dashed border-ink-200 bg-white px-6 py-10 text-center text-sm font-semibold text-ink-500">
                Nenhum lead cadastrado ainda. Comece registrando os interessados que chegarem por WhatsApp, Instagram ou indicaÃ§Ã£o.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
      <div className="rounded-[1.5rem] border border-ink-200 bg-ink-50/70 p-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700">
        <Icon size={12} />
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold text-ink-900">{value}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">{label}</label>
      {children}
    </div>
  );
}


