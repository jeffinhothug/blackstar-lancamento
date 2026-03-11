import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Release, ReleaseStatus } from '../types';

const NotificationMonitor: React.FC = () => {
    const [permission, setPermission] = useState(Notification.permission);
    const [lastNotifiedId, setLastNotifiedId] = useState<string | null>(null);

    useEffect(() => {
        if (permission === 'default') {
            Notification.requestPermission().then(setPermission);
        }
    }, []);

    useEffect(() => {
        if (permission !== 'granted') return;

        // Escutar apenas lançamentos criados RECENTEMENTE (ou todos 'EM_ANALISE' para garantir, mas filtrando 'added')
        // Estratégia: Escutar tudo 'EM_ANALISE'.
        // Problema: First snapshot retorna tudo. Precisamos ignorar o primeiro evento.

        const q = query(
            collection(db, 'lancamentos'),
            where('status', '==', ReleaseStatus.EM_ANALISE)
        );

        // Monitorar alertas globais (Broadcast)
        const qBroadcast = query(
            collection(db, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        let initialLoad = true;

        const unsubscribeReleases = onSnapshot(q, (snapshot) => {
            if (initialLoad) return; // O sinalizador initialLoad será resetado pelo broadcast se necessário, mas vamos usar um para cada

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data() as Release;
                    if (data.id === lastNotifiedId) return;
                    notifyNewRelease(data);
                    setLastNotifiedId(data.id);
                }
            });
        });

        const unsubscribeBroadcast = onSnapshot(qBroadcast, (snapshot) => {
            if (initialLoad) {
                initialLoad = false;
                return;
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    notifyGeneric(data.title, data.body);
                }
            });
        });

        return () => {
            unsubscribeReleases();
            unsubscribeBroadcast();
        };
    }, [permission]);

    const showNotification = (title: string, options: NotificationOptions) => {
        if (Notification.permission !== 'granted') return;

        // Tentar via Service Worker (Melhor para mobile/PWA)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, options);
            });
        } else {
            // Fallback para desktop simples
            new Notification(title, options);
        }
    };

    const notifyGeneric = (title: string, body: string) => {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log('Audio blocked', e));
        } catch (e) { }

        showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            tag: 'broadcast_alert'
        });
    };

    const notifyNewRelease = (release: Release) => {
        // Tocar som
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log('Audio autoplay blocked', e));
        } catch (e) {
            console.error('Erro audio', e);
        }

        showNotification('Novo Lançamento Recebido!', {
            body: `${release.mainArtist} - ${release.title}`,
            icon: '/pwa-192x192.png',
            requireInteraction: true,
            tag: release.id
        });
    };

    return (
        <div style={{ position: 'fixed', bottom: 10, right: 10, opacity: 0.5, fontSize: 10, zIndex: 9999 }}>
            {permission === 'granted' ?
                <span style={{ color: '#0f0' }}>● Monitor Ativo</span> :
                <button onClick={() => Notification.requestPermission().then(setPermission)}>Ativar Notificações</button>
            }
        </div>
    );
};

export default NotificationMonitor;
