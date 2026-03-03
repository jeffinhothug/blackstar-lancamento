import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Card, Button } from './UI';

export const ReloadPrompt: React.FC = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    if (!offlineReady && !needRefresh) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-300">
            <Card className="p-4 border-gold shadow-2xl bg-surface flex flex-col gap-3 max-w-sm">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <h4 className="font-bold text-white mb-1">
                            {offlineReady ? 'Pronto para uso offline' : 'Nova versão disponível'}
                        </h4>
                        <p className="text-xs text-gray-400">
                            {offlineReady
                                ? 'O app foi salvo no seu dispositivo.'
                                : 'Uma atualização foi baixada. Recarregue para aplicar.'}
                        </p>
                    </div>
                    <button onClick={close} className="text-gray-500 hover:text-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {needRefresh && (
                    <Button onClick={() => updateServiceWorker(true)} size="sm" className="w-full">
                        Atualizar Agora
                    </Button>
                )}
            </Card>
        </div>
    );
};
