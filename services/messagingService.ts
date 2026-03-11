import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "./firebase";
import { NotificationPreferences } from "../types";

// VAPID KEY: Gere uma no Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = "AB1CqU49Fjv-iKR2yveJKc9khYZUhtmUp4nvyBfT_5M";

export const messagingService = {
    /**
     * Solicita permissão e obtém o Token FCM
     */
    requestPermission: async () => {
        try {
            const messaging = getMessaging(app);

            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const token = await getToken(messaging, { vapidKey: VAPID_KEY });
                if (token) {
                    console.log('[FCM] Token obtido:', token);

                    // Salvar o token no Firestore vinculado ao usuário se estiver logado
                    if (auth.currentUser) {
                        await setDoc(doc(db, "fcm_tokens", auth.currentUser.uid), {
                            token: token,
                            lastUpdated: new Date(),
                            active: true,
                            platform: 'web'
                        }, { merge: true });
                    }

                    return token;
                }
            }
            return null;
        } catch (error) {
            console.error('[FCM] Erro ao obter permissão ou token:', error);
            return null;
        }
    },

    /**
     * Salva as preferências de notificação do usuário
     */
    savePreferences: async (uid: string, prefs: NotificationPreferences) => {
        try {
            await setDoc(doc(db, "notification_preferences", uid), {
                ...prefs,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            return true;
        } catch (error) {
            console.error('[FCM] Erro ao salvar preferências:', error);
            return false;
        }
    },

    /**
     * Obtém as preferências de notificação do usuário
     */
    getPreferences: async (uid: string): Promise<NotificationPreferences | null> => {
        try {
            const docRef = doc(db, "notification_preferences", uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as NotificationPreferences;
            }
            return null;
        } catch (error) {
            console.error('[FCM] Erro ao obter preferências:', error);
            return null;
        }
    },

    /**
     * Monitorar mensagens em primeiro plano
     */
    onForegroundMessage: (callback: (payload: any) => void) => {
        const messaging = getMessaging(app);
        return onMessage(messaging, (payload) => {
            console.log('[FCM] Mensagem em primeiro plano recebida:', payload);
            callback(payload);
        });
    },

    /**
     * Envia uma notificação para todos os tokens registrados (Broadcast)
     * Nota: Em produção com muitos usuários, isso deve ser feito via Cloud Functions ou Topics.
     * Para o plano gratuito Spark, usaremos este "bridge" via Admin.
     */
    broadcastNotification: async (title: string, body: string, data?: any) => {
        try {
            // 1. Obter todos os tokens ativos do Firestore
            const tokensSnapshot = await getDoc(doc(db, "system_metadata", "fcm_summary")); // Ou listar a coleção
            // Como listar coleções pode ser custoso, vamos tentar uma abordagem de "tópico manual" ou listar 'fcm_tokens'

            // Para ser robusto e gratuito, vamos registrar na coleção 'notifications' 
            // e o Monitor (NotificationMonitor) que já está no App de todo mundo vai reagir em tempo real.
            await setDoc(doc(db, "notifications", crypto.randomUUID()), {
                title,
                body,
                data: data || {},
                createdAt: new Date().toISOString(),
                type: 'broadcast'
            });

            return true;
        } catch (error) {
            console.error('[FCM] Erro ao disparar broadcast:', error);
            return false;
        }
    }
};
