# Google OAuth branding

O nome `najr...supabase.co` aparece na tela oficial do Google porque o fluxo de login usa o callback do Supabase Auth:

```text
https://najrbhbdfxixfrxzvcer.supabase.co/auth/v1/callback
```

Isso nao e texto da tela de login do app. Para remover esse dominio da experiencia do usuario:

1. No Google Cloud, em **Google Auth Platform > Branding**, configure o app como `Papirando`, com logo, e-mail de suporte, Politica de Privacidade e Termos.
2. Ainda no Google Cloud, em **Clients > OAuth 2.0 Client**, mantenha a redirect URI atual do Supabase e adicione tambem a futura URI com dominio proprio:

```text
https://najrbhbdfxixfrxzvcer.supabase.co/auth/v1/callback
https://auth.papirando.app/auth/v1/callback
```

3. No Supabase, em **Auth > Providers > Google**, use o Client ID e Client Secret desse app OAuth do Google.
4. No Supabase, ative um custom domain para o projeto, por exemplo `auth.papirando.app`.
5. Depois de ativar o dominio, atualize os ambientes do Vercel:

```text
VITE_SUPABASE_URL=https://auth.papirando.app
SUPABASE_URL=https://auth.papirando.app
```

6. Em **Supabase Auth > URL Configuration**, deixe:

```text
Site URL: https://papirando.app
Redirect URLs: https://papirando.app/**
```

## Alternativa sem mostrar `supabase.co`

O app tambem suporta Google Identity Services direto no navegador. Nesse modo o Google autentica no dominio do site e o app entrega o ID token ao Supabase via `supabase.auth.signInWithIdToken`.

Para ativar:

```text
VITE_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
```

No Google Cloud, o OAuth Client precisa autorizar estas origens JavaScript:

```text
https://www.papirando.com
https://papirando.com
http://localhost:5173
```

Sem `VITE_GOOGLE_CLIENT_ID`, custom domain ou verificacao de branding no Google, a tela do Google pode continuar exibindo o dominio `supabase.co`.
