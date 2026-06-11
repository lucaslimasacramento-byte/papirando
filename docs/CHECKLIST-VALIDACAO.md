# Checklist de Validação Manual — Lucas

> **Como usar:** valide cada tela DEPOIS que Claude e Codex fecharem as tarefas dela (ver [`AUDITORIA-LANCAMENTO.md`](AUDITORIA-LANCAMENTO.md)).
> Marque `[x]` no que passou. Se falhar, anote o que aconteceu na coluna de observação e reporte ao Claude.
>
> **Setup de teste:** crie 2 contas — uma **Folha (free)** e uma **Papiro (paga/trial)** — e teste com as duas onde indicado.
> Teste no desktop E no celular (ou DevTools modo mobile). Alterne light/dark mode em cada tela.

---

## ✅ Testes globais (fazer 1 vez, valem para o app todo)

- [ ] Login → logout → login de novo funciona sem travar
- [ ] Recarregar a página (F5) em qualquer tela mantém você logado e na tela certa
- [ ] Dark mode: alternar tema e navegar por 5+ telas — nenhum texto ilegível ou fundo branco vazado
- [ ] Mobile: sidebar abre/fecha, nenhuma tela com conteúdo cortado horizontalmente
- [ ] Menu lateral: TODOS os itens levam a uma tela que carrega (nenhum item morto)
- [ ] Telas escondidas NÃO aparecem no menu: Audiobooks, Bem-Estar, Conciliador, Comunidades (escondidas no MVP) e Esquadrões, Instagram, Aplicativos (removidos do app)
- [ ] Console do navegador (F12) sem erros vermelhos ao navegar pelas telas principais
- [ ] Conta nova (recém-criada): nenhuma tela quebra por falta de dados — todas mostram estado vazio amigável

### Objetivo de estudos (study_goal) — NOVO 2026-06-10
> ⚠️ **Antes de testar:** rodar no Supabase SQL Editor: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS study_goal text;`
- [ ] Onboarding: escolher "Concurso" no Step 2 → ao terminar, menu mostra seção de concursos (Edital, Legislação, Concursos)
- [ ] Onboarding: escolher "Vestibular" ou "Faculdade" → menu NÃO mostra tabs de concurso
- [ ] Perfil → Visão geral: pills "Concurso público / Vestibular / Faculdade" aparecem; clicar salva na hora (toast) e o menu atualiza
- [ ] Clicar na pill já ativa → desmarca o objetivo (toggle) e tabs de concurso somem
- [ ] F5 após mudar objetivo → escolha persistiu
- [ ] Usuário antigo (sem study_goal) que JÁ tinha concurso selecionado → continua vendo as tabs de concurso (fallback target_contest_id)
- [ ] Link de convite de Esquadrão antigo (`?convite=ESQ-...`) → app abre normal, sem tela quebrada

---

## Bloco 1 — Acesso e identidade

### Login
- [ ] Criar conta nova com e-mail funciona (recebe confirmação se aplicável)
- [ ] Senha errada mostra mensagem clara em português
- [ ] "Esqueci a senha" envia e-mail e o fluxo de reset completa
- [ ] Username duplicado é bloqueado com mensagem clara

### Perfil
- [ ] Editar nome/username/avatar e salvar → recarregar página → mudanças persistiram
- [ ] Desligar a internet (modo avião) e tentar salvar → aparece erro visível (não falha silenciosa)
- [ ] Desligar a internet e abrir o Perfil → banner amarelo "Não foi possível carregar seus dados" com botão "Tentar de novo"; religar internet e clicar → banner some e dados carregam (teste do C14)
- [ ] Conta Folha: aba Assinatura mostra plano free e oferta do Papiro
- [ ] Conta Papiro: aba Assinatura mostra status correto (trial/ativo) e data de renovação
- [ ] Zona de perigo (excluir conta) pede confirmação e está legível no dark mode

### Assinatura / Pagamento (CRÍTICO)
- [ ] Botão de assinar abre o checkout do Asaas
- [ ] Pagar com cartão de teste (sandbox) → voltar ao app → plano vira Papiro em até ~1 min
- [ ] PIX: QR code gera corretamente (sandbox)
- [ ] Cancelar assinatura → status muda e o acesso continua até o fim do período

### Convide e Ganhe
- [ ] Meu código de convite aparece e é igual ao meu username
- [ ] Copiar link funciona
- [ ] Criar conta nova usando o código → a indicação aparece para quem convidou
- [ ] Recompensa (mês grátis) é creditada conforme a regra

### Termos / Privacidade
- [ ] Abrem, são legíveis no light e dark mode, texto completo em PT-BR

---

## Bloco 2 — Home e visão geral

### Dashboard
- [ ] Conta nova: dashboard carrega com KPIs zerados e onboarding/guia inicial visível
- [ ] Conta com dados: KPIs batem com a realidade (sessões, acertos, streak)
- [ ] Todos os botões de ação rápida fazem alguma coisa (nenhum clique morto)
- [ ] Resumo IA carrega ou mostra estado de carregamento (não fica em branco)

### Estatísticas
- [ ] Gráficos renderizam com dados reais
- [ ] Conta nova: sem dados → estado vazio amigável, sem gráfico quebrado/NaN
- [ ] Percentuais nunca mostram "NaN%" ou "Infinity"

### Histórico
- [ ] Lista de atividades aparece em ordem cronológica
- [ ] Filtros funcionam
- [ ] Cores das categorias legíveis no dark mode

### Sessões de Estudo
- [ ] Iniciar timer → cronômetro conta corretamente
- [ ] Trocar de tela com timer rodando e voltar → timer continua certo
- [ ] Finalizar sessão → ela aparece no histórico e nas estatísticas
- [ ] Nenhum lugar mostra "undefined" ou "NaN" no tempo

---

## Bloco 3 — Ferramentas IA (coração do produto — testar com calma)

### Materiais
- [ ] Upload de PDF real (edital ou apostila) completa com barra/indicador de progresso
- [ ] Arquivo inválido (ex: .exe renomeado) é rejeitado com mensagem clara
- [ ] Arquivo grande demais é rejeitado com mensagem clara
- [ ] Gerar conteúdo IA a partir do material funciona
- [ ] Conta Folha: limite free é aplicado (não dá pra burlar gerando de novo)

### Questões
- [ ] Gerar questões por IA → questões coerentes com o material/tema
- [ ] Responder questão → feedback correto (acertou/errou + explicação)
- [ ] Caderno de questões monta e salva
- [ ] Conta Folha: limite diário/mensal aplicado com mensagem clara de upgrade

### Simulados
- [ ] Criar simulado → fazer do início ao fim → ver resultado
- [ ] Sair no meio do simulado e voltar: comportamento aceitável (retoma ou avisa)
- [ ] Correção e nota batem com as respostas dadas

### Flashcards
- [ ] Criar deck manual + adicionar cards funciona
- [ ] Gerar flashcards por IA → cards aparecem no deck
- [ ] **Teste de falha:** desligar internet e gerar por IA → erro visível, sem deck vazio órfão
- [ ] Revisão espaçada: responder "fácil/difícil" reagenda o card

### Redações
- [ ] Enviar redação digitada → correção IA completa com nota e parecer
- [ ] Enviar foto de redação → transcrição OCR funciona
- [ ] **Teste de falha:** o parecer nunca some silenciosamente — se salvar falhar, aviso claro
- [ ] Histórico de redações lista as anteriores
- [ ] Conta Folha: limite de correções aplicado
- [ ] **Teste de falha:** conta Folha + IA falhando (sem internet) → a cota mensal NÃO é consumida (teste do C4)

### Revisões
- [ ] Fila de revisão mostra itens na ordem certa
- [ ] Completar revisão → item sai da fila e reagenda

### Mapas Mentais
- [ ] Criar mapa manual, editar nós, salvar → recarregar → persiste
- [ ] Conta Folha: gate premium na geração IA aparece corretamente
- [ ] Conta Papiro: "Gerar mapa" com IA cria mapa com ramos coerentes ao tema (agora usa IA real — teste do C9)
- [ ] **Teste de falha:** desligar internet e gerar → mapa básico local é criado COM aviso "IA indisponível — criei uma estrutura básica"

---

## Bloco 4 — Planejamento

### Planejamento
- [ ] Gerar cronograma → plano coerente com as matérias/tempo informados
- [ ] Editar e salvar cronograma persiste

### Ciclos de Estudo
- [ ] Criar ciclo com matérias → roda do ciclo renderiza
- [ ] Timer Pomodoro: iniciar, pausar, retomar — minutagem certa
- [ ] Trocar de aba do navegador 5 min com pomodoro rodando → tempo continua correto

### Metas da Semana
- [ ] Criar meta → aparece; concluir → progresso atualiza
- [ ] **Excluir meta → some E continua sumida após F5** (teste do bug C5)

### Objetivos
- [ ] Criar objetivo, acompanhar progresso, concluir — ciclo completo funciona

### Lembretes e Calendário
- [ ] Criar lembrete → aparece no calendário → **F5 → lembrete ainda está lá E aparece só 1 vez** (teste do C2 — havia insert duplicado no banco)
- [ ] **Teste de falha:** desligar internet, criar lembrete → toast de erro avisa que não salvou no servidor
- [ ] Editar e excluir lembrete persiste após F5
- [ ] Feriados aparecem no calendário (se a API de feriados cair, tela não quebra)

---

## Bloco 5 — Concursos

- [ ] Concursos Disponíveis: catálogo carrega, filtros funcionam, busca encontra
- [ ] Inscrever-se num concurso → aparece em Meus Concursos
- [ ] Detalhe do Concurso: dados, datas e cronograma corretos
- [ ] Edital: upload de edital em PDF real → análise IA gera estrutura de disciplinas/tópicos
- [ ] **Teste de falha:** PDF corrompido/imagem → erro claro, tela não trava
- [ ] Disciplinas: criar, editar, excluir disciplina e tópicos
- [ ] Legislação: buscar lei, abrir, ler — paginação/scroll ok
- [ ] Planos de Concurso: gerar plano a partir de edital analisado

---

## Bloco 6 — Pagamento de ponta a ponta (repetir antes do go-live)

- [ ] Fluxo completo em produção real (valor mínimo): assinar → pagar → virar Papiro → cancelar
- [ ] Webhook: após pagar, status muda sem precisar relogar
- [ ] Conta Folha tenta acessar feature paga → gate aparece → clica upgrade → chega no checkout
- [ ] **Clicar 2x no botão de assinar** → NÃO cria 2 assinaturas no Asaas; a 2ª vez reabre a mesma cobrança ou avisa "já possui assinatura" (teste do C12 — requer redeploy da Edge Function)

---

## Registro

| Bloco | Validado em | Resultado |
|---|---|---|
| Global | | |
| Bloco 1 | | |
| Bloco 2 | | |
| Bloco 3 | | |
| Bloco 4 | | |
| Bloco 5 | | |
| Pagamento E2E | | |
