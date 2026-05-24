# Estrategia de emails do Papirando

Objetivo: todos os emails devem sair com identidade Papirando, dominio proprio e copy revisada. Nada de template generico.

## Remetentes recomendados

Use poucos enderecos. Muitos remetentes confundem o usuario e diluem reputacao.

| Remetente | Uso | Responder? |
| --- | --- | --- |
| `contato@papirando.com` | Remetente principal no lancamento: cadastro, boas-vindas, suporte geral e comunicados importantes | Sim |
| `no-reply@papirando.com` | Automatizacoes puramente operacionais quando o volume crescer: senha, seguranca e alertas sem resposta esperada | Nao |
| `suporte@papirando.com` | Atendimento quando o volume crescer ou quando quiser separar do contato comercial | Sim |
| `comunidade@papirando.com` | Indicacoes, convide e ganhe, novidades de comunidade e esquadroes | Sim |
| `noticias@papirando.com` | Marketing, lancamentos, promocoes e newsletter | Sim, mas com opt-out |

Minha recomendacao inicial: configurar `contato@` agora e usar como voz principal. Criar `no-reply@`, `suporte@`, `comunidade@` e `noticias@` quando cada fluxo estiver pronto para envio real.

## Fluxos transacionais

| Fluxo | Canal tecnico | Remetente | Observacao |
| --- | --- | --- | --- |
| Confirmacao de cadastro | Supabase Auth template ou Edge Function customizada | `contato@papirando.com` | Deve avisar que o usuario ganhou 3 meses de Elite. |
| Boas-vindas apos confirmacao | Resend via Edge Function | `contato@papirando.com` | Email de marca, assinado pelo Papirando. |
| Recuperacao de senha | Supabase Auth template | `contato@papirando.com` | Link seguro gerado pelo Supabase. |
| Troca de email | Supabase Auth template | `contato@papirando.com` | Explicar que o login muda apos confirmacao. |
| Lembretes de estudo | Resend via `send-reminder-email` | `contato@papirando.com` | Ja existe funcao; precisa padronizar template. |
| Indicacao recebida | Resend via nova function | `comunidade@papirando.com` | Substitui a logica antiga de convite beta. |
| Trial perto do fim | Resend via nova function/cron | `contato@papirando.com` | Sequencia D-14, D-7, D-1 e fim do trial. |
| Pagamento/assinatura | Stripe + Resend proprio quando necessario | `no-reply@papirando.com` | Stripe tambem envia recibos se habilitado. |

## DNS e entregabilidade

No Cloudflare, o dominio precisa ter:

- Registros DKIM/SPF exigidos pelo provedor de envio, provavelmente Resend.
- DMARC em modo inicial `p=none`, depois evoluir para `quarantine` quando tudo estiver validado.
- Endereco de resposta real para emails que pedem dialogo: `contato@papirando.com`.

Nao use `contato@` para tudo. Emails automaticos em massa devem sair de `no-reply@` ou `noticias@`, preservando `contato@` como caixa humana e reputacionalmente mais sensivel.

## Proxima implementacao

1. Validar dominio no Resend e configurar DNS no Cloudflare.
2. Trocar `FROM_EMAIL` das Edge Functions para `Papirando <contato@papirando.com>`.
3. Configurar templates do Supabase Auth com HTML Papirando.
4. Criar uma pasta versionada de templates para preview e padronizacao.
5. Criar Edge Function de boas-vindas e outra de indicacao/referral.
6. Criar logs de envio e preferencias de comunicacao antes de marketing/newsletter.
