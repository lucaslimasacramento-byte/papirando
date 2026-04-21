# Papirando — Regras de desenvolvimento

Padrões obrigatórios para manter qualidade, segurança e consistência com o posicionamento **SaaS premium**.

---

## Geral

1. **Escopo mínimo:** alterar só o necessário para a tarefa; evitar refatorações cosméticas não solicitadas.
2. **Consistência:** antes de escrever código novo, ler arquivos vizinhos e copiar estilo (imports, hooks, nomes, nível de comentário).
3. **Documentação:** não criar arquivos `.md` novos sem necessidade de produto; a pasta `docs/` é a base de contexto — atualizar os documentos existentes quando o comportamento do sistema mudar.
4. **Idioma:** UI e textos de produto em **português** (pt-BR); código e nomes de variáveis em inglês quando já for o padrão do arquivo.

---

## Frontend (React)

- Preferir **componentes funcionais** e hooks.
- **Estado:** elevar estado apenas quando várias telas precisarem; caso contrário manter local à página.
- **Efeitos:** `useEffect` com dependências corretas; evitar fetch duplicado sem necessidade (considerar consolidação em um hook ou no pai).
- **Chaves em listas:** estáveis e previsíveis (`id` de entidade).
- **Erros:** boundary já existe (`ErrorBoundary.jsx`); em operações async, tratar erro com feedback ao usuário quando a tela já faz isso no mesmo padrão.

---

## Estilo e Tailwind

- Usar classes utilitárias e **component classes** de `src/index.css` (`.page-head`, `.section-card`, `.btn-primary`, etc.) em telas novas.
- **Não** introduzir paleta paralela; mapear para tokens `--*` ou slate/blue alinhados às diretrizes em `docs/ui-guidelines.md`.
- Sidebar e layout: garantir `flex-col` na navegação vertical e cores de texto explícitas no tema escuro.

---

## Dados e Supabase

- Acesso a tabelas via `src/lib/supabase.js` e módulos `*Api.js` — evitar espalhar `supabase.from` em dezenas de componentes sem camada.
- **Nunca** commitar chaves secretas; apenas `VITE_*` anon no front.
- Assumir **RLS ativo**; testar com usuário real e não só admin.
- Migrações: refletir mudanças em `supabase/*.sql` e comunicar dependência de ordem de execução se houver.

---

## IA e servidores auxiliares

- `ai-server.mjs` não deve ser exposto publicamente sem camada de auth e política de CORS restrita.
- Não enviar dados pessoais sensíveis a provedores externos sem base legal e configuração explícita.

---

## Admin e permissões

- Páginas admin são conveniência; **autorização real** é no backend (RLS, policies, roles).
- Evitar emails ou IDs hardcoded de “super admin” sem documentar e sem equivalente no servidor.
- Tudo que for **exclusivo de ADMIN** na UI deve receber tratamento visual de destaque em **tom avermelhado** (badges, chips, botões secundários, blocos informativos ou estados exclusivos), para diferenciar claramente áreas operacionais do fluxo comum do aluno.

---

## Git e qualidade

- Rodar `npm run lint` antes de merge quando houver mudança em JS/JSX.
- Rodar `npm run build` após mudanças estruturais significativas.
- Commits e PRs: descrições claras em português ou inglês consistente com o repo, explicando **o quê** e **por quê**.

---

## O que a IA (e humanos) devem evitar

- Gerar telas “bootstrap genérico” ou densidade visual incompatível com o Papirando.
- Criar novas larguras máximas sem alinhar ao **1320px** e às utilities em `index.css`.
- Depender de CDN Tailwind no `index.html` (o projeto usa build Tailwind).
- Ignorar o proxy `/supabase` em diagnósticos de “CORS em dev”.

---

## Referência

- `.cursorrules` no repositório pode conter checklists de rodadas de UI; não substitui este documento.
- Arquitetura: `docs/architecture.md`
