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
    const confirmed = window.confirm(`Excluir o lead "${lead.nome}"?`);
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
    <div className="pl-paper-bg" style={{ maxWidth: 1320, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, padding: '28px 28px 48px' }}>
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

      <section className="rounded-[2.4rem] border border-gray-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
              <Users size={13} />
              CRM admin
            </div>
            <h2 className="page-title mt-5 text-4xl font-semibold tracking-tight text-slate-900">Leads e oportunidades</h2>
            <p className="mt-4 max-w-3xl text-base font-medium leading-relaxed text-gray-500">
              Registre interessados, acompanhe o funil comercial e enxergue o potencial de receita que ainda não virou assinatura.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50/70 px-5 py-4 text-sm shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Operando como</p>
            <p className="mt-2 font-semibold text-slate-900">{currentUserEmail}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          <SummaryCard icon={Users} label="Leads" value={crm.total} />
          <SummaryCard icon={MessageCircle} label="Em contato" value={crm.emContato} />
          <SummaryCard icon={Target} label="Propostas" value={crm.propostas} />
          <SummaryCard icon={BadgeCheck} label="Fechados" value={crm.fechados} />
          <SummaryCard icon={TrendingUp} label="Pipeline" value={formatCurrency(crm.pipelineMensal)} />
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Cadastro comercial</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">{form.id ? 'Editar lead' : 'Novo lead'}</h3>
          </div>

          <div className="grid gap-4">
            <Field label="Nome">
              <input value={form.nome} onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
            </Field>
            <Field label="Contato">
              <input value={form.contato} onChange={(e) => setForm((prev) => ({ ...prev, contato: e.target.value }))} placeholder="Telefone, e-mail ou @usuario" className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
            </Field>
            <Field label="Canal">
              <select value={form.canal} onChange={(e) => setForm((prev) => ({ ...prev, canal: e.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500">
                {CHANNEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Interesse principal">
              <input value={form.interesse} onChange={(e) => setForm((prev) => ({ ...prev, interesse: e.target.value }))} placeholder="Ex: PMAL, carreiras policiais, plano elite" className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
            </Field>
            <Field label="Etapa do funil">
              <select value={form.stage} onChange={(e) => setForm((prev) => ({ ...prev, stage: e.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500">
                {CRM_STAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Valor mensal potencial">
              <input value={form.monthly_value} onChange={(e) => setForm((prev) => ({ ...prev, monthly_value: e.target.value }))} placeholder="59,90" className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
            </Field>
            <Field label="Observação">
              <textarea value={form.observacao} onChange={(e) => setForm((prev) => ({ ...prev, observacao: e.target.value }))} rows={4} className="w-full rounded-[1.5rem] border border-gray-200 bg-gray-50/70 px-4 py-4 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
            </Field>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {form.id && (
              <button type="button" onClick={() => setForm(EMPTY_LEAD)} className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-600">
                Cancelar edição
              </button>
            )}
            <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-70">
              <Plus size={16} />
              {saving ? 'Salvando...' : form.id ? 'Atualizar lead' : 'Cadastrar lead'}
            </button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Funil comercial</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Leads cadastrados</h3>
          </div>

          <div className="space-y-3">
            {sortedLeads.map((lead) => (
              <div key={lead.id} className="rounded-[1.4rem] border border-gray-200 bg-gray-50/70 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{lead.nome}</p>
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                        {CRM_STAGE_OPTIONS.find((option) => option.value === lead.stage)?.label || lead.stage}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-gray-500">
                      {lead.contato || 'Sem contato'} • {lead.canal} • {lead.interesse || 'Sem interesse definido'}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-emerald-700">{formatCurrency(lead.monthly_value || 0)} / mês</p>
                    {lead.observacao && <p className="mt-2 text-sm font-medium text-gray-500">{lead.observacao}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleEdit(lead)} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600">
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
              <div className="rounded-[1.5rem] border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm font-semibold text-gray-500">
                Nenhum lead cadastrado ainda. Comece registrando os interessados que chegarem por WhatsApp, Instagram ou indicação.
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
      <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50/70 p-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700">
        <Icon size={12} />
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">{label}</label>
      {children}
    </div>
  );
}
