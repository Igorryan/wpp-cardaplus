// =========================================================
// 🤖 BOT WHATSAPP PARA NOTIFICAÇÕES (VIA API)
// =========================================================

// 📦 Importando as dependências necessárias
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios'); // Adicionado para fazer requisições HTTP
require('dotenv').config();

// ===================================================================================
// ⚙️ CONFIGURAÇÕES PRINCIPAIS
// ===================================================================================

const app = express();
const PORTA_API = process.env.PORT || 3000;
// Como ambos estão na mesma VPS, usar localhost é mais eficiente
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3333';

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
    authStrategy: new LocalAuth({
        dataPath: './auth_session'
    }),
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
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
            '--disable-gpu',
            '--disable-extensions',
            '--disable-default-apps',
            '--disable-translate',
            '--disable-sync'
        ]
    }
});

// Cliente configurado com estabilidade otimizada

// ===================================================================================
// 📱 INICIALIZAÇÃO E EVENTOS DO WHATSAPP
// ===================================================================================

client.on('authenticated', () => {
    console.log('✅ WhatsApp autenticado com sucesso!');
});

client.on('auth_failure', msg => {
    console.error('❌ Falha na autenticação:', msg);
});

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

    // 🎯 Inicia o sistema automático de envio de mensagens para leads
    iniciarEnvioAutomaticoLeads();
});

client.on('disconnected', (reason) => {
    console.log('🔌 Bot desconectado. Motivo:', reason);
});

// Evento para capturar erros gerais
client.on('error', (error) => {
    console.error('❌ Erro no cliente WhatsApp:', error);
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
    
    // Lógica especial para detectar e remover o 9º dígito extra
    if (numeroCompleto.length === 13) {
        // Formato: 55 + DDD (2) + 9 + 8 dígitos = 13 total
        const ddd = numeroCompleto.substring(2, 4);
        const primeiroDigito = numeroCompleto.substring(4, 5);
        const restante = numeroCompleto.substring(5);
        
        // Se o primeiro dígito após o DDD é 9, pode ser o 9º dígito extra
        if (primeiroDigito === '9') {
            const numeroSem9 = `55${ddd}${restante}`;
            return numeroSem9;
        }
    }
    
    return numeroCompleto;
};

// ===================================================================================
// 🤖 SISTEMA AUTOMÁTICO DE ENVIO PARA LEADS
// ===================================================================================

// Função para obter data/hora no fuso horário brasileiro
const obterHorarioBrasil = () => {
    return new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"});
};

// Função para obter objeto Date no horário brasileiro
const obterDateBrasil = () => {
    const horarioBrasil = obterHorarioBrasil();
    return new Date(horarioBrasil);
};

// Função para verificar se está no horário comercial (9h às 20h) - HORÁRIO BRASILEIRO
const estaNoHorarioComercial = () => {
    const agoraBrasil = obterDateBrasil();
    const horaAtual = agoraBrasil.getHours();
    
    // Verifica se está entre 9h (inclusive) e 20h (exclusive) no horário brasileiro
    return horaAtual >= 9 && horaAtual < 20;
};

// Função para calcular próximo horário comercial - HORÁRIO BRASILEIRO
const calcularProximoHorarioComercial = () => {
    const agoraBrasil = obterDateBrasil();
    const horaAtual = agoraBrasil.getHours();
    
    if (horaAtual < 9) {
        // Se for antes das 9h, próximo horário é hoje às 9h
        const proximoHorario = new Date(agoraBrasil);
        proximoHorario.setHours(9, 0, 0, 0);
        return proximoHorario;
    } else if (horaAtual >= 20) {
        // Se for depois das 20h, próximo horário é amanhã às 9h
        const proximoHorario = new Date(agoraBrasil);
        proximoHorario.setDate(agoraBrasil.getDate() + 1);
        proximoHorario.setHours(9, 0, 0, 0);
        return proximoHorario;
    }
    
    // Se está no horário comercial, retorna null
    return null;
};

// Função para formatar tempo até próximo horário - HORÁRIO BRASILEIRO
const formatarTempoAte = (dataFutura) => {
    const agoraBrasil = obterDateBrasil();
    const diff = dataFutura - agoraBrasil;
    
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (horas > 0) {
        return `${horas}h${minutos > 0 ? ` ${minutos}min` : ''}`;
    } else {
        return `${minutos}min`;
    }
};

// Função para buscar um lead sem mensagem do backend
const buscarLeadSemMensagem = async () => {
    try {
        const response = await axios.get(`${BACKEND_URL}/lead/`);
        return response.data;
    } catch (error) {
        console.error('❌ Erro ao buscar lead:', error.message);
        return null;
    }
};

// Função para atualizar o lastMessage do lead
const atualizarLastMessageLead = async (leadId) => {
    try {
        const response = await axios.put(`${BACKEND_URL}/lead/${leadId}`, {
            lastMessage: new Date()
        });
        return response.data;
    } catch (error) {
        console.error(`❌ Erro ao atualizar lastMessage do lead ${leadId}:`, error.message);
        return null;
    }
};

// Função para extrair e limpar números de telefone do cnpjPhone
const extrairNumerosCnpjPhone = (cnpjPhone) => {
    if (!cnpjPhone) return [];
    
    // Remove espaços extras e quebras de linha
    const textoLimpo = cnpjPhone.trim();
    
    // Verifica se há múltiplos números separados por "/"
    const numerosTexto = textoLimpo.includes('/') ? textoLimpo.split('/') : [textoLimpo];
    
    const numerosLimpos = [];
    
    numerosTexto.forEach(numTexto => {
        // Remove todos os caracteres não numéricos
        const numeroLimpo = numTexto.replace(/\D/g, '');
        
        if (numeroLimpo.length >= 8) { // Pelo menos 8 dígitos para ser um número válido
            numerosLimpos.push(numeroLimpo);
        }
    });
    
    return numerosLimpos;
};

// Função para montar número completo com DDD + Phone
const montarNumeroComDDD = (ddd, phone) => {
    if (!ddd || !phone) return null;
    
    // Remove caracteres não numéricos
    const dddLimpo = ddd.replace(/\D/g, '');
    const phoneLimpo = phone.replace(/\D/g, '');
    
    if (dddLimpo.length === 2 && phoneLimpo.length >= 8) {
        return dddLimpo + phoneLimpo;
    }
    
    return null;
};

// Função para enviar mensagem automática para um lead
const enviarMensagemAutomaticaLead = async (lead) => {
    try {
        console.log(`\n📨 Processando lead: ${lead.name}`);

        // Sempre atualiza o lastMessage, independentemente de ter telefone válido
        await atualizarLastMessageLead(lead.id);

        const numerosParaEnviar = [];
        
        // 1. Tenta montar número com DDD + Phone
        const numeroLoja = montarNumeroComDDD(lead.ddd, lead.phone);
        if (numeroLoja) {
            numerosParaEnviar.push({
                numero: numeroLoja,
                tipo: 'Loja (DDD + Phone)',
                original: `${lead.ddd} + ${lead.phone}`
            });
        }
        
        // 2. Extrai números do cnpjPhone
        const numerosCnpj = extrairNumerosCnpjPhone(lead.cnpjPhone);
        numerosCnpj.forEach((numero, index) => {
            numerosParaEnviar.push({
                numero: numero,
                tipo: `CNPJ Phone ${index + 1}`,
                original: lead.cnpjPhone
            });
        });

        if (numerosParaEnviar.length === 0) {
            console.log('⚠️  Sem números válidos');
            return false;
        }

        // Remove duplicatas baseado no número padronizado final
        const numerosUnicos = [];
        const numerosPadronizadosVistos = new Set();
        
        for (const item of numerosParaEnviar) {
            const numeroPadronizado = padronizarNumero(item.numero);
            
            if (!numerosPadronizadosVistos.has(numeroPadronizado)) {
                numerosPadronizadosVistos.add(numeroPadronizado);
                numerosUnicos.push({
                    ...item,
                    numeroPadronizado: numeroPadronizado
                });
            }
        }

        console.log(`📱 ${numerosUnicos.length} número(s) para envio ${numerosParaEnviar.length !== numerosUnicos.length ? `(${numerosParaEnviar.length - numerosUnicos.length} duplicata(s) removida(s))` : ''}`);
        

        // Monta a mensagem personalizada
        const mensagem = `Olá, ${lead.name}! 👋 

Somos da *Cardaplus* e nossa equipe especializada pode transformar seu cardápio atual em uma máquina de vendas.

Acesse nosso site e veja como podemos te ajudar: https://cardaplus.com.br

*Cardaplus - Seu cardápio é a sua vitrine!*`;

        let enviosRealizados = 0;
        let enviosBemSucedidos = 0;

        // Envia mensagem para todos os números únicos encontrados
        for (const item of numerosUnicos) {
            try {
                enviosRealizados++;
                
                // Usar o número já padronizado da verificação de duplicatas
                const numeroPadronizado = item.numeroPadronizado;
                const numeroFormatado = `${numeroPadronizado}@c.us`;

                // Envia a mensagem!
                await client.sendMessage(numeroFormatado, mensagem);
                enviosBemSucedidos++;
                
                console.log(`✅ Enviado para ${numeroPadronizado} (${item.tipo})`);
                
                // Pequena pausa entre envios para evitar spam
                if (enviosRealizados < numerosUnicos.length) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos
                }
                
            } catch (error) {
                console.error(`❌ Erro ao enviar para ${item.numero}:`, error.message);
            }
        }
        
        console.log(`📊 Resultado: ${enviosBemSucedidos}/${numerosUnicos.length} envios bem-sucedidos`);
        
        // Considera sucesso se pelo menos 1 envio foi bem-sucedido
        return enviosBemSucedidos > 0;

    } catch (error) {
        console.error('❌ Erro geral ao enviar mensagem automática:', error.message);
        
        // Mesmo com erro no envio, marca como processado
        try {
            await atualizarLastMessageLead(lead.id);
        } catch (updateError) {
            console.error(`❌ Erro ao atualizar lastMessage:`, updateError.message);
        }
        
        return false;
    }
};

// Função principal que executa o processo automático
const processarEnvioAutomaticoLead = async () => {
    try {
        const agoraBrasil = obterDateBrasil();
        const horaFormatada = agoraBrasil.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        console.log(`\n🤖 Verificando horário Brasil (${horaFormatada})...`);
        
        // Verifica se está no horário comercial
        if (!estaNoHorarioComercial()) {
            const proximoHorario = calcularProximoHorarioComercial();
            const tempoAte = formatarTempoAte(proximoHorario);
            const proximoHorarioFormatado = proximoHorario.toLocaleString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            console.log(`🕘 Fora do horário comercial (9h-20h)`);
            console.log(`⏰ Próximo envio: ${proximoHorarioFormatado} (em ${tempoAte})`);
            return 'fora_horario'; // Indica que está fora do horário
        }
        
        console.log('✅ No horário comercial - Buscando lead...');
        
        // Busca um lead sem mensagem
        const lead = await buscarLeadSemMensagem();
        
        if (!lead) {
            console.log('🏁 Nenhum lead pendente');
            return false;
        }
        
        // Envia mensagem para o lead encontrado
        const sucesso = await enviarMensagemAutomaticaLead(lead);
        
        console.log(sucesso ? '✅ Processo concluído com sucesso!' : '⚠️ Processo concluído com falhas');
        return sucesso;
        
    } catch (error) {
        console.error('❌ Erro no processo automático:', error.message);
        return false;
    }
};

// Variável para controlar o timeout
let proximoEnvioTimeout = null;

// Função para agendar próximo envio baseado no resultado
const agendarProximoEnvio = (resultado) => {
    // Limpa o timeout anterior se existir
    if (proximoEnvioTimeout) {
        clearTimeout(proximoEnvioTimeout);
    }
    
    let intervalo;
    let mensagemIntervalo;
    
    if (resultado === 'fora_horario') {
        // Se está fora do horário comercial, aguarda até o próximo horário
        const proximoHorario = calcularProximoHorarioComercial();
        const agoraBrasil = obterDateBrasil();
        intervalo = proximoHorario - agoraBrasil;
        mensagemIntervalo = formatarTempoAte(proximoHorario);
    } else if (resultado === true) {
        // Se foi bem-sucedido, aguarda 10 minutos
        intervalo = 10 * 60 * 1000; // 10 minutos
        mensagemIntervalo = '10 minutos';
    } else {
        // Se falhou ou não encontrou lead, tenta novamente em 2 minutos
        intervalo = 2 * 20 * 100; // 2 segundos
        mensagemIntervalo = '2 segundos';
    }
    
    console.log(`⏰ Próximo envio em: ${mensagemIntervalo}`);
    
    proximoEnvioTimeout = setTimeout(async () => {
        const novoResultado = await processarEnvioAutomaticoLead();
        agendarProximoEnvio(novoResultado);
    }, intervalo);
};

// Função para iniciar o sistema automático
const iniciarEnvioAutomaticoLeads = () => {
    const agoraBrasil = obterDateBrasil();
    const agoraVPS = new Date();
    
    console.log('\n🚀 Sistema automático iniciado!');
    console.log('🕘 Horário comercial: 9h às 20h (Brasil)');
    console.log(`🌎 Horário Brasil: ${agoraBrasil.toLocaleTimeString('pt-BR')}`);
    console.log(`🖥️  Horário VPS: ${agoraVPS.toLocaleTimeString('pt-BR')}`);
    console.log('⏰ Intervalo: 10min (sucesso) / 2min (falha)');
    
    // Executa a primeira vez após 5 segundos
    setTimeout(async () => {
        const resultado = await processarEnvioAutomaticoLead();
        agendarProximoEnvio(resultado);
    }, 5000);
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

// ===================================================================================
// 🔍 ENDPOINT PARA VERIFICAR STATUS DO SISTEMA AUTOMÁTICO
// ===================================================================================

app.get('/status', (req, res) => {
    const agoraBrasil = obterDateBrasil();
    const horarioAtual = agoraBrasil.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dentroHorario = estaNoHorarioComercial();
    
    let proximoEnvio = 'Calculando...';
    if (!dentroHorario) {
        const proximoHorario = calcularProximoHorarioComercial();
        proximoEnvio = proximoHorario.toLocaleString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    res.json({
        status: 'ativo',
        mensagem: 'Sistema automático de leads rodando',
        horario: {
            atual: horarioAtual,
            comercial: '9h às 20h',
            ativo: dentroHorario,
            proximoEnvio: dentroHorario ? 'Em funcionamento' : proximoEnvio
        },
        intervalo: {
            sucesso: '10 minutos',
            falha: '2 minutos',
            foraHorario: 'Até próximo horário comercial'
        },
        backend: BACKEND_URL
    });
});

// 🚀 Inicializar o cliente do WhatsApp
console.log('🤖 Iniciando bot WhatsApp...');

client.initialize().catch(error => {
    console.error('❌ Erro ao inicializar cliente:', error);
    process.exit(1);
});
