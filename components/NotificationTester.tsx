import React, { useState } from 'react';
import { requestForToken } from '../src/firebaseConfig';
// Ajuste o caminho do import acima conforme onde o firebaseConfig.ts está (src/firebaseConfig)
// Como NotificationTester está em components/ (root/components), e firebaseConfig em src/, "../src/firebaseConfig" deve funcionar se components estiver na raiz.

const NotificationTester: React.FC = () => {
    const [token, setToken] = useState<string | null>(null);

    const handleRequestPrediction = async () => {
        // Solicita permissão para notificações nativas
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const fcmToken = await requestForToken();
            if (fcmToken) setToken(fcmToken);
        } else {
            alert('Permissão para notificações negada.');
        }
    };

    const handleLocalNotification = () => {
        new Notification("Teste BlackStar", {
            body: "Essa notificação deve persistir até você fechar.",
            requireInteraction: true,
            icon: '/pwa-192x192.png'
        });
    };

    return (
        <div style={{ padding: '20px', border: '1px solid #333', marginTop: '20px', borderRadius: '8px', background: '#111', color: '#fff' }}>
            <h3>Testar Notificações PWA</h3>
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <button
                    onClick={handleRequestPrediction}
                    style={{ padding: '10px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Ativar Notificações (Gerar Token)
                </button>

                {token && (
                    <div style={{ wordBreak: 'break-all', fontSize: '10px', background: '#222', padding: '10px' }}>
                        Token FCM: {token}
                    </div>
                )}

                <button
                    onClick={handleLocalNotification}
                    style={{ padding: '10px', background: '#f5a623', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Testar Alerta Local (requireInteraction)
                </button>
            </div>
        </div>
    );
};

export default NotificationTester;
