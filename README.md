# Papirando

Plataforma SaaS de estudos para concursos públicos — React 19, Vite, Tailwind e Supabase.

## Documentação interna (contexto do projeto)

Toda conversa e entrega devem alinhar-se à pasta **`docs/`**:

| Arquivo | Uso |
|---------|-----|
| [`docs/mvp-launch-checklist.md`](docs/mvp-launch-checklist.md) | Checklist do MVP para liberar uso real |
| [`docs/vercel-deploy-runbook.md`](docs/vercel-deploy-runbook.md) | Passo a passo de deploy na Vercel + Supabase + IA |
| [`docs/context.md`](docs/context.md) | Produto, stack, funcionalidades, estado macro |
| [`docs/handoff.md`](docs/handoff.md) | **Última rodada + próximo passo** — leitura obrigatória ao abrir chat novo |
| [`docs/ui-guidelines.md`](docs/ui-guidelines.md) | Identidade visual e padrões de UI |
| [`docs/architecture.md`](docs/architecture.md) | Pastas, dados, Supabase |
| [`docs/rules.md`](docs/rules.md) | Padrões de código e boas práticas |
| [`docs/roadmap.md`](docs/roadmap.md) | Prioridades e caminho até produção |

Instruções para o agente (início/fim de rodada) estão em **`.cursorrules`**.

## Scripts

```bash
npm run dev      # Vite (dev)
npm run build    # Build de produção
npm run lint     # ESLint
npm run ai:server # Servidor local de IA (opcional)
```

## Variáveis de ambiente

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PUBLIC_APP_ORIGIN` (opcional; convites. Se ausente, usa a origem atual do browser)
- `VITE_AI_SERVER_URL` (opcional; use somente URL publica. Tokens/chaves de IA ficam no servidor)

Detalhes em [`docs/architecture.md`](docs/architecture.md).
