const admin = require('firebase-admin');

// Inicialização do Firebase Admin
let serviceAccount;
try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (e) {
    console.error('Erro ao processar FIREBASE_SERVICE_ACCOUNT:', e.message);
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const storage = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET || 'blackstar-lancamentos.firebasestorage.app');

/**
 * Script para expurgar (deletar) arquivos de áudio e imagem de Lançamentos
 * que estão com status "FINALIZADO" há mais de 30 dias.
 */
async function purgeOldMedia() {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    console.log('--- Iniciando Verificação de Exclusão de Mídia Antiga ---');
    console.log(`Buscando lançamentos FINALIZADOS criados antes de ${thirtyDaysAgo.toISOString()}`);

    try {
        const snapshot = await db.collection('releases')
            .where('status', '==', 'FINALIZADO')
            .where('purged', '!=', true) // don't process already purged
            .get();

        if (snapshot.empty) {
            console.log('Nenhum lançamento finalizado encontrado que precise de purga.');
            return;
        }

        let purgedCount = 0;

        for (const doc of snapshot.docs) {
            const release = doc.data();
            const createdAt = new Date(release.createdAt);

            // Verifica se tem mais de 30 dias
            if (createdAt < thirtyDaysAgo) {
                console.log(`[PURGE] Iniciando exclusão de arquivos para: ${release.title} (${release.id})`);

                try {
                    // Deleta Capa
                    if (release.coverFileName && !release.coverFileName.startsWith('[DELETED')) {
                        const coverPath = `capas/${release.id}/${release.coverFileName}`;
                        const file = storage.file(coverPath);
                        const [exists] = await file.exists();
                        if (exists) {
                            await file.delete();
                            console.log(`  - Capa deletada: ${coverPath}`);
                        }
                    }

                    // Deleta Áudios
                    if (release.tracks && Array.isArray(release.tracks)) {
                        for (const track of release.tracks) {
                            if (track.audioFileName && !track.audioFileName.startsWith('[DELETED')) {
                                const audioPath = `audios/${release.id}/${track.id}/${track.audioFileName}`;
                                const audioFile = storage.file(audioPath);
                                const [audioExists] = await audioFile.exists();
                                if (audioExists) {
                                    await audioFile.delete();
                                    console.log(`  - Áudio deletado: ${audioPath}`);
                                }
                            }
                        }
                    }

                    // Atualiza flag no Firestore
                    const updatedTracks = release.tracks.map(t => ({
                        ...t,
                        audioFileName: '[DELETED_MEDIA]',
                        audioUrl: '',
                        audioHash: '[PURGED]'
                    }));

                    await db.collection('releases').doc(doc.id).update({
                        purged: true,
                        coverFileName: '[DELETED_MEDIA]',
                        coverUrl: '',
                        tracks: updatedTracks
                    });

                    console.log(`[PURGE concluído] Documento atualizado no Firestore para ${release.id}.`);
                    purgedCount++;

                } catch (err) {
                    console.error(`Erro ao purgar arquivos do lançamento ${release.id}:`, err);
                }
            }
        }

        console.log(`Verificação concluída. ${purgedCount} lançamentos expurgados.`);

    } catch (error) {
        console.error('Erro geral no script de purga:', error);
    }
}

purgeOldMedia().then(() => {
    console.log('Fim do processo.');
    process.exit(0);
}).catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
