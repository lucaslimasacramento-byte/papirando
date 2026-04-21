# Papirando — Roadmap

Planejamento vivo: prioridades, próximos passos e caminho até produção. Revisar periodicamente; datas são **ordem de prioridade**, não compromisso fixo.

---

## Estado atual

- **Produto:** funcionalidades amplas já mapeadas no app (estudo, concursos, questões, simulados, flashcards, planejamento, comunidade, admin, etc.) — ver `docs/context.md`.
- **Técnico:** React 19 + Vite + Tailwind + Supabase; build estável; UI em evolução para padrão premium unificado (sidebar/header/shell).
- **Dívida:** `App.jsx` centralizado; possível drift SQL ↔ front; servidor de IA adequado só para dev sem hardening.

---

## Prioridade de execução (P0 → P2)

### P0 — Base para produção segura

1. **Supabase:** revisar RLS em todas as tabelas tocadas pelo app; testar usuário “comum” vs admin.
2. **Segredos e env:** checklist de `VITE_*` no host de deploy; nunca service role no bundle.
3. **Auth:** fluxos de sessão expirada, logout e redirecionamento consistentes.
4. **IA (se for ao ar):** serviço com autenticação, limite de uso, CORS explícito, sem proxy aberto.

### P1 — Consistência de produto e UX premium

1. **UI:** concluir padronização das páginas restantes com `page-head`, `page-shell`, cartões e botões dos tokens (`docs/ui-guidelines.md`).
2. **Mobile:** revisar drawers, tabelas largas e modais em viewports pequenas.
3. **Performance:** code-splitting por rota se o bundle crescer; lazy load de páginas admin e PDF pesado.
4. **Acessibilidade:** auditoria rápida (foco, labels, contrastes em componentes novos).

### P1 — Integridade de dados

1. Auditar `supabase/*.sql` vs chamadas em `src/lib/*Api.js` (nomes de colunas, tabelas obsoletas).
2. Documentar “fonte da verdade” para catálogo (estático vs Supabase) por entidade.
3. Testes manuais ou automatizados nos fluxos críticos: login, salvar sessão de estudo, flashcard, questão.

### P2 — Escala e operação

1. Observabilidade (logs de erro no client, métricas de API Supabase).
2. Feature flags para módulos experimentais.
3. Backups e política de retenção (lado Supabase/projeto).

---

## Próximos passos sugeridos (ordem)

1. Fechar **hardening** P0 em ambiente de staging espelhado.
2. Finalizar **sweep de UI** nas páginas que ainda usam padrões legados (hex isolado, `font-black`, max-width antigo).
3. Extrair gradualmente lógica de `App.jsx` (navegação, providers) sem big-bang.
4. Definir estratégia de **IA em produção** (ou desligar entry points até estar pronta).
5. **Go-live:** deploy estático + env + smoke test + monitoramento mínimo.

---

## Definição de “pronto para produção” (checklist resumido)

- [ ] RLS e políticas validadas para todos os fluxos do app.
- [ ] Build `npm run build` e lint sem erros bloqueantes acordados.
- [ ] Variáveis de ambiente documentadas e injetadas no provedor de hospedagem.
- [ ] Fluxo de pagamento/assinatura (se aplicável) testado ponta a ponta.
- [ ] Plano de rollback e backup de dados.
- [ ] IA, se habilitada, atrás de auth e com limites.

---

## Dependências externas

- **Supabase:** disponibilidade e quotas do projeto.
- **Provedores de IA:** chaves e limites de API.
- **Hospedagem:** compatível com SPA (fallback para `index.html` nas rotas client-side, se usar history mode).

---

## Manutenção

Após cada release significativo, atualizar **Estado atual** e marcar itens do checklist. Remover ou repriorizar itens que deixarem de fazer sentido.
