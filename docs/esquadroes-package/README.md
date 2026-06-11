# Esquadrões — Pacote para projeto separado

Removido do Papirando em 2026-06-10. Código preservado aqui para reutilização em produto B2B dedicado.

## O que é

Plataforma de gestão de turmas para cursinhos presenciais. Permite que diretores/coordenadores criem turmas digitais, gerenciem professores e alunos, publiquem simulados e atividades, e acompanhem o progresso individual de cada membro.

## Por que foi separado

É um produto B2B (instituição → turma → aluno) embutido dentro de um app B2C (estudante individual). Modelo de negócio diferente (cobrança por turma/instituição, não por usuário), ciclo de venda diferente (para diretores, não para alunos), UX diferente (painel de gestão vs ferramenta de estudo).

## Arquivos do produto

| Arquivo | Responsabilidade |
|---|---|
| `src/pages/Esquadroes.jsx` | Tela principal: lista de esquadrões, detalhe, mural, atividades, ranking interno |
| `src/lib/squadRemote.js` | Funções de acesso ao Supabase para esquadrões |
| `src/lib/squadRemote.test.js` | Testes unitários do squadRemote |

## Supabase — tabelas e funções utilizadas

| Item | Tipo | Descrição |
|---|---|---|
| `community_posts` | Tabela | Cada esquadrão é um `community_post` com `community_scope = 'Esquadrão'` e payload em `squad_payload` (JSONB) |
| `squad_payload` | Coluna JSONB | Armazena: name, owner, focus, description, visibility, inviteCode, members, teachers, roster, subjects, notices, activities, simulados, internalRanking, questionPosts, permissions |
| `resolve_squad_invite(p_code)` | RPC | Busca um esquadrão pelo código de convite (`ESQ-XXXXXXXX`) |
| `community_scope` | Enum/string | Valor `'Esquadrão'` distingue squads de posts normais na tabela `community_posts` |

## Formato do código de convite

```
ESQ-[8 chars alfanuméricos maiúsculos]
Exemplo: ESQ-K7QMRT2A
```

Gerado com `crypto.getRandomValues` (implementação em `Esquadroes.jsx → generateInviteCode()`).

## Roles de usuário dentro de um esquadrão

- `Diretor` — criador/dono da turma
- `Coordenador` — pode gerenciar professores e aprovar membros
- `Professor` — pode publicar simulados e atividades
- `Aluno` — membro padrão

## Integração com Comunidades

No Papirando, esquadrões eram acessíveis via deep link `?convite=ESQ-XXXXXXXX` na URL e coexistiam com o feed de `Comunidades`. O novo produto pode desacoplar completamente das `community_posts` e usar tabela própria `squads`.

## Ponto de partida recomendado para o novo projeto

1. Criar tabela `squads` própria (separada de `community_posts`)
2. Reutilizar a lógica de UI de `Esquadroes.jsx` (4.550 linhas, contém toda a UI)
3. Adaptar `squadRemote.js` para apontar para a nova tabela
4. Definir modelo de cobrança: por instituição? por turma ativa? por aluno?
