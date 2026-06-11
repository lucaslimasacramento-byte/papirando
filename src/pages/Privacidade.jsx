import React from 'react';
import { ShieldCheck, Mail } from 'lucide-react';

const LAST_UPDATED = '23 de maio de 2026';
const CONTACT_EMAIL = 'privacidade@papirando.com';
const COMPANY_NAME = 'Papirando';

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-[var(--pl-bg)] pb-24 text-[var(--pl-ink)]">
      {/* Hero */}
      <div className="px-6 py-14" style={{ background: 'var(--pl-bg)', color: 'var(--pl-ink)' }}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center gap-2 text-[var(--pl-accent)]">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-widest">Privacidade</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Política de Privacidade</h1>
          <p className="mt-3 text-[var(--pl-ink-3)]">Atualizado em {LAST_UPDATED}</p>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="mx-auto max-w-3xl space-y-10 px-6 pt-10">

        <Section title="1. Quem somos">
          <p>
            O <strong>{COMPANY_NAME}</strong> é uma plataforma de estudos para estudantes que organizam a rotina
            a partir dos próprios materiais, operada por Lucas Lima Sacramento. Este documento explica quais dados pessoais coletamos, como os utilizamos e
            quais são os seus direitos como titular de dados, nos termos da Lei Geral de Proteção de Dados
            Pessoais (LGPD — Lei nº 13.709/2018).
          </p>
        </Section>

        <Section title="2. Dados que coletamos">
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Dados de cadastro:</strong> nome, e-mail, CPF, data de nascimento e foto de perfil.</li>
            <li><strong>Dados de uso:</strong> registros de estudo, simulados realizados, flashcards, ciclos de estudo, planos de calendário e progresso em materiais.</li>
            <li><strong>Dados técnicos:</strong> endereço IP (anonimizado com hash), tipo de dispositivo e logs de acesso para segurança e prevenção de fraudes.</li>
            <li><strong>Dados de pagamento:</strong> gerenciados diretamente pela Stripe. Não armazenamos dados de cartão em nossos servidores.</li>
            <li><strong>Dados de indicação:</strong> código de referral e vínculo com quem indicou você (se aplicável).</li>
          </ul>
        </Section>

        <Section title="3. Como usamos seus dados">
          <ul className="list-disc space-y-2 pl-5">
            <li>Prestar e melhorar os serviços da plataforma.</li>
            <li>Personalizar sua experiência de estudos e recomendações.</li>
            <li>Processar pagamentos e gerenciar sua assinatura.</li>
            <li>Enviar comunicações sobre o serviço (você pode cancelar a qualquer momento).</li>
            <li>Prevenir fraudes, abusos e garantir a segurança da plataforma.</li>
            <li>Cumprir obrigações legais e regulatórias.</li>
          </ul>
        </Section>

        <Section title="4. Base legal do tratamento">
          <p>Tratamos seus dados com base em:</p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li><strong>Execução de contrato</strong> — para prestar os serviços contratados.</li>
            <li><strong>Legítimo interesse</strong> — para segurança, prevenção de fraudes e melhoria do serviço.</li>
            <li><strong>Consentimento</strong> — para comunicações de marketing (revogável a qualquer momento).</li>
            <li><strong>Obrigação legal</strong> — quando exigido por lei.</li>
          </ul>
        </Section>

        <Section title="5. Compartilhamento de dados">
          <p>Não vendemos seus dados. Compartilhamos apenas com:</p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li><strong>Supabase</strong> — infraestrutura de banco de dados e autenticação (servidores na AWS us-east-1).</li>
            <li><strong>Stripe</strong> — processamento de pagamentos.</li>
            <li><strong>Vercel</strong> — hospedagem da aplicação web.</li>
            <li><strong>Cloudflare</strong> — CDN e proteção contra ataques.</li>
            <li><strong>Autoridades públicas</strong> — quando exigido por lei ou ordem judicial.</li>
          </ul>
        </Section>

        <Section title="6. Retenção de dados">
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Após a exclusão da conta, os dados são
            removidos em até 30 dias, exceto quando a retenção for exigida por lei (ex.: dados fiscais por
            5 anos).
          </p>
        </Section>

        <Section title="7. Seus direitos (LGPD)">
          <p>Você tem direito a:</p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li><strong>Acesso</strong> — saber quais dados temos sobre você.</li>
            <li><strong>Correção</strong> — corrigir dados incompletos, inexatos ou desatualizados.</li>
            <li><strong>Portabilidade</strong> — exportar seus dados em formato legível por máquina.</li>
            <li><strong>Exclusão</strong> — solicitar a remoção dos seus dados pessoais.</li>
            <li><strong>Revogação do consentimento</strong> — para tratamentos baseados em consentimento.</li>
            <li><strong>Oposição</strong> — se discordar de algum tratamento baseado em legítimo interesse.</li>
          </ul>
          <p className="mt-4">
            Exercite seus direitos diretamente na aba <strong>Segurança</strong> do seu perfil (botões
            "Exportar meus dados" e "Solicitar exclusão de conta") ou pelo e-mail abaixo.
          </p>
        </Section>

        <Section title="8. Segurança">
          <p>
            Adotamos medidas técnicas e organizacionais para proteger seus dados: criptografia em trânsito
            (TLS 1.2+) e em repouso, controle de acesso por função (RBAC), políticas de segurança em nível
            de linha (RLS), autenticação por e-mail verificado e monitoramento de acessos.
          </p>
        </Section>

        <Section title="9. Cookies e rastreamento">
          <p>
            Usamos apenas cookies estritamente necessários para autenticação e preferências de sessão. Não
            utilizamos cookies de rastreamento de terceiros ou publicidade comportamental.
          </p>
        </Section>

        <Section title="10. Contato — Encarregado de Dados (DPO)">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--pl-rule-2)] bg-[var(--pl-accent-soft)] p-4">
            <Mail className="h-5 w-5 shrink-0 text-[var(--pl-accent)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--pl-ink)]">Para exercer seus direitos ou tirar dúvidas:</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-[var(--pl-accent)] hover:underline">
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
          <p className="mt-3 text-sm text-[var(--pl-ink-3)]">
            Responderemos em até 15 dias úteis, conforme previsto na LGPD.
          </p>
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-[var(--pl-ink)]">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-[var(--pl-ink-2)]">{children}</div>
    </section>
  );
}
