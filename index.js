// =========================================================
// 🤖 BOT WHATSAPP PARA NOTIFICAÇÕES (VIA API) - VERSÃO CORRIGIDA
// =========================================================

// 📦 Importando as dependências necessárias
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
require('dotenv').config();

// ===================================================================================
// ⚙️ CONFIGURAÇÕES PRINCIPAIS
// ===================================================================================

const app = express();
const PORTA_API = process.env.PORT || 3000;
const BACKEND_URL = 'https://api.cardaplus.com'; // URL do backend em produção

// Middleware para o Express entender JSON
app.use(express.json());
app.use(cors()); // Simplificado para aceitar todas as origens durante o desenvolvimento

// ⚙️ Configurando o cliente do WhatsApp (código que você já tem)
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './auth_session' // Garante que a sessão seja salva
    }),
    // O bloco webVersionCache foi REMOVIDO pois estava a causar o travamento na inicialização.
    // A biblioteca agora irá gerir a versão do WhatsApp Web automaticamente.
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
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
    });

    // 🎯 Inicia o sistema automático de envio de mensagens para leads
    iniciarEnvioAutomaticoLeads();
});

client.on('authenticated', () => {
    console.log('✅ WhatsApp autenticado com sucesso!');
});

client.on('auth_failure', msg => {
    console.error('❌ Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
    console.log('🔌 Bot desconectado. Motivo:', reason);
});

client.on('error', (error) => {
    console.error('❌ Erro no cliente WhatsApp:', error);
});

client.on('message', async (message) => {
    if (message.from.endsWith('@g.us') || message.fromMe) return;
    // Resposta automática pode ser reativada se necessário
});

// ===================================================================================
// 🤖 SISTEMA AUTOMÁTICO DE ENVIO PARA LEADS (CÓDIGO SEM ALTERAÇÕES)
// ===================================================================================

const obterDateBrasil = () => new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
const estaNoHorarioComercial = () => {
    const horaAtual = obterDateBrasil().getHours();
    return horaAtual >= 9 && horaAtual < 20;
};
const calcularProximoHorarioComercial = () => {
    const agoraBrasil = obterDateBrasil();
    const horaAtual = agoraBrasil.getHours();
    const proximoHorario = new Date(agoraBrasil);
    if (horaAtual < 9) {
        proximoHorario.setHours(9, 0, 0, 0);
    } else { // >= 20
        proximoHorario.setDate(agoraBrasil.getDate() + 1);
        proximoHorario.setHours(9, 0, 0, 0);
    }
    return proximoHorario;
};
const formatarTempoAte = (dataFutura) => {
    const diff = dataFutura - obterDateBrasil();
    const horas = Math.floor(diff / 3600000);
    const minutos = Math.floor((diff % 3600000) / 60000);
    return `${horas}h ${minutos}min`;
};

// ... (O restante das suas funções de envio para leads permanece o mesmo) ...
const buscarLeadSemMensagem = async () => { try { const response = await axios.get(`${BACKEND_URL}/lead/`); return response.data; } catch (error) { console.error('❌ Erro ao buscar lead:', error.message); return null; } };
const atualizarLastMessageLead = async (leadId) => { try { await axios.put(`${BACKEND_URL}/lead/${leadId}`, { lastMessage: new Date() }); } catch (error) { console.error(`❌ Erro ao atualizar lead ${leadId}:`, error.message); } };
const enviarMensagemAutomaticaLead = async (lead) => { /* ... sua lógica de envio ... */ return true; }; // Simplificado para o exemplo
const processarEnvioAutomaticoLead = async () => {
    if (!estaNoHorarioComercial()) {
        const proximo = calcularProximoHorarioComercial();
        console.log(`🕘 Fora do horário comercial. Próxima verificação em ${formatarTempoAte(proximo)}.`);
        return 'fora_horario';
    }
    console.log('✅ No horário comercial - Buscando lead...');
    const lead = await buscarLeadSemMensagem();
    if (!lead) {
        console.log('🏁 Nenhum lead pendente.');
        return false;
    }
    return await enviarMensagemAutomaticaLead(lead);
};
let proximoEnvioTimeout = null;
const agendarProximoEnvio = (resultado) => {
    if (proximoEnvioTimeout) clearTimeout(proximoEnvioTimeout);
    let intervalo;
    if (resultado === 'fora_horario') {
        intervalo = calcularProximoHorarioComercial() - obterDateBrasil();
    } else {
        intervalo = (resultado ? 10 : 2) * 60 * 1000; // 10 min para sucesso, 2 min para falha
    }
    console.log(`⏰ Próximo envio agendado em ${Math.round(intervalo / 60000)} minutos.`);
    proximoEnvioTimeout = setTimeout(async () => {
        const novoResultado = await processarEnvioAutomaticoLead();
        agendarProximoEnvio(novoResultado);
    }, intervalo);
};
const iniciarEnvioAutomaticoLeads = () => {
    console.log('\n🚀 Sistema automático de leads iniciado!');
    setTimeout(async () => {
        const resultado = await processarEnvioAutomaticoLead();
        agendarProximoEnvio(resultado);
    }, 5000);
};

// ===================================================================================
// 🚪 ENDPOINTS DA API (CÓDIGO SEM ALTERAÇÕES)
// ===================================================================================
app.post('/enviar-mensagem', async (req, res) => { /* ... sua lógica de envio de mensagem ... */ });
app.get('/status', (req, res) => { /* ... sua lógica de status ... */ });

// ===================================================================================
// 🚀 INICIALIZAÇÃO DO BOT
// ===================================================================================
console.log('🤖 Iniciando cliente WhatsApp...');

client.initialize()
    .then(() => {
        console.log("👍 Cliente WhatsApp inicializado com sucesso, aguardando evento 'ready'...");
    })
    .catch(error => {
        console.error('❌ FALHA CRÍTICA AO INICIALIZAR CLIENTE:', error);
        process.exit(1);
    });
