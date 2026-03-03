import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../src/firebaseConfig'; // Ajuste conforme local exato (src/firebaseConfig ou services/firebase)
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

        let initialLoad = true;

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (initialLoad) {
                initialLoad = false;
                return;
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data() as Release;

                    // Evitar duplicatas (caso re-renderize)
                    if (data.id === lastNotifiedId) return;

                    // Disparar Notificação
                    notifyNewRelease(data);
                    setLastNotifiedId(data.id);
                }
            });
        });

        return () => unsubscribe();
    }, [permission]);

    const notifyNewRelease = (release: Release) => {
        // Tocar som
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Som sutil de notificação
            audio.play().catch(e => console.log('Audio autoplay blocked', e));
        } catch (e) {
            console.error('Erro audio', e);
        }

        // Visual
        const n = new Notification('Novo Lançamento Recebido!', {
            body: `${release.mainArtist} - ${release.title}`,
            icon: '/pwa-192x192.png',
            requireInteraction: true,
            tag: release.id // Evita SPAM se atualizar o mesmo doc rápido
        });

        n.onclick = () => {
            window.focus();
            n.close();
        };
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
