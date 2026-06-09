# Configurar Automação SeaNotes → App (Slack Workflow Builder)

## O que isso faz
Quando o SeaNotes enviar a "Daily | Projetos" no seu DM, o Slack automaticamente manda o conteúdo para o app. A daily aparece na aba **Resumos Dailys** sem você fazer nada.

---

## Passo 1 — Fazer deploy do Firebase (uma vez só)

> Precisa ter o Firebase configurado conforme SETUP.md antes.

```bash
# Na pasta do projeto
npm install -g firebase-tools
firebase login
firebase use --add          # selecione seu projeto Firebase
cd functions
npm install
cd ..
firebase deploy --only functions
```

Após o deploy, você verá a URL do webhook no terminal, parecida com:
```
https://seanoteswebhook-XXXXXXXX-uc.a.run.app
```
**Salve essa URL** — você vai usá-la no Slack.

---

## Passo 2 — Criar o Workflow no Slack

1. Abra o **Slack**
2. Clique em **Mais (...)** na barra lateral → **Automações**
3. Clique em **+ Novo Workflow**
4. Nome: `SeaNotes Daily Projetos`

### Configurar o gatilho (trigger)

5. Clique em **"Quando uma mensagem é enviada para um canal ou DM"**
6. Em **Local**, selecione a conversa DM com o **SeaNotes**
7. Em **Condição de filtro**, adicione:
   - Campo: **Texto da mensagem**
   - Condição: **Contém**
   - Valor: `Daily | Projetos`
8. Clique em **Continuar**

### Adicionar a ação de webhook

9. Clique em **+ Adicionar passo**
10. Escolha **"Enviar uma solicitação de webhook"**
11. **URL**: cole a URL do Cloud Function (do Passo 1)
12. **Método HTTP**: `POST`
13. **Tipo de conteúdo**: `application/json`
14. Em **Corpo da requisição**, adicione o campo:
    - Chave: `text`
    - Valor: clique em **Inserir variável** → selecione **Texto da mensagem**
15. Clique em **Salvar**

16. Clique em **Publicar workflow**

---

## Resultado

A partir daí, toda "Daily | Projetos" do SeaNotes:
1. Chega no seu DM ✓
2. Slack detecta automaticamente ✓
3. Envia para o Cloud Function ✓
4. Cloud Function salva no Firestore ✓
5. Aparece na aba **Resumos Dailys** do app ✓

---

## Testar manualmente

Se quiser testar sem esperar a reunião, use o comando abaixo no terminal com a URL do seu Cloud Function:

```bash
curl -X POST https://SUA-URL-AQUI/seaNotesWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Daily | Projetos 09/06/2026\n\nResumo Executivo\nReunião focada no andamento dos projetos Marista e Vistas.\n\nTópicos Discutidos\nArthur: atualização Marista 144\nJulia: revisão material Vistas\n\nDecisões\nPriorizar entrega até sexta-feira.\n\nAções\nArthur finaliza até quarta.\nJulia envia revisão amanhã."
  }'
```
