import admin from 'firebase-admin';
import nodemailer from 'nodemailer';

// Inicialização do Firebase Admin
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (e) {
  console.error('Erro ao processar FIREBASE_SERVICE_ACCOUNT:', e.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Configuração do Transportador de E-mail
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Divide um array em sub-arrays de tamanho máximo definido.
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Garante que o valor seja uma string sanitizada.
 */
function sanitize(value) {
  if (value === undefined || value === null) return '';
  // Se for um Timestamp do Firebase (possui toDate)
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toLocaleString('pt-BR');
  }
  // Se for uma data JS
  if (value instanceof Date) {
    return value.toLocaleString('pt-BR');
  }
  return String(value).trim();
}

/**
 * Grava log de notificação no Firestore para auditoria.
 */
async function logNotification(type, success, details, error = null) {
  try {
    await db.collection('logs_notificacoes').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      type: type, // 'NOVO' ou 'PENDENTE'
      success: success,
      details: details, // { artist, title } ou { count }
      errorMessage: error ? error.message : null,
      environment: 'github-actions'
    });
  } catch (err) {
    console.error('[ERRO INTERNO] Falha ao gravar log no Firestore:', err.message);
  }
}

/**
 * Wrapper para envio de e-mail com Retry Logic (3 tentativas).
 */
async function sendMailWithRetry(mailOptions, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (err) {
      lastError = err;
      console.warn(`[RETRY] Tentativa ${attempt}/${maxRetries} falhou: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1500)); // Delay progressivo
      }
    }
  }
  throw lastError;
}

/**
 * Verifica lançamentos:
 * 1. Novos (de hoje)
 * 2. Pendentes (há mais de 3 dias sem alteração de status)
 */
async function checkAndNotify() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(now.getDate() - 3);

  console.log('--- Iniciando Verificação de Lançamentos ---');
  console.log(`Data de referência: ${today.toLocaleDateString('pt-BR')}`);

  try {
    // 1. Novos lançamentos de hoje
    const newSnapshot = await db.collection('lancamentos')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(today))
      .get();

    if (!newSnapshot.empty) {
      const docs = newSnapshot.docs;
      console.log(`[LOG] Foram encontrados ${docs.length} novos lançamentos hoje.`);

      const batches = chunkArray(docs, 10);
      let globalIndex = 0;

      for (let i = 0; i < batches.length; i++) {
        console.log(`[LOTE] Enviando lote ${i + 1} de ${batches.length}...`);
        for (const doc of batches[i]) {
          globalIndex++;
          console.log(`[PROGRESSO] Enviando e-mail ${globalIndex} de ${docs.length}...`);
          const releaseData = doc.data();
          try {
            await sendReleaseEmail(releaseData, 'NOVO');
            await logNotification('NOVO', true, { artist: releaseData.artist || releaseData.mainArtist, title: releaseData.title });
          } catch (err) {
            console.error(`[ERRO] Falha definitiva no envio (${globalIndex}):`, err.message);
            await logNotification('NOVO', false, { artist: releaseData.artist || releaseData.mainArtist, title: releaseData.title }, err);
          }
        }
      }
    } else {
      console.log('[LOG] Nenhum novo lançamento encontrado hoje.');
    }

    // 2. Pendentes (3 dias ou mais) em status 'EM_ANALISE'
    const staleSnapshot = await db.collection('lancamentos')
      .where('status', '==', 'EM_ANALISE')
      .get();

    const staleReleases = staleSnapshot.docs
      .map(doc => doc.data())
      .filter(release => {
        const createdAt = new Date(release.createdAt);
        return createdAt <= threeDaysAgo;
      });

    if (staleReleases.length > 0) {
      console.log(`[LOG] ${staleReleases.length} lançamentos pendentes há mais de 3 dias.`);
      try {
        await sendStaleAlertEmail(staleReleases);
        await logNotification('PENDENTE', true, { count: staleReleases.length });
      } catch (err) {
        console.error('[ERRO] Falha ao enviar alerta de pendências:', err.message);
        await logNotification('PENDENTE', false, { count: staleReleases.length }, err);
      }
    }

  } catch (error) {
    console.error('✘ Erro crítico ao processar automação:', error);
  }
}

async function sendReleaseEmail(release, type = 'NOVO') {
  // Sanitização de campos
  const artist = sanitize(release.artist || release.mainArtist);
  const title = sanitize(release.title);
  const status = sanitize(release.status);
  const createdAt = sanitize(release.createdAt);

  const mailOptions = {
    from: `"BlackStar System" <${process.env.SMTP_USER}>`,
    to: process.env.NOTIFY_EMAIL,
    subject: `[${type} LANÇAMENTO] ${artist} - ${title}`,
    html: `
      <div style="background-color: #0d0d0d; color: #ffffff; padding: 40px; font-family: 'Inter', Arial, sans-serif; border: 1px solid #d4af37;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d4af37; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">
            ${type === 'NOVO' ? 'Novo Lançamento Detectado' : 'Alerta de Lançamento'}
          </h1>
          <div style="height: 2px; background: linear-gradient(to right, transparent, #d4af37, transparent); width: 100%; margin-top: 10px;"></div>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.03); padding: 25px; border-radius: 8px; border-left: 4px solid #d4af37; margin-bottom: 20px;">
          <p style="margin: 10px 0; font-size: 16px;"><strong style="color: #d4af37;">Artista:</strong> ${artist}</p>
          <p style="margin: 10px 0; font-size: 18px;"><strong style="color: #d4af37;">Título:</strong> ${title}</p>
          <p style="margin: 10px 0;"><strong style="color: #d4af37;">Data Solicitada:</strong> ${createdAt}</p>
          <p style="margin: 10px 0;"><strong style="color: #d4af37;">Status Atual:</strong> <span style="color: #fbbf24; font-weight: bold;">${status}</span></p>
        </div>

        <div style="margin-top: 30px; text-align: center;">
          <a href="https://blackstar-lancamentos.web.app/admin" 
             style="background-color: #d4af37; color: #000000; padding: 14px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; text-transform: uppercase; display: inline-block; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
            Verificar no Painel
          </a>
        </div>

        <div style="margin-top: 40px; border-top: 1px solid rgba(212, 175, 55, 0.2); padding-top: 20px; text-align: center; font-size: 11px; color: #666; letter-spacing: 1px;">
          <p>&copy; ${new Date().getFullYear()} BLACKSTAR LANÇAMENTOS | THUG STYLE SYSTEM</p>
        </div>
      </div>
    `,
  };

  await sendMailWithRetry(mailOptions);
  console.log(`✔ E-mail enviado (${type}): ${artist} - ${title}`);
}

async function sendStaleAlertEmail(releases) {
  const listHtml = releases.map(r => {
    const rArtist = sanitize(r.artist || r.mainArtist);
    const rTitle = sanitize(r.title);
    const rDate = new Date(r.createdAt).toLocaleDateString('pt-BR');

    return `
        <li style="margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
            <strong style="color: #d4af37;">${rArtist} - ${rTitle}</strong><br/>
            <small style="color: #888;">Criado em: ${rDate}</small>
        </li>
      `;
  }).join('');

  const mailOptions = {
    from: `"BlackStar System" <${process.env.SMTP_USER}>`,
    to: process.env.NOTIFY_EMAIL,
    subject: `[PENDENTE] ${releases.length} lançamentos aguardando há +3 dias`,
    html: `
      <div style="background-color: #0d0d0d; color: #ffffff; padding: 40px; font-family: 'Inter', Arial, sans-serif; border: 1px solid #ef4444;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ef4444; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Alerta de Pendência</h1>
          <p style="color: #888;">Existem lançamentos sem movimentação há mais de 3 dias.</p>
        </div>
        
        <ul style="list-style: none; padding: 0;">
          ${listHtml}
        </ul>

        <div style="margin-top: 30px; text-align: center;">
          <a href="https://blackstar-lancamentos.web.app/admin" 
             style="background-color: #ef4444; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; text-transform: uppercase; display: inline-block;">
            Resolver Pendências
          </a>
        </div>
      </div>
    `,
  };

  await sendMailWithRetry(mailOptions);
  console.log(`✔ E-mail de alerta de pendências enviado.`);
}

// Execução principal
checkAndNotify().then(() => {
  console.log('--- Processo de automação concluído com sucesso ---');
  process.exit(0);
}).catch(err => {
  console.error('✘ Erro fatal na automação:', err);
  process.exit(1);
});
