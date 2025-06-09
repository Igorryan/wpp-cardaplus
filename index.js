// =========================================================
// 🤖 BOT WHATSAPP PARA NOTIFICAÇÕES (VIA API)
// =========================================================

// 📦 Importando as dependências necessárias
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

// ===================================================================================
// ⚙️ CONFIGURAÇÕES PRINCIPAIS
// ===================================================================================

const app = express();
const PORTA_API = process.env.PORT || 3000;

console.log(PORTA_API);

// Middleware para o Express entender JSON
app.use(express.json());

// 🌐 Configurar CORS para permitir requisições do frontend
app.use(cors({
    origin: [
        'http://localhost:5173', // Vite dev server
        'http://localhost:3000', // Frontend alternativo
        'http://localhost:3001', // Frontend alternativo
        'http://127.0.0.1:5173', // IP local
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// ⚙️ Configurando o cliente do WhatsApp (código que você já tem)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    }
});

// ===================================================================================
// 📱 INICIALIZAÇÃO E EVENTOS DO WHATSAPP
// ===================================================================================

client.on('qr', (qr) => {
    console.log('\n📱 Escaneie o código QR abaixo com seu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('\n🎉 BOT CONECTADO E PRONTO PARA ENVIAR MENSAGENS!');
    
    // Inicia o servidor da API somente depois que o WhatsApp estiver pronto
    app.listen(PORTA_API, () => {
        console.log(`🚀 Servidor da API rodando na porta ${PORTA_API}`);
        console.log(`👉 Para enviar uma mensagem, faça um POST para http://SEU_IP_DA_VPS:${PORTA_API}/enviar-mensagem`);
    });
});

client.on('disconnected', (reason) => {
    console.log('🔌 Bot desconectado. Motivo:', reason);
});

// Resposta automática para quem tentar conversar com o bot
client.on('message', async (message) => {
    if (message.from.endsWith('@g.us') || message.fromMe) return;
    
    // const respostaAutomatica = "Olá! 👋 Este é um canal exclusivo para o envio de notificações da Cardaplus. No momento, não consigo processar respostas por aqui. Se precisar de ajuda, por favor, acesse nosso site: https://cardaplus.com";
    // await message.reply(respostaAutomatica);
});

// ===================================================================================
// 🔧 FUNÇÕES AUXILIARES
// ===================================================================================

// Função para padronizar números de telefone
const padronizarNumero = (numero) => {
    // Remove todos os caracteres não numéricos
    const numeroLimpo = numero.toString().replace(/\D/g, '');
    
    // Garante que tenha o código do país (55)
    let numeroCompleto = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;
    
    console.log(`🔍 Analisando número: ${numeroCompleto}`);
    
    // Lógica especial para detectar e remover o 9º dígito extra
    if (numeroCompleto.length === 13) {
        // Formato: 55 + DDD (2) + 9 + 8 dígitos = 13 total
        const ddd = numeroCompleto.substring(2, 4);
        const primeiroDigito = numeroCompleto.substring(4, 5);
        const restante = numeroCompleto.substring(5);
        
        // Se o primeiro dígito após o DDD é 9, pode ser o 9º dígito extra
        if (primeiroDigito === '9') {
            const numeroSem9 = `55${ddd}${restante}`;
            console.log(`🔄 Detectado possível 9º dígito extra`);
            console.log(`📱 Número original: ${numeroCompleto}`);
            console.log(`🧹 Número sem 9º dígito: ${numeroSem9}`);
            console.log(`⚡ Enviando para: ${numeroSem9}`);
            return numeroSem9;
        }
    }
    
    // Validação de tamanho
    if (numeroCompleto.length !== 12 && numeroCompleto.length !== 13) {
        console.log(`⚠️  Número pode estar incorreto: ${numeroCompleto} (${numeroCompleto.length} dígitos)`);
    }
    
    return numeroCompleto;
};

// ===================================================================================
// 🚪 A "PORTA DE ENTRADA" - NOSSO ENDPOINT DA API
// ===================================================================================

app.post('/enviar-mensagem', async (req, res) => {
    // Pegamos os dados que o seu site enviou: o número e o nome do cliente.
    const { numero, nomeCliente, nomeLoja } = req.body;

    console.log('\n📨 NOVA REQUISIÇÃO: POST /enviar-mensagem');
    console.log('👤 Cliente:', nomeCliente);
    console.log('📱 Número:', numero);
    console.log('🏪 Loja:', nomeLoja);

    // Validação básica
    if (!numero || !nomeCliente || !nomeLoja) {
        console.log('❌ Dados incompletos recebidos');
        return res.status(400).json({ status: 'erro', mensagem: 'Dados incompletos. É necessário fornecer numero, nomeCliente e nomeLoja.' });
    }

    try {
        // Padronizar o número usando a função auxiliar
        const numeroPadronizado = padronizarNumero(numero);
        console.log('🔧 Número original:', numero);
        console.log('✅ Número padronizado:', numeroPadronizado);
        
        // Formatar o número para o padrão do WhatsApp: DDI + DDD + NUMERO + @c.us
        // Exemplo: 5531999998888@c.us
        const numeroFormatado = `${numeroPadronizado}@c.us`;
        console.log('📱 Número formatado para WhatsApp:', numeroFormatado);

        // Monta a mensagem personalizada de agradecimento
        const mensagem = `Olá, ${nomeCliente}! 👋 Muito obrigado pelo seu pedido de melhoria de cardápio na Cardaplus!\n\nRecebemos a sua loja: *${nomeLoja}*.\n\nJá estamos preparando tudo por aqui com muito carinho. Em breve você receberá novas atualizações. 🚀`;

        // Envia a mensagem!
        await client.sendMessage(numeroFormatado, mensagem);
        
        console.log(`✅ Mensagem enviada com sucesso para ${nomeCliente} (${numero})`);
        res.status(200).json({ status: 'sucesso', mensagem: 'Mensagem enviada com sucesso!' });

    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        res.status(500).json({ status: 'erro', mensagem: 'Falha ao enviar a mensagem via WhatsApp.' });
    }
});


// 🚀 Inicializar o cliente do WhatsApp
console.log('🤖 Iniciando bot de notificações...');
client.initialize();
