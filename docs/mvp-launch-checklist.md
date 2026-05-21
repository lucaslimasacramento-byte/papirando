# Papirando - Checklist MVP

Objetivo: deixar claro o que entra no primeiro uso real do produto e o que fica para uma rodada posterior.

## Status geral

- Produto web: cerca de 72%.
- Pronto para producao real: cerca de 58%.
- Pronto para deploy simples na Vercel: cerca de 80%.
- Pronto para IA completa em producao: cerca de 45%.

## Antes de qualquer deploy

- [ ] Trabalhar em uma copia local fora de pasta sincronizada, por exemplo `C:\projetos\papirando`.
- [ ] Remover `node_modules` copiado.
- [ ] Rodar `npm ci`.
- [ ] Rodar `npm run lint`.
- [ ] Rodar `npm run test`.
- [ ] Rodar `npm run build`.
- [ ] Confirmar que `.env` nao foi commitado.
- [ ] Confirmar que `.env.example` esta atualizado.

## MVP recomendado para liberar

- [ ] Login e cadastro.
- [ ] Perfil do aluno.
- [ ] Dashboard.
- [ ] Concursos disponiveis.
- [ ] Detalhe do concurso.
- [ ] Disciplinas.
- [ ] Detalhe da disciplina.
- [ ] Edital.
- [ ] Planejamento e ciclos.
- [ ] Sessoes de estudo.
- [ ] Historico.
- [ ] Estatisticas.
- [ ] Redacoes.
- [ ] Mapas mentais.
- [ ] Audiobooks.
- [ ] Bem-estar.

## Manter como beta ou esconder no primeiro lancamento

- [ ] Assinatura, ate integrar pagamento real.
- [ ] Aplicativos, ate haver app publicado ou PWA fechado.
- [ ] Comunidades, ate validar persistencia e moderacao.
- [ ] Esquadroes, ate fechar membros, RLS e forum interno remoto.
- [ ] Flashcards com IA, ate validar backend de IA.
- [ ] Explicacao de questoes por IA, ate validar backend de IA em producao.
- [ ] Simulados com ranking, ate validar dados reais e regras de pontuacao.

## Teste manual minimo

- [ ] Criar conta nova.
- [ ] Fazer login.
- [ ] Atualizar perfil.
- [ ] Selecionar/adicionar concurso.
- [ ] Criar ou abrir disciplinas.
- [ ] Marcar topico do edital.
- [ ] Criar uma sessao de estudo.
- [ ] Conferir historico.
- [ ] Conferir estatisticas.
- [ ] Criar uma redacao.
- [ ] Abrir mapa mental.
- [ ] Abrir audiobook.
- [ ] Fazer logout e login novamente.
- [ ] Recarregar a pagina em cada tela principal.
- [ ] Testar em mobile.

## Criterio de liberacao

Liberar o MVP quando:

- Build passar em ambiente limpo.
- Login/cadastro funcionarem na URL da Vercel.
- Supabase Auth estiver com Site URL e Redirect URLs corretos.
- Tabelas usadas no MVP estiverem com RLS aplicado.
- Fluxos principais salvarem e carregarem dados reais.
- Modulos beta estiverem escondidos ou claramente marcados.
