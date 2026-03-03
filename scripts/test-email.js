import nodemailer from 'nodemailer';

// Nota: Este script requer que as variáveis SMTP_HOST, SMTP_USER, SMTP_PASS e NOTIFY_EMAIL estejam definidas.
// Como elas são Segredos do GitHub, este script foi desenhado para rodar lá ou com um arquivo .env configurado localmente.

const config = {
    smtp: {
        host: process.env.SMTP_HOST,
        port: 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    },
    to: process.env.NOTIFY_EMAIL || "djjeffinhothug@gmail.com"
};

if (!config.smtp.host || !config.smtp.auth.user || !config.smtp.auth.pass) {
    console.error('✘ Erro: Variáveis de ambiente SMTP não configuradas.');
    console.log('Certifique-se de que SMTP_HOST, SMTP_USER e SMTP_PASS estão definidos.');
    process.exit(1);
}

const transporter = nodemailer.createTransport(config.smtp);

async function testEmail() {
    console.log('--- Testando Conexão SMTP ---');
    try {
        await transporter.verify();
        console.log('✔ Conexão SMTP verificada com sucesso!');

        const mailOptions = {
            from: `"BlackStar Test" <${config.smtp.auth.user}>`,
            to: config.to,
            subject: 'Teste de Automação - BlackStar',
            text: 'Este é um e-mail de teste para validar a configuração da automação.',
            html: `
                <div style="background-color: #000; color: #fff; padding: 20px; border: 1px solid #d4af37;">
                    <h1 style="color: #d4af37;">Conexão Bem-sucedida!</h1>
                    <p>O sistema de automação da BlackStar agora está configurado corretamente.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✔ E-mail enviado com sucesso!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('✘ Erro no teste de e-mail:', error);
    }
}

testEmail();
