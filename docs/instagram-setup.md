# Integração Instagram Graph API

## 1. Meta Developer App

1. Acesse https://developers.facebook.com/apps/ e crie um app do tipo Business.
2. Em `App settings > Basic`, copie `App ID` e `App secret`.
3. Em `Use cases` ou `Add product`, habilite Facebook Login for Business e Instagram Graph API.
4. Em `Facebook Login for Business > Settings`, adicione:
   - `https://papirando.vercel.app/api/instagram/auth`
   - a URL equivalente de preview/local quando for testar callback público.
5. Garanta que a conta do Instagram seja profissional (Business ou Creator) e esteja vinculada a uma Página do Facebook.
6. Solicite App Review para:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
   - `pages_show_list`
7. Configure no Vercel:
   - `META_APP_ID`
   - `META_APP_SECRET`
   - `META_GRAPH_VERSION`
   - `META_REDIRECT_URI`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 2. Fluxo implementado

1. O frontend chama `POST /api/instagram/auth` com a sessão Supabase.
2. A API cria um `state` em `instagram_oauth_states`.
3. O usuário autoriza no Meta OAuth.
4. O callback `GET /api/instagram/auth` troca `code` por token, busca `/me/accounts` e salva a conta em `instagram_accounts`.
5. Posts são criados por `POST /api/instagram/publish`.
6. Métricas são sincronizadas por `POST /api/instagram/metrics`.

## 3. Publicação

O endpoint aceita:

```json
{
  "accountId": "uuid",
  "mediaType": "IMAGE",
  "mediaUrls": ["https://.../imagem.jpg"],
  "caption": "Texto do post",
  "scheduledAt": "2026-05-24T18:00:00.000Z"
}
```

`mediaType` pode ser `IMAGE`, `CAROUSEL` ou `REELS`. As mídias precisam estar em URLs públicas HTTPS; a página `/instagram` faz upload para o bucket público `instagram-temp`.

## 4. Referências oficiais

- https://developers.facebook.com/docs/instagram-api/guides/content-publishing/
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram/
- https://developers.facebook.com/docs/instagram-api/guides/insights/
