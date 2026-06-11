# Checklist de Validação — Versão para Cowork (agente)

> **Instrução para o agente:** você vai validar o app Papirando tela a tela usando o navegador.
> Execute os blocos NA ORDEM. Para cada item: execute os passos, compare com o resultado esperado e marque ✅ ou ❌.
> Ao final, preencha o **Relatório de Resultados** no fim deste arquivo com TODOS os achados.
>
> **Regras:**
> - Falhou? NÃO tente corrigir o código. Registre: o que fez, o que esperava, o que aconteceu, mensagem de erro/console, e tire screenshot.
> - Item impossível de testar (precisa de e-mail real, pagamento, etc.)? Marque ⏭️ com o motivo — esses ficam para o Lucas.
> - Monitore o console do navegador (F12) durante TODA a sessão. Qualquer erro vermelho não relacionado ao teste atual também vai pro relatório.
> - Teste em viewport desktop (~1440px) e repita os fluxos principais em ~390px (mobile).

---

## Ambiente

| Item | Valor |
|---|---|
| URL local (dev) | `http://localhost:5176` (rodar `npm run dev` no projeto) |
| URL produção | a URL do deploy Vercel (preferir produção se disponível) |
| Conta de teste 1 (Folha/free) | criar durante o Bloco 1 — e-mail: usar alias tipo `teste+folha-<data>@...` fornecido pelo Lucas, ou e-mail descartável |
| Conta de teste 2 (Papiro/paga) | ⏭️ depende de trial/pagamento — pedir ao Lucas credenciais de uma conta Papiro, ou pular itens "Conta Papiro" |

**Antes de começar:** confirme com o Lucas qual URL usar e se há credenciais de teste prontas. Se não houver resposta, use produção e crie a conta Folha.

---

## Bloco 0 — Testes globais

| # | Passos | Esperado |
|---|---|---|
| G1 | Login → logout → login de novo | Sem travar, sem erro no console |
| G2 | Em qualquer tela logada, pressione F5 | Continua logado, na mesma tela |
| G3 | Alterne para dark mode e navegue por: Dashboard, Perfil, Histórico, Flashcards, Lembretes | Nenhum texto ilegível, nenhum fundo branco vazado |
| G4 | Reduza o viewport para 390px e abra/feche o menu lateral em 3 telas | Sidebar funciona; nada cortado horizontalmente |
| G5 | Clique em TODOS os itens do menu lateral, um a um | Toda tela carrega; nenhum item morto ou tela em branco |
| G6 | Inspecione o menu lateral completo | NÃO devem existir: Audiobooks, Bem-Estar, Conciliador, Comunidades, Esquadrões, Instagram, Aplicativos |
| G7 | Conta recém-criada: passe por todas as telas do menu | Nenhuma quebra por falta de dados; estados vazios amigáveis |

### Objetivo de estudos (study_goal)
| # | Passos | Esperado |
|---|---|---|
| G8 | No onboarding da conta nova, escolha objetivo "Concurso" | Ao terminar, menu mostra seção de concursos (Edital, Legislação, Concursos) |
| G9 | Perfil → Visão geral → pill "Vestibular / ENEM" | Toast de sucesso; tabs de concurso SOMEM do menu sem F5 |
| G10 | Clique na pill ativa de novo (toggle off) | Objetivo desmarcado; tabs de concurso continuam ocultas |
| G11 | Volte para "Concurso público" e pressione F5 | Escolha persistiu; tabs de concurso visíveis |

---

## Bloco 1 — Acesso e identidade

### Login
| # | Passos | Esperado |
|---|---|---|
| 1.1 | Criar conta nova (e-mail + senha) | Conta criada; chega ao onboarding/dashboard |
| 1.2 | Logout → tentar logar com senha errada | Mensagem de erro clara em PT-BR (não genérica em inglês) |
| 1.3 | "Esqueci a senha" | ⏭️ requer caixa de e-mail real — deixar para o Lucas |
| 1.4 | Tentar cadastrar username já existente | Bloqueado com mensagem clara |

### Perfil
| # | Passos | Esperado |
|---|---|---|
| 1.5 | Editar nome e username → salvar → F5 | Mudanças persistiram |
| 1.6 | DevTools → Network → "Offline" → tentar salvar perfil | Erro VISÍVEL na tela (não falha silenciosa) |
| 1.7 | Ainda offline: F5 na tela de Perfil | Banner amarelo "Não foi possível carregar seus dados" com botão "Tentar de novo" |
| 1.8 | Voltar online → clicar "Tentar de novo" | Banner some; dados carregam (teste do C14) |
| 1.9 | Conta Folha: abrir aba Assinatura | Mostra plano free e oferta do Papiro; selo no Header diz "Folha" (NUNCA "Gratuito" para quem é Papiro) |
| 1.10 | Zona de perigo (excluir conta) em dark mode | Legível; pede confirmação. NÃO confirmar a exclusão! |

### Convide e Ganhe
| # | Passos | Esperado |
|---|---|---|
| 1.11 | Abrir Convide e Ganhe | Código aparece e é igual ao username; botão copiar funciona |
| 1.12 | Verificar painel de bônus | Se houver bônus não confirmado no banco, aparece "aguardando crédito" — nunca finge crédito feito (teste do C6) |
| 1.13 | Criar conta nova com o código de convite | ⏭️ ou ✅ se conseguir segunda conta — indicação aparece para quem convidou |

### Termos / Privacidade
| # | Passos | Esperado |
|---|---|---|
| 1.14 | Abrir as duas páginas em light e dark | Legíveis, texto completo PT-BR, sem gradiente azul escuro antigo |

---

## Bloco 2 — Home e visão geral

| # | Passos | Esperado |
|---|---|---|
| 2.1 | Conta nova: abrir Dashboard | KPIs zerados; guia inicial visível; nada quebrado |
| 2.2 | Clicar em TODOS os botões de ação rápida do Dashboard, incluindo "Papirar agora" | Todo clique faz algo (abre timer, troca de aba…) — nenhum clique morto (teste do C11) |
| 2.3 | Estatísticas com conta nova | Estado vazio amigável; procurar por "NaN", "Infinity", "undefined" no texto da página — não pode existir |
| 2.4 | Histórico: abrir e alternar dark mode | Cores das categorias legíveis nos dois temas |
| 2.5 | Sessões: iniciar timer → esperar 30s → trocar de aba do navegador → voltar | Cronômetro correto, sem "undefined" ou "NaN" |
| 2.6 | Finalizar sessão | Aparece no histórico e nas estatísticas |
| 2.7 | DevTools offline → F5 na tela Sessões | Card "Últimas sessões" mostra AVISO de erro (não lista vazia fingida) — teste do C10 |

---

## Bloco 3 — Ferramentas IA (coração do produto)

> ⚠️ Itens de IA dependem do gateway em produção (`/api/ai`). Se a IA não responder, registre a mensagem de erro exibida — ela deve ser clara, nunca tela congelada.

### Materiais
| # | Passos | Esperado |
|---|---|---|
| 3.1 | Upload de um PDF de texto real | Completa com indicador de progresso |
| 3.2 | Tentar subir um arquivo .txt renomeado para .pdf (ou arquivo inválido) | Rejeitado com mensagem clara |

### Questões
| # | Passos | Esperado |
|---|---|---|
| 3.3 | Conta Folha: responder questões até o limite diário (10) | Banner de limite com convite de upgrade — sem burlar |
| 3.4 | Gerar questões por IA (conta Papiro, se houver) | Questões coerentes com o tema; loading visível |

### Flashcards
| # | Passos | Esperado |
|---|---|---|
| 3.5 | Criar deck manual + adicionar 2 cards | Funciona; deck listado |
| 3.6 | Conta Papiro: gerar flashcards por IA | Cards aparecem; mensagem de sucesso com contagem |
| 3.7 | **DevTools offline → gerar por IA** | Erro visível; NENHUM deck vazio novo criado na lista (teste do C3) |
| 3.8 | Revisar um card (fácil/difícil) | Card reagenda sem erro |

### Redações
| # | Passos | Esperado |
|---|---|---|
| 3.9 | Conta Folha: anotar o uso do limite mensal ANTES → DevTools offline → enviar redação para correção | Erro claro E a cota mensal NÃO foi consumida (teste do C4) |
| 3.10 | Online: enviar redação digitada para correção | Parecer com nota; salva no histórico |
| 3.11 | Enviar foto de redação (OCR) | ⏭️ se não tiver imagem de redação disponível |

### Revisões / Mapas Mentais
| # | Passos | Esperado |
|---|---|---|
| 3.12 | Fila de revisões: completar uma revisão | Item sai da fila |
| 3.13 | Conta Folha: botão "Gerar mapa" | Gate premium aparece (não gera) |
| 3.14 | Conta Papiro: "Gerar mapa" com um tema | Mapa com ramos coerentes ao tema (IA real — teste do C9); spinner durante o loading |
| 3.15 | **DevTools offline → "Gerar mapa"** | Mapa básico local criado COM aviso "IA indisponível — criei uma estrutura básica" (teste do C9) |

---

## Bloco 4 — Planejamento

| # | Passos | Esperado |
|---|---|---|
| 4.1 | Gerar cronograma no Planejamento | Plano coerente; salvar persiste após F5 |
| 4.2 | Ciclos: criar ciclo → iniciar Pomodoro → pausar → retomar | Minutagem correta |
| 4.3 | Metas: criar meta → concluir | Progresso atualiza |
| 4.4 | **Metas: excluir meta → F5** | Continua excluída (teste do C5) |
| 4.5 | **Metas: DevTools offline → excluir meta** | Toast de erro E a meta NÃO some da tela (teste do C5) |
| 4.6 | **Lembretes: criar lembrete → F5** | Lembrete está lá E aparece **exatamente 1 vez** — duplicata = falha grave (teste do C2) |
| 4.7 | **Lembretes: DevTools offline → criar lembrete** | Toast avisa que não salvou no servidor (teste do C2) |
| 4.8 | Editar e excluir lembrete → F5 | Persiste corretamente |
| 4.9 | Objetivos: criar, progredir, concluir | Ciclo completo sem erro |

---

## Bloco 5 — Concursos (exige study_goal = "Concurso")

| # | Passos | Esperado |
|---|---|---|
| 5.1 | Concursos Disponíveis: catálogo, filtros, busca | Tudo carrega e filtra |
| 5.2 | Inscrever-se num concurso | Aparece em Meus Concursos |
| 5.3 | Edital: upload de edital PDF real → análise IA | Estrutura de disciplinas/tópicos gerada |
| 5.4 | **Edital/Planos: subir PDF escaneado (só imagem) ou PDF vazio** | Erro claro "PDF parece ser escaneado… cole o texto" — tela não trava, nada silencioso (teste do C7) |
| 5.5 | Disciplinas: criar, editar, excluir disciplina e tópicos | CRUD completo funciona |
| 5.6 | Legislação: buscar lei, abrir, navegar páginas | Busca e leitura ok; se o PDF falhar, erro visível |

---

## ⏭️ Bloco 6 — SOMENTE HUMANO (Lucas)

> O agente NÃO executa estes. Listados para constar no relatório como "pendentes de validação humana".

- [ ] "Esqueci a senha" — fluxo de e-mail completo
- [ ] Pagamento E2E (sandbox e produção): assinar → pagar → virar Papiro → cancelar
- [ ] **Duplo clique no assinar** → NÃO cria 2 assinaturas no Asaas (teste do C12)
- [ ] Webhook: status muda após pagar sem relogar
- [ ] Indicação com recompensa real creditada
- [ ] Teste em celular físico

---

## 📋 Relatório de Resultados (o agente preenche)

**Data/URL testada:** _____
**Conta(s) usada(s):** _____

| Bloco | ✅ Passou | ❌ Falhou | ⏭️ Pulado | Observações |
|---|---|---|---|---|
| 0 — Global | | | | |
| 1 — Acesso | | | | |
| 2 — Home | | | | |
| 3 — IA | | | | |
| 4 — Planejamento | | | | |
| 5 — Concursos | | | | |

### Falhas detalhadas
> Para cada ❌: item, passos executados, esperado vs. obtido, mensagem de erro/console, screenshot.

1. …

### Erros de console avulsos
> Erros vermelhos vistos fora dos testes dirigidos.

1. …

### Recomendação final
> Uma frase: pronto para lançar / corrigir X antes / bloqueado por Y.
