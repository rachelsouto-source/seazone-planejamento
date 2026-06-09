# Setup — Planejamento Time Seazone

## 1. Criar projeto no Firebase (grátis)

1. Acesse https://console.firebase.google.com
2. Clique em **Adicionar projeto** → nome: `seazone-planejamento`
3. Desative Google Analytics (não precisa) → **Criar projeto**

## 2. Ativar Authentication

1. No menu lateral: **Build → Authentication → Começar**
2. Clique em **E-mail/senha** → ativar → Salvar
3. Crie os 4 usuários em **Usuários → Adicionar usuário**:

| Nome     | E-mail                        | Senha sugerida   |
|----------|-------------------------------|------------------|
| Rachel   | rachel@seazone.com.br         | Seazone@2026     |
| Julia    | julia@seazone.com.br          | Seazone@2026     |
| Raquel   | raquel@seazone.com.br         | Seazone@2026     |
| Arthur   | arthur@seazone.com.br         | Seazone@2026     |

## 3. Ativar Firestore

1. No menu: **Build → Firestore Database → Criar banco de dados**
2. Escolha **Modo de produção** → região `southamerica-east1` (São Paulo)
3. Em **Regras**, cole e publique:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

## 4. Pegar as credenciais do projeto

1. Em **Configurações do projeto** (ícone ⚙️) → **Seus aplicativos → Adicionar app → Web** (</>)
2. Nome: `planejamento-web` → Registrar
3. Copie o objeto `firebaseConfig` que aparece

## 5. Criar o arquivo .env

Na pasta do projeto, crie um arquivo `.env` (copie o `.env.example`) e preencha com os valores copiados:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=seazone-planejamento.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seazone-planejamento
VITE_FIREBASE_STORAGE_BUCKET=seazone-planejamento.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123...
VITE_FIREBASE_APP_ID=1:123...:web:abc...
```

## 6. Rodar localmente

```bash
npm run dev
```

Acesse http://localhost:5173

## 7. Nomear os usuários no app

Após o primeiro login, o app exibe o e-mail. Para exibir o nome (ex: "Rachel"), 
em cada conta acesse Firebase Console → Authentication → clique no usuário → edite o Display Name.

## 8. Deploy

Use o Coolify da Seazone ou rode:

```bash
npm run build
```

E faça upload da pasta `dist/` em qualquer hosting estático (Vercel, Netlify, Firebase Hosting).
