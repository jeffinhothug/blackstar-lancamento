import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Carrega .env se existir para testes locais
dotenv.config();

/**
 * Script de Teste Forçado de SMTP
 * Ignora filtros de data e tenta enviar um e-mail de teste imediato.
 */
const config = {
    host: process.env.SMTP_HOST,
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    to: process.env.NOTIFY_EMAIL || "djjeffinhothug@gmail.com"
};

const transporter = nodemailer.createTransport(config);

async function runTest() {
    console.log('--- FORÇANDO TESTE DE ENVIO DE E-MAIL ---');
    console.log(`Configuração: Host=${config.host}, User=${config.auth.user}`);
    console.log(`Destinatário: ${config.to}`);

    if (!config.host || !config.auth.user || !config.auth.pass) {
        console.error('✘ ERRO: Variáveis SMTP_HOST, SMTP_USER ou SMTP_PASS não definidas no ambiente.');
        process.exit(1);
    }

    try {
        console.log('Verificando conexão com o servidor SMTP...');
        await transporter.verify();
        console.log('✔ Servidor SMTP pronto para envio.');

        const mailOptions = {
            from: `"BlackStar Force Test" <${config.auth.user}>`,
            to: config.to,
            subject: '🚀 TESTE FORÇADO - Sistema de Automação BlackStar',
            html: `
                <div style="background-color: #0d0d0d; color: #ffffff; padding: 40px; font-family: Arial, sans-serif; border: 2px solid #d4af37;">
                    <h1 style="color: #d4af37;">Teste de Entrega Forçado</h1>
                    <p>Este e-mail confirma que o servidor SMTP está configurado e enviando mensagens corretamente.</p>
                    <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #888;">Data/Hora do Teste: ${new Date().toLocaleString('pt-BR')}</p>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✔ E-mail de teste enviado com sucesso!');
        console.log('ID da Mensagem:', result.messageId);
        console.log('--- FIM DO TESTE ---');
    } catch (error) {
        console.error('✘ FALHA AO ENVIAR TESTE:', error.message);
        if (error.code === 'EAUTH') {
            console.error('DICA: Erro de autenticação. Verifique o usuário e a senha de app (Application Password).');
        }
    }
}

runTest();
