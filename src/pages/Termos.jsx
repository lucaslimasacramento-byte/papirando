import React from 'react';
import { FileText, Mail } from 'lucide-react';

const LAST_UPDATED = '23 de maio de 2026';
const CONTACT_EMAIL = 'contato@papirando.com';
const COMPANY_NAME = 'Papirando';

export default function Termos() {
  return (
    <div className="min-h-screen bg-[var(--pl-bg)] pb-24 text-[var(--pl-ink)]">
      {/* Hero */}
      <div className="px-6 py-14" style={{ background: 'var(--pl-bg)', color: 'var(--pl-ink)' }}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center gap-2 text-blue-300">
            <FileText className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-widest">Legal</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Termos de Uso</h1>
          <p className="mt-3 text-slate-300">Atualizado em {LAST_UPDATED}</p>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="mx-auto max-w-3xl space-y-10 px-6 pt-10">

        <Section title="1. Aceitação dos termos">
          <p>
            Ao criar uma conta ou utilizar o <strong>{COMPANY_NAME}</strong>, você concorda com estes Termos
            de Uso. Se não concordar, não utilize a plataforma. Podemos atualizar estes termos periodicamente —
            você será notificado por e-mail sobre mudanças relevantes.
          </p>
        </Section>

        <Section title="2. O serviço">
          <p>
            O {COMPANY_NAME} é uma plataforma de estudos para estudantes que trazem o próprio material e querem
            organizar a rotina com IA. A plataforma oferece: ciclos de estudo, simulados, flashcards, materiais,
            mapas mentais, comunidade, esquadrões de estudo e ferramentas de
            planejamento. Alguns recursos exigem assinatura paga.
          </p>
        </Section>

        <Section title="3. Elegibilidade e cadastro">
          <ul className="list-disc space-y-2 pl-5">
            <li>Você deve ter ao menos 18 anos ou ter autorização de responsável legal.</li>
            <li>Você é responsável por manter a segurança da sua senha e conta.</li>
            <li>É proibido criar contas falsas, duplicadas ou em nome de terceiros sem autorização.</li>
            <li>Dados de cadastro falsos (CPF inválido, e-mail de terceiros) resultam em suspensão imediata.</li>
          </ul>
        </Section>

        <Section title="4. Uso aceitável">
          <p>Você concorda em <strong>não</strong>:</p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>Compartilhar sua conta ou vender acesso à plataforma.</li>
            <li>Utilizar bots, scrapers ou automações para extrair conteúdo.</li>
            <li>Publicar conteúdo ofensivo, difamatório, ilegal ou que viole direitos de terceiros na comunidade.</li>
            <li>Tentar burlar sistemas de segurança, rate limits ou políticas de acesso.</li>
            <li>Abusar do sistema de referral ou esquadrões para obter vantagens indevidas.</li>
          </ul>
        </Section>

        <Section title="5. Conteúdo do usuário">
          <p>
            Conteúdo que você cria na plataforma (posts, flashcards, mapas mentais, etc.) permanece seu.
            Ao publicar, você nos concede licença não exclusiva para exibir esse conteúdo aos demais usuários
            da plataforma. Não vendemos seu conteúdo a terceiros.
          </p>
          <p className="mt-2">
            Reservamos o direito de remover conteúdo que viole estes termos ou a lei.
          </p>
        </Section>

        <Section title="6. Assinatura e pagamentos">
          <ul className="list-disc space-y-2 pl-5">
            <li>Planos pagos são cobrados via Stripe no ciclo escolhido (mensal ou anual).</li>
            <li>Cancelamentos entram em vigor ao fim do período já pago — sem reembolso proporcional, exceto nos primeiros 7 dias (garantia de satisfação).</li>
            <li>Preços podem ser alterados com aviso prévio de 30 dias por e-mail.</li>
            <li>Em caso de inadimplência, o acesso premium é suspenso até regularização.</li>
          </ul>
        </Section>

        <Section title="7. Propriedade intelectual">
          <p>
            Todo o conteúdo produzido pelo {COMPANY_NAME} (textos, questões, videoaulas, layout, código) é
            protegido por direitos autorais. É proibida a reprodução, distribuição ou uso comercial sem
            autorização expressa por escrito.
          </p>
        </Section>

        <Section title="8. Disponibilidade e limitação de responsabilidade">
          <p>
            Buscamos disponibilidade de 99,5% mas não garantimos serviço ininterrupto. Não somos responsáveis
            por danos decorrentes de indisponibilidade, perda de dados ou decisões tomadas com base em conteúdo
            da plataforma. Nossa responsabilidade total está limitada ao valor pago nos últimos 3 meses.
          </p>
        </Section>

        <Section title="9. Suspensão e encerramento">
          <p>
            Podemos suspender ou encerrar sua conta, com ou sem aviso prévio, em caso de violação destes
            termos. Você pode encerrar sua conta a qualquer momento pela aba Segurança do seu perfil.
          </p>
        </Section>

        <Section title="10. Lei aplicável e foro">
          <p>
            Estes termos são regidos pela legislação brasileira. Fica eleito o foro da Comarca de Salvador/BA
            para dirimir quaisquer controvérsias, com renúncia a qualquer outro por mais privilegiado que seja.
          </p>
        </Section>

        <Section title="11. Contato">
          <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <Mail className="h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Dúvidas sobre estes termos:</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-blue-700 hover:underline">
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-slate-900">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}
