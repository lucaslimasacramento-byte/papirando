# Prompts por bloco — matérias dos vestibulares (para GPT com busca)

Cole cada bloco numa conversa nova do GPT (com acesso à internet). Ele devolve
um array JSON com `nome` exato + `disciplinas` (matéria + tópicos). Mande o JSON
de volta que eu insiro no catálogo.

O cabeçalho de instruções é o mesmo em todos os blocos — muda só a lista de 10.

---

## CABEÇALHO (vai junto em todo bloco)

Você é um pesquisador educacional com acesso à internet. Para CADA vestibular da lista abaixo, pesquise nas fontes OFICIAIS (site da instituição/banca + edital/manual do candidato da edição mais recente) o PROGRAMA DE MATÉRIAS e devolva SOMENTE um JSON válido (um array), sem markdown e sem texto fora dele. A resposta começa em `[` e termina em `]`.

Regras:
1. Só a edição mais recente e fontes oficiais. Não invente conteúdo.
2. Um objeto por vestibular, com `nome` EXATAMENTE como na lista e `disciplinas` = matérias, cada uma com `topicos` (os conteúdos do programa).
3. Seja completo nos tópicos; não resuma como "diversos assuntos".
4. Não inclua inscrição, datas, vagas ou logística — só matéria de estudo.
5. Se houver leituras obrigatórias, crie a matéria "Literatura — Obras obrigatórias" e liste as obras em `topicos`.
6. Se o vestibular usar só nota do ENEM/SiSU (sem programa próprio) ou você não achar com segurança, devolva esse com `"disciplinas": []`.
7. Escape aspas internas com barra invertida. Nada fora do JSON.

Formato:
```json
[
  { "nome": "<nome exato>", "disciplinas": [ { "nome": "Língua Portuguesa", "topicos": ["...", "..."] } ] }
]
```

Vestibulares (pesquise todos os desta lista):

---

## BLOCO 1
1. COMVEST - Unicamp
2. FUVEST - USP
3. Ingresso Superior - CEFET-MG
4. Ingresso Superior - CEFET-RJ
5. PAES UEMA
6. PAS UEM
7. PAS UnB
8. PSS UEPG
9. SIS/PSC UEA
10. SSA UPE

## BLOCO 2
1. Vestibular Belas Artes
2. Vestibular CEDERJ
3. Vestibular ESPM
4. Vestibular FAAP
5. Vestibular Fatec
6. Vestibular Feevale
7. Vestibular FGV Direito SP
8. Vestibular FGV EAESP
9. Vestibular FGV EPGE
10. Vestibular IBMEC

## BLOCO 3
1. Vestibular IME
2. Vestibular Insper
3. Vestibular ITA
4. Vestibular Mackenzie
5. Vestibular PUC Campinas
6. Vestibular PUC Goiás
7. Vestibular PUC Minas
8. Vestibular PUC-Rio
9. Vestibular PUC-SP
10. Vestibular PUCPR

## BLOCO 4
1. Vestibular PUCRS
2. Vestibular UCS
3. Vestibular UDESC
4. Vestibular UEA
5. Vestibular UECE
6. Vestibular UEFS
7. Vestibular UEG
8. Vestibular UEL
9. Vestibular UEM
10. Vestibular UEMA

## BLOCO 5
1. Vestibular UEMASUL
2. Vestibular UEMG
3. Vestibular UEMS
4. Vestibular UENF
5. Vestibular UENP
6. Vestibular UEPA
7. Vestibular UEPB
8. Vestibular UEPG
9. Vestibular UERJ
10. Vestibular UERR

## BLOCO 6
1. Vestibular UESB
2. Vestibular UESC
3. Vestibular UESPI
4. Vestibular UNEB
5. Vestibular UNEMAT
6. Vestibular Unesc
7. Vestibular UNICAP
8. Vestibular Unicentro
9. Vestibular UniCEUB
10. Vestibular UNIFOR

## BLOCO 7
1. Vestibular Unimontes
2. Vestibular Unioeste
3. Vestibular Unisinos
4. Vestibular UNIT
5. Vestibular Unitins
6. Vestibular Univali
7. Vestibular Univates
8. Vestibular Univesp
9. Vestibular Univille
10. Vestibular Unochapecó

## BLOCO 8
1. Vestibular UPE
2. Vestibular UPF
3. Vestibular URCA
4. Vestibular UVA
5. VUNESP - Unesp
