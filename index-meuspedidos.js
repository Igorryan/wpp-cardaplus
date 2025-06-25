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
const BACKEND_URL = 'https://api.cardaplus.com'; // URL do backend em produção

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
            '--disable-sync',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--memory-pressure-off',
            '--max_old_space_size=4096'
        ],
        timeout: 60000,
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false
    },
    takeoverOnConflict: true,
    takeoverTimeoutMs: 60000
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
    
    // Tentar reconectar após 30 segundos
    console.log('🔄 Tentando reconectar em 30 segundos...');
    setTimeout(() => {
        inicializarClienteComRetry();
    }, 30000);
});

// Evento para capturar erros gerais
client.on('error', (error) => {
    console.error('❌ Erro no cliente WhatsApp:', error);
    
    // Se for erro crítico, tentar reinicializar
    if (error.message.includes('Protocol error') || error.message.includes('Target closed')) {
        console.log('🔄 Erro crítico detectado. Reinicializando em 15 segundos...');
        setTimeout(() => {
            process.exit(1); // PM2 vai reiniciar automaticamente
        }, 15000);
    }
});

// Resposta automática para quem tentar conversar com o bot
client.on('message', async (message) => {
    if (message.from.endsWith('@g.us') || message.fromMe) return;
    
    // const respostaAutomatica = "Olá! 👋 Este é um canal exclusivo para o envio de notificações da Cardaplus. No momento, não consigo processar respostas por aqui. Se precisar de ajuda, por favor, acesse nosso site: https://cardaplus.com";
    // await message.reply(respostaAutomatica);
});

app.post('/cupomshop/logs', async (req, res) => {
    // Pegamos os dados que o seu site enviou: o número e o nome do cliente.
    const { mensagem } = req.body;

    console.log('\n📨 NOVA REQUISIÇÃO: POST /cupomshop/logs');
    console.log('🏪 Mensagem:', mensagem);

    // Validação básica
    if (!mensagem) {
        console.log('❌ Dados incompletos recebidos');
        return res.status(400).json({ status: 'erro', mensagem: 'Dados incompletos. É necessário fornecer mensagem.' });
    }

    try {
        // Envia a mensagem!
        const numeroNotificacao = '553189551995@c.us';
        await client.sendMessage(numeroNotificacao, `${mensagem}`);
        
        console.log(`✅ Mensagem enviada com sucesso`);
        res.status(200).json({ status: 'sucesso', mensagem: 'Mensagem enviada com sucesso!' });

    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        res.status(500).json({ status: 'erro', mensagem: 'Falha ao enviar a mensagem via WhatsApp.' });
    }
});

// ===================================================================================
// 🔧 FUNÇÕES AUXILIARES
// ===================================================================================

// Controle de falhas na verificação de WhatsApp
let verificacaoWhatsAppHabilitada = true;
let contadorErrosVerificacao = 0;
const MAX_ERROS_VERIFICACAO = 10;

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

// Função para verificar se está no horário comercial (7h às 23h) - HORÁRIO BRASILEIRO
const estaNoHorarioComercial = () => {
    const agoraBrasil = obterDateBrasil();
    const horaAtual = agoraBrasil.getHours();
    
    // Verifica se está entre 7h (inclusive) e 23h (exclusive) no horário brasileiro
    return horaAtual >= 7 && horaAtual < 23;
};

// Função para calcular próximo horário comercial - HORÁRIO BRASILEIRO
const calcularProximoHorarioComercial = () => {
    const agoraBrasil = obterDateBrasil();
    const horaAtual = agoraBrasil.getHours();
    
    if (horaAtual < 7) {
        // Se for antes das 7h, próximo horário é hoje às 7h
        const proximoHorario = new Date(agoraBrasil);
        proximoHorario.setHours(7, 0, 0, 0);
        return proximoHorario;
    } else if (horaAtual >= 23) {
        // Se for depois das 23h, próximo horário é amanhã às 7h
        const proximoHorario = new Date(agoraBrasil);
        proximoHorario.setDate(agoraBrasil.getDate() + 1);
        proximoHorario.setHours(7, 0, 0, 0);
        return proximoHorario;
    }
    
    // Se está no horário comercial, não deveria chamar esta função, mas retorna um horário futuro de segurança
    const proximoHorario = new Date(agoraBrasil);
    proximoHorario.setHours(23, 0, 0, 0);
    return proximoHorario;
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
        const response = await axios.get(`${BACKEND_URL}/lead/application/without`);
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
            lastMessageApplication: new Date()
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

// Função para verificar se um número possui WhatsApp com timeout e fallback
const verificarSeTemWhatsApp = async (numeroPadronizado, timeoutMs = 5000) => {
    // Se a verificação foi desabilitada devido a muitos erros, assume que tem WhatsApp
    if (!verificacaoWhatsAppHabilitada) {
        console.log(`⚠️ Verificação WhatsApp desabilitada temporariamente. Assumindo que ${numeroPadronizado} tem WhatsApp`);
        return true;
    }

    try {
        // Verifica se o cliente está realmente conectado e pronto
        const state = await client.getState();
        if (state !== 'CONNECTED') {
            console.log(`⚠️ Cliente não conectado (${state}). Assumindo que ${numeroPadronizado} tem WhatsApp`);
            return true; // Se não conseguir verificar, assume que tem para tentar enviar
        }

        const numeroFormatado = `${numeroPadronizado}@c.us`;
        
        // Adiciona timeout para a verificação
        const verificacaoPromise = client.isRegisteredUser(numeroFormatado);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout na verificação')), timeoutMs)
        );
        
        const isRegistered = await Promise.race([verificacaoPromise, timeoutPromise]);
        
        // Se chegou até aqui, a verificação funcionou - reseta o contador de erros
        if (contadorErrosVerificacao > 0) {
            contadorErrosVerificacao = 0;
            console.log(`✅ Verificação WhatsApp funcionando novamente`);
        }
        
        return isRegistered;
        
    } catch (error) {
        contadorErrosVerificacao++;
        console.error(`❌ Erro ao verificar se ${numeroPadronizado} tem WhatsApp (${contadorErrosVerificacao}/${MAX_ERROS_VERIFICACAO}):`, error.message);
        
        // Se atingiu o máximo de erros, desabilita a verificação temporariamente
        if (contadorErrosVerificacao >= MAX_ERROS_VERIFICACAO) {
            verificacaoWhatsAppHabilitada = false;
            console.log(`🚫 Muitos erros na verificação WhatsApp. Desabilitando por 30 minutos...`);
            
            // Reabilita após 30 minutos
            setTimeout(() => {
                verificacaoWhatsAppHabilitada = true;
                contadorErrosVerificacao = 0;
                console.log(`✅ Verificação WhatsApp reabilitada`);
            }, 30 * 60 * 1000); // 30 minutos
        }
        
        // Lista de erros que indicam problemas com WhatsApp Web (não com o número)
        const errosWhatsAppWeb = [
            'WidFactory',
            'Evaluation failed',
            'Timeout na verificação',
            'Protocol error',
            'Target closed',
            'Session closed'
        ];
        
        const isErroWhatsAppWeb = errosWhatsAppWeb.some(erro => 
            error.message.includes(erro)
        );
        
        if (isErroWhatsAppWeb) {
            console.log(`⚠️ Erro do WhatsApp Web detectado. Assumindo que ${numeroPadronizado} tem WhatsApp`);
            return true; // Tenta enviar mesmo assim
        }
        
        return false; // Para outros erros, assume que não tem WhatsApp
    }
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

        console.log(`📱 ${numerosUnicos.length} número(s) para validação ${numerosParaEnviar.length !== numerosUnicos.length ? `(${numerosParaEnviar.length - numerosUnicos.length} duplicata(s) removida(s))` : ''}`);
        
        // Verifica quais números possuem WhatsApp
        const numerosComWhatsApp = [];
        let numerosVerificados = 0;
        
        for (const item of numerosUnicos) {
            numerosVerificados++;
            console.log(`🔍 Verificando ${numerosVerificados}/${numerosUnicos.length}: ${item.numeroPadronizado} (${item.tipo})`);
            
            const temWhatsApp = await verificarSeTemWhatsApp(item.numeroPadronizado);
            
            if (temWhatsApp) {
                numerosComWhatsApp.push(item);
                console.log(`✅ WhatsApp confirmado: ${item.numeroPadronizado}`);
            } else {
                console.log(`❌ Sem WhatsApp: ${item.numeroPadronizado}`);
            }
            
            // Pequena pausa entre verificações para não sobrecarregar
            if (numerosVerificados < numerosUnicos.length) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo
            }
        }
        
        console.log(`📊 Números com WhatsApp: ${numerosComWhatsApp.length}/${numerosUnicos.length}`);
        
        if (numerosComWhatsApp.length === 0) {
            console.log('⚠️  Nenhum número possui WhatsApp');
            return false;
        }

        // Monta a mensagem personalizada
        const mensagem = `*🚨 Nova Oportunidade para Restaurantes do iFood*

Você já imaginou aumentar suas avaliações 5 estrelas e ainda ganhar uma renda extra com cada pedido aceito?

📦 Nós temos uma solução discreta e eficiente:
Enviamos pedidos com cupom direto para o seu restaurante.
Você só precisa aceitar normalmente — como qualquer pedido.

💡 O resultado?
⭐ Avaliações positivas que impulsionam seu ranking
💸 Ganhos diretos a cada pedido aceito
🔒 Processo 100% seguro, validado e transparente

📈 Já ajudamos mais de 200 restaurantes a crescerem com esse sistema nos últimos 5 anos.

Quer saber como funciona na prática? Me chama aqui que te explico rapidinho. Sem compromisso.`;

        let enviosRealizados = 0; 
        let enviosBemSucedidos = 0;

        // Envia mensagem para todos os números que possuem WhatsApp
        for (const item of numerosComWhatsApp) {
            try {
                enviosRealizados++;
                
                const numeroFormatado = `${item.numeroPadronizado}@c.us`;

                // Envia a mensagem!
                await client.sendMessage(numeroFormatado, mensagem);
                enviosBemSucedidos++;
                
                console.log(`✅ Enviado para ${item.numeroPadronizado} (${item.tipo})`);
                
                // Pequena pausa entre envios para evitar spam
                if (enviosRealizados < numerosComWhatsApp.length) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos
                }
                
            } catch (error) {
                console.error(`❌ Erro ao enviar para ${item.numeroPadronizado}:`, error.message);
            }
        }
        
        console.log(`📊 Resultado: ${enviosBemSucedidos}/${numerosComWhatsApp.length} envios bem-sucedidos`);
        
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
            
            console.log(`🕘 Fora do horário comercial (7h-23h)`);
            console.log(`⏰ Próximo envio: ${proximoHorarioFormatado} (em ${tempoAte})`);
            return 'fora_horario'; // Indica que está fora do horário
        }
        
        console.log('✅ No horário comercial - Buscando leads...');
        
        const META_ENVIOS = 3; // Meta de mensagens enviadas com sucesso
        const MAX_TENTATIVAS = 10; // Máximo de leads para tentar processar
        
        let leadsProcessados = 0;
        let enviosBemSucedidos = 0;
        let tentativas = 0;
        
        // Continua processando até conseguir 3 envios bem-sucedidos ou esgotar as tentativas
        while (enviosBemSucedidos < META_ENVIOS && tentativas < MAX_TENTATIVAS) {
            try {
                tentativas++;
                
                // Busca um lead sem mensagem
                const lead = await buscarLeadSemMensagem();
                
                if (!lead) {
                    console.log(`🏁 Nenhum lead pendente (tentativa ${tentativas}/${MAX_TENTATIVAS})`);
                    break;
                }
                
                leadsProcessados++;
                console.log(`\n📋 Processando lead ${leadsProcessados} (Tentativa ${tentativas}/${MAX_TENTATIVAS})`);
                console.log(`🎯 Meta: ${enviosBemSucedidos}/${META_ENVIOS} envios bem-sucedidos`);
                
                // Envia mensagem para o lead encontrado
                const sucesso = await enviarMensagemAutomaticaLead(lead);
                
                if (sucesso) {
                    enviosBemSucedidos++;
                    console.log(`✅ Envio bem-sucedido! Progresso: ${enviosBemSucedidos}/${META_ENVIOS}`);
                    
                    // Se atingiu a meta, pode parar
                    if (enviosBemSucedidos >= META_ENVIOS) {
                        console.log(`🎉 Meta atingida! ${META_ENVIOS} mensagens enviadas com sucesso!`);
                        break;
                    }
                } else {
                    console.log(`⚠️ Envio falhou. Continuando... (${enviosBemSucedidos}/${META_ENVIOS})`);
                }
                
                // Pausa de 3 segundos entre leads para evitar spam
                if (enviosBemSucedidos < META_ENVIOS && tentativas < MAX_TENTATIVAS) {
                    console.log('⏳ Aguardando 3 segundos antes do próximo lead...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
                
            } catch (error) {
                console.error(`❌ Erro ao processar tentativa ${tentativas}:`, error.message);
            }
        }
        
        // Resultados finais
        if (leadsProcessados === 0) {
            console.log('🏁 Nenhum lead encontrado');
            return false;
        }
        
        console.log(`\n📊 RESULTADO DO CICLO:`);
        console.log(`   • Leads processados: ${leadsProcessados}`);
        console.log(`   • Tentativas realizadas: ${tentativas}`);
        console.log(`   • Envios bem-sucedidos: ${enviosBemSucedidos}/${META_ENVIOS}`);
        console.log(`   • Taxa de sucesso: ${leadsProcessados > 0 ? Math.round((enviosBemSucedidos / leadsProcessados) * 100) : 0}%`);
        
        // Determina o resultado baseado na meta atingida
        const metaAtingida = enviosBemSucedidos >= META_ENVIOS;
        
        if (metaAtingida) {
            console.log(`🎯 META ATINGIDA! ${enviosBemSucedidos} mensagens enviadas com sucesso!`);
            return true; // Retorna true para aguardar o intervalo completo
        } else {
            console.log(`⚠️ Meta não atingida. Apenas ${enviosBemSucedidos}/${META_ENVIOS} envios bem-sucedidos`);
            return false; // Retorna false para tentar novamente mais rápido
        }
        
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
        // Se foi bem-sucedido, aguarda 15 minutos
        intervalo = 15 * 60 * 1000; // 15 minutos
        mensagemIntervalo = '15 minutos';
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
    console.log('\n🚀 Sistema automático iniciado!');
    
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

        // Verifica se o número possui WhatsApp antes de enviar
        console.log('🔍 Verificando se o número possui WhatsApp...');
        const temWhatsApp = await verificarSeTemWhatsApp(numeroPadronizado);
        
        if (!temWhatsApp) {
            console.log(`❌ Número ${numeroPadronizado} não possui WhatsApp`);
            return res.status(400).json({ 
                status: 'erro', 
                mensagem: 'O número informado não possui WhatsApp ativo.' 
            });
        }
        
        console.log(`✅ WhatsApp confirmado para ${numeroPadronizado}`);

        // Monta a mensagem personalizada de agradecimento
        const mensagem = `Olá, ${nomeCliente}! 👋 Muito obrigado pelo seu pedido de melhoria de cardápio na Cardaplus!\n\nRecebemos a sua loja: *${nomeLoja}*.\n\nJá estamos preparando tudo por aqui com muito carinho. Em breve você receberá novas atualizações. 🚀`;

        // Envia a mensagem!
        await client.sendMessage(numeroFormatado, mensagem);
        
        // Envia notificação para o número fixo (com validação)
        const numeroNotificacao = '553189551995@c.us';
        await client.sendMessage(numeroNotificacao, `${nomeCliente} acabou de solicitar uma melhoria de cardápio na Cardaplus!`);
        
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
        if (proximoHorario) {
            proximoEnvio = proximoHorario.toLocaleString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else {
            proximoEnvio = 'Erro ao calcular próximo horário';
        }
    }
    
    res.json({
        status: 'ativo',
        mensagem: 'Sistema automático de leads rodando',
        configuracao: {
            metaEnvios: 3,
            maxTentativas: 10,
            pausaEntreLeads: '3 segundos',
            pausaAposMetaAtingida: '10 minutos',
            pausaSeMetaNaoAtingida: '2 segundos'
        },
        verificacaoWhatsApp: {
            habilitada: verificacaoWhatsAppHabilitada,
            errosConsecutivos: contadorErrosVerificacao,
            maxErros: MAX_ERROS_VERIFICACAO,
            timeout: '5 segundos'
        },
        horario: {
            atual: horarioAtual,
            comercial: '7h às 23h',
            ativo: dentroHorario,
            proximoEnvio: dentroHorario ? 'Em funcionamento' : proximoEnvio
        },
        intervalo: {
            sucesso: '10 minutos',
            falha: '2 segundos',
            foraHorario: 'Até próximo horário comercial'
        },
        backend: BACKEND_URL
    });
});

// ===================================================================================
// 🚀 INICIALIZAÇÃO COM RETRY AUTOMÁTICO
// ===================================================================================

let tentativasInicializacao = 0;
const MAX_TENTATIVAS = 3;

const inicializarClienteComRetry = async () => {
    tentativasInicializacao++;
    
    try {
        console.log(`🤖 Iniciando bot WhatsApp... (Tentativa ${tentativasInicializacao}/${MAX_TENTATIVAS})`);
        await client.initialize();
        
    } catch (error) {
        console.error(`❌ Erro ao inicializar cliente (Tentativa ${tentativasInicializacao}):`, error.message);
        
        if (tentativasInicializacao < MAX_TENTATIVAS) {
            console.log(`🔄 Tentando novamente em 10 segundos...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            // Limpa recursos antes de tentar novamente
            try {
                await client.destroy();
            } catch (destroyError) {
                console.log('⚠️ Erro ao limpar cliente anterior:', destroyError.message);
            }
            
            return inicializarClienteComRetry();
        } else {
            console.error(`💀 Falha após ${MAX_TENTATIVAS} tentativas. Encerrando...`);
            process.exit(1);
        }
    }
};

// Inicializar o cliente
inicializarClienteComRetry();
