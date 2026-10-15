# Proposta — Bloqueio após o trial (plano único Papiro)

> 2026-10-15 · **Status: aguardando aprovação do Lucas. Nada foi implementado.**
> Regra confirmada: plano único **Papiro**. 30 dias grátis no cadastro. Depois disso o pagamento é obrigatório para usar a plataforma. Não existe plano grátis permanente. Admin nunca é bloqueado.

---

## 1. O que hoje supõe um plano grátis ("Folha")

### 1.1 Núcleo de acesso (decide quem entra)

| Onde | O que faz hoje | Problema |
|---|---|---|
| `src/App.jsx:1504-1514` | `isPremiumPlan = isAdmin \|\| isStripeActive \|\| hasPaidProfilePlan`. Sem premium, o usuário segue usando o app com limites. | Fim do trial vira "Folha", não bloqueio. |
| `src/lib/subscriptionApi.js` `useSubscription` | Só busca linhas `active`/`trialing`. Já descarta linha vencida (`current_period_end < now`). | `past_due` e `canceled` somem da consulta → caem direto no "Folha". Quem cancela perde o acesso na hora, mas o Termos promete acesso até o fim do período pago. |
| `src/App.jsx:1507-1508` `hasPaidProfilePlan` | `profiles.subscription_plan` em `papiro/elite/tatico/beta` libera premium. | Esse caminho **não tem validade**: libera para sempre. Hoje serve para beta e concessão manual. |
| `src/components/OnboardingWizard.jsx:986-991` | Chama `start-trial` e engole o erro. | Se a chamada falhar, o usuário fica sem linha em `subscriptions` → hoje vira Folha; com a regra nova, seria bloqueado no dia 1. (O `register-free` também cria o trial, então isso só pega contas antigas ou falhas.) |
| `supabase/functions/start-trial` e `register-free` (comentários) | Dizem que o trial "devolve o usuário ao plano Folha". | Só comentário. Não precisa mexer na função para o bloqueio. |

### 1.2 Mecanismo de limites do Folha (fica sem uso)

- `src/lib/planConfig.js` — entrada `folha` (preço 0, 3 cursos, 10 questões/dia) e `gratuito` legado.
- `src/lib/planLimits.js` — `COUNTED_LIMITS` e `FEATURE_ACCESS`, todos com "limite do Folha".
- `src/lib/planLimitsConfig.js` — limites editáveis no Admin > Configurações (`EDITABLE_PLAN_KEYS = ['folha','papiro']`).
- `src/hooks/usePlanLimits.js` — contador `get_usage`/`increment_usage`.
- `src/components/PremiumGate.jsx` — tela, overlay, banner e botão de "assine para liberar".
- `src/App.jsx:5059` `getCourseLimitFromProfile` — limite de 3 cursos do Folha; `remainingCourseSlots` e `limiteAtingido` no ConcursoDetalhe.
- Páginas com gate:
  - `Flashcards.jsx` — gerar com IA
  - `MapasMentais.jsx` — gerar mapa
  - `Materiais.jsx` — uploads por mês
  - `Questoes.jsx:273` — `DAILY_LIMIT = 10` fixo no código
  - `Redacoes.jsx` — correções por mês
  - `Simulados.jsx` — simulados por mês
  - `AppTabContent.jsx:1009` — Audiobooks inteiro
  - `Legislacao` — destaques
  - Comunidades — `isPremium`/`isElite`, sala VIP, criar esquadrão

### 1.3 Textos para o usuário

| Onde | Texto atual | Ajuste |
|---|---|---|
| `src/pages/Assinatura.jsx:6-26` | Card **Folha** "Para começar sem compromisso", botão "Continuar no Folha", lista de limites. A lista nem bate com `planLimits.js` (3 uploads ≠ 1; 15 msgs ≠ 10). | Remover o card; deixar só o Papiro (mensal/anual) e o status do trial. |
| `src/pages/Perfil.jsx:451-458` | Plano atual lido de `profiles.subscription_plan`. | **Bug, independe da regra:** `register-free` grava `gratuito` e o webhook não atualiza o profile, então quem está no trial **ou pagando** vê "Folha" como plano atual. Tem que ler de `subscriptions`. |
| `SubscriptionPlanSeal.jsx`, `Header.jsx:72`, `App.jsx:7542` | Selo "Folha — toque para conhecer o Papiro". | Sem Folha: selo do trial (contagem) ou do Papiro; usuário bloqueado não vê o header normal. |
| `src/pages/Login.jsx:761` | "Conta grátis. Plano de estudos personalizado…" | "30 dias grátis do Papiro. Depois, R$ 19,90/mês." |
| `OnboardingWizard.jsx:116-120` | "30 dias completos… sem cartão e sem compromisso. Cancele quando quiser." | Manter "sem cartão" e acrescentar: "depois dos 30 dias, a assinatura é necessária para continuar". |
| `src/pages/Termos.jsx:74-79` | "cobrados via **Stripe**"; não fala do trial; "acesso **premium** é suspenso" (dá a entender que sobra um acesso grátis). | Trocar para Asaas; criar cláusula do período de avaliação de 30 dias; "o acesso à plataforma é suspenso até a regularização; seus dados ficam guardados". |
| Admin: `AdminUsuarios.jsx:12,342,393`, `AdminAssinaturas.jsx:325`, `AdminFinance.jsx:81`, `lib/adminFinance.js:39-43` | Rótulo "Folha"/"Gratuito"; conceder plano usa `'estudio'` (plano que não existe). O MRR é calculado por `profiles.subscription_plan`. | O MRR sai sempre ~0, porque o profile fica em `gratuito`. Precisa ser calculado por `subscriptions`. Trocar a coluna "Folha" por estados: Trial / Ativo / Inadimplente / Expirado. |

Não há landing page neste repositório. Se o site institucional falar em "plano grátis", também precisa de revisão.

### 1.4 O que NÃO existe hoje

- **Nenhuma checagem no servidor.** RLS, Edge Functions e servidor de IA não olham a assinatura. Hoje todo gate (Folha ou bloqueio) é só visual: quem tem o token consegue chamar o Supabase e a IA direto. O que pesa é o custo de IA.

---

## 2. Proposta de comportamento

### 2.1 Estados de acesso

| Estado | Condição (linha mais recente em `subscriptions`) | Acesso |
|---|---|---|
| **Admin** | `isAdmin` | Total, sempre |
| **Trial** | `trialing` e `current_period_end > agora` | Total + aviso de dias restantes |
| **Ativo** | `active` e período válido | Total |
| **Cancelado no período** | `canceled` e `current_period_end > agora` | Total até o fim do período (cumpre o Termos) |
| **Inadimplente** | `past_due` | Total por **N dias de carência** (sugestão: 3) com faixa vermelha; depois bloqueia |
| **Bloqueado** | trial vencido, pagamento vencido, cancelado vencido ou sem linha | Só tela de assinatura |

A regra fica em uma função só (ex.: `resolveAccess(subscription, isAdmin)` em `subscriptionApi.js`). `useSubscription` passa a buscar a linha mais recente de qualquer status e devolve `loading`. Assim, enquanto carrega, mostramos "Carregando…" e o bloqueio não pisca.

### 2.2 Tela de bloqueio

Um gate em `App.jsx`, logo depois do gate de onboarding (mesmo padrão, tela cheia, fora do layout normal):

```
Seu período gratuito terminou.            (ou "Seu pagamento não foi confirmado.")
Seus cursos, questões e anotações continuam guardados.
Assine o Papiro para voltar a estudar de onde parou.

[ Mensal R$ 19,90 ]  [ Anual R$ 159,90 · 33% off ]
[ Assinar o Papiro ]

Meus dados (CPF obrigatório para o Asaas) · Exportar meus dados · Excluir conta · Sair
Termos · Privacidade · Falar com o suporte
```

O que fica acessível para o bloqueado:
- **Perfil** só com as abas Dados, Segurança, Assinatura e LGPD. Precisa ficar aberto porque o checkout exige CPF (`create-checkout-session` devolve `CPF_REQUIRED`).
- **Exportar dados** e **Excluir conta**: os botões LGPD que já existem em `Perfil.jsx:1265+`.
- **Sair**.
- Volta do checkout: o `CheckoutResultBanner` + `refreshSubscription` já existem; depois do pagamento o gate some sozinho.

Nada é apagado. Os dados ficam no banco enquanto a conta existir.

### 2.3 Avisos antes de vencer

- O selo do header já faz a contagem do trial. Somar um banner discreto no D-5 e um mais forte no D-1 ("Seu acesso termina amanhã — assine para não perder o ritmo").
- Opcional, depois: e-mail no D-3 (depende do Resend / `send-reminder-email`, que está em espera).

### 2.4 Limpeza do Folha (mesmo PR ou um segundo)

- Remover `folha`/`gratuito` de `planConfig`, o card Folha de `Assinatura.jsx` e o `FEATURE_ACCESS`/`COUNTED_LIMITS`.
- Remover os `PremiumGate`/`usePlanLimits` das páginas: com o gate global, quem chega nelas sempre tem acesso, então `isPremium` vira sempre `true` e pode sair.
- Remover o limite de 3 cursos (`getCourseLimitFromProfile`). O override manual `profiles.max_courses` pode ficar, se você quiser.
- Admin: estados no lugar de "Folha"; MRR por `subscriptions`; tirar `'estudio'`.
- Corrigir o bug do Perfil (plano atual lido de `subscriptions`).
- Termos, Login e Onboarding com os textos da tabela 1.3.

### 2.5 Fase 2 (precisa de aprovação, mexe em banco/Edge)

- Função SQL `has_active_access(uid)` com a mesma regra de 2.1.
- Checagem nas chamadas de IA (servidor de IA / Edge Functions de IA) → 402 se não tiver acesso. É o que realmente protege o custo.
- Opcional: RLS de escrita nas tabelas de estudo. Fica para depois, porque é invasivo.

---

## 3. Decisões que preciso de você

1. **Carência para inadimplente (`past_due`)**: 0, 3 ou 7 dias?
2. **Contas sem linha em `subscriptions`** (antigas ou com falha no `start-trial`): bloquear direto, ou dar o trial agora se a conta tiver menos de 30 dias?
3. **`profiles.subscription_plan = 'beta'`** (e concessões manuais pelo profile): manter como acesso vitalício, ou migrar para linha `manual` em `subscriptions` com data de fim?
4. **Usuários reais hoje** que já passaram dos 30 dias e estão no "Folha": serão bloqueados no deploy. Avisar antes ou dar uns dias de prazo? Para saber quantos são, rode a consulta abaixo. O Claude não tem permissão de leitura no banco nesta sessão.
5. **Limpeza do Folha** junto com o bloqueio (um PR) ou separado (dois)?
6. **Fase 2 (checagem no servidor)**: entra antes do lançamento?

```sql
with s as (
  select distinct on (user_id) user_id, status, provider, current_period_end
  from subscriptions order by user_id, created_at desc
)
select
  case
    when p.role = 'admin' then 'admin'
    when s.user_id is null then 'sem_assinatura'
    when s.status in ('active','trialing') and (s.current_period_end is null or s.current_period_end > now())
      then 'liberado_' || s.status || '_' || coalesce(s.provider,'?')
    else 'expirado_' || s.status || '_' || coalesce(s.provider,'?')
  end as situacao,
  coalesce(p.subscription_plan,'(null)') as profile_plan,
  count(*) as n
from profiles p left join s on s.user_id = p.id
group by 1,2 order by 3 desc;
```
