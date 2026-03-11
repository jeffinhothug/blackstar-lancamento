---
description: Implementação de Notificações Push (FCM) com Limpeza de Legado
---

# Fluxo de Trabalho: Notificações Push Premium

Este workflow define as etapas para migrar ou implementar notificações push usando **Firebase Cloud Messaging (FCM)**, de forma gratuita (plano Spark).

### 1. Auditoria e Limpeza de Notificações Legadas
Verifique se existem automações de e-mail ou scripts externos que devem ser removidos.

- [ ] **Verificar Projeto Firebase via MCP**: Use `firebase_get_project` para confirmar o ID do projeto ativo.
- [ ] Identificar arquivos em `.github/workflows/` (Ex: `email.yml`, `notify.yml`)
- [ ] Identificar scripts em `scripts/` (Ex: `automation.js`, `test-email.js`)
- [ ] Remover automações antigas usando `rm` no terminal (Um por um para maior controle).

### 2. Configuração de Firebase Cloud Messaging (FCM)
Prepare o Firebase para emitir e receber sinais de push.

- [ ] Acessar [Configurações do Cloud Messaging](https://console.firebase.google.com/project/black-star-a0fbc/settings/cloudmessaging)
- [ ] Localize a seção **Web push certificates** (Certificados push da Web).
- [ ] Gerar ou copiar a **VAPID Key**.
- [ ] Habilitar **Cloud Messaging API (Legacy)** se necessário por scripts de terceiros (Opcional).

### 3. Implementação do Service Worker
O Service Worker é essencial para receber notificações quando o app/site está fechado.

- [ ] Criar `public/firebase-messaging-sw.js` com:
```javascript
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  // Use as credenciais obtidas no Console do Firebase (Project Settings > General)
  apiKey: "...",
  authDomain: "...",
  projectId: "black-star-a0fbc",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background Message:', payload);
});
```

### 4. Gestão de Permissões e Tokens
Lógica para pedir permissão ao usuário e salvar o Token no Firestore.

- [ ] Criar serviço de mensagens (Ex: `services/messagingService.ts`)
- [ ] Função `requestNotificationPermission()` para disparar o pop-up do navegador.
- [ ] Função `saveTokenToFirestore()` para armazenar o token vinculado ao UID do usuário em `fcm_tokens/{uid}`.

### 5. Configurações do Usuário (UI)
Permitir que o usuário escolha o que quer receber.

- [ ] Adicionar Aba "Notificações" nas Configurações do App.
- [ ] Toggle para: "Habilitar Notificações Push".
- [ ] Implementar persistência de `NotificationPreferences` no Firestore.
- [ ] Adicionar **Debug Zone** para testes manuais rápidos.

### 6. Disparo de Notificações (GRÁTIS)
Para manter o custo zero, utilize o **Google Apps Script** ou gatilhos locais para processar o envio.

- [ ] Criar Script no Google Drive para disparo via API HTTP do FCM.
- [ ] Autorizar o script a consumir a API do FCM.
- [ ] Configurar lógica de envio baseada em eventos do Firestore.

### 7. Validação, Teste Fina e Deploy

- [ ] Rode o /new-mission
- [ ] Faça uma validação do app
- [ ] E por fim dê um deploy