import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { Buffer } from 'buffer'; // Opcional mas boa prática

// Inicialização do Firebase Admin
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (e) {
  console.error('Erro ao processar FIREBASE_SERVICE_ACCOUNT:', e.message);
  process.exit(1);
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

async function runBroadcastBridge() {
  console.log('--- Iniciando Broadcast Bridge ---');
  
  try {
    // 1. Buscar lançamentos em análise que não foram notificados
    // Nota: Filtramos por 'EM_ANALISE' pois é o estado inicial de um novo lançamento
    const lancamentosRef = db.collection('lancamentos');
    const snapshot = await lancamentosRef
      .where('status', '==', 'EM_ANALISE')
      .where('notified', '==', false)
      .limit(10) // Processar em lotes para evitar timeout
      .get();

    if (snapshot.empty) {
      console.log('Nenhum novo lançamento pendente de notificação.');
      return;
    }

    console.log(`Encontrados ${snapshot.size} novos lançamentos.`);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const lancamentoId = doc.id;
      
      console.log(`Processando lançamento: ${data.musica} - ${data.artista}`);

      // 2. Criar a notificação na coleção 'notifications'
      const notificationId = uuidv4();
      await db.collection('notifications').doc(notificationId).set({
        id: notificationId,
        title: '🚀 Novo Lançamento!',
        message: `${data.artista} enviou a música "${data.musica}". Clique para revisar.`,
        type: 'NEW_RELEASE',
        data: {
          lancamentoId: lancamentoId,
          artista: data.artista,
          musica: data.musica
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      });

      // 3. Marcar o lançamento como notificado
      await lancamentosRef.doc(lancamentoId).update({
        notified: true
      });

      console.log(`Notificação enviada para: ${data.musica}`);
    }

    console.log('--- Processamento concluído com sucesso ---');
  } catch (error) {
    console.error('Erro durante a execução do Broadcast Bridge:', error);
    process.exit(1);
  }
}

runBroadcastBridge();
