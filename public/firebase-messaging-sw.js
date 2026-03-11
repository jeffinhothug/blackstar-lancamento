// Scripts do Firebase (Compat v9)
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// O Firebase irá injetar as configurações aqui durante o build ou 
// você pode preencher manualmente se souber os valores.
// Para o desenvolvimento, pegaremos as variáveis de ambiente ou o config padrão.

firebase.initializeApp({
    apiKey: "FIREBASE_API_KEY",
    authDomain: "blackstar-lancamentos.firebaseapp.com",
    projectId: "blackstar-lancamentos",
    storageBucket: "blackstar-lancamentos.appspot.com",
    messagingSenderId: "MESSAGING_SENDER_ID",
    appId: "APP_ID"
});

const messaging = firebase.messaging();

// Lidar com mensagens em segundo plano
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Recebida mensagem em segundo plano ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/pwa-192x192.png', // Ajuste conforme seu ícone
        badge: '/pwa-192x192.png',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
