// 🧪 TESTE DA API DO GOOGLE GEMINI
// Execute com: node teste-api.js

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testarAPI() {
    console.log('🧪 Testando conexão com a API do Google Gemini...\n');

    // Verificar se a chave foi configurada
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'SUA_CHAVE_API_VAI_AQUI') {
        console.error('❌ ERRO: Chave da API não configurada!');
        console.error('💡 Edite o arquivo .env e adicione sua chave da API.');
        return;
    }

    try {
        // Configurar a IA
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        
        // Testar diferentes modelos
        const modelos = [
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-1.0-pro'
        ];

        for (const nomeModelo of modelos) {
            try {
                console.log(`📡 Testando modelo: ${nomeModelo}`);
                
                const model = genAI.getGenerativeModel({ model: nomeModelo });
                const result = await model.generateContent('Diga apenas "Olá! API funcionando!" em português.');
                const response = await result.response;
                const texto = response.text();
                
                console.log(`✅ ${nomeModelo}: ${texto}`);
                console.log('─'.repeat(50));
                
            } catch (error) {
                console.log(`❌ ${nomeModelo}: ${error.message}`);
                console.log('─'.repeat(50));
            }
        }

        console.log('\n🎉 Teste concluído!');
        console.log('💡 Use o modelo que funcionou no arquivo index.js');

    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    }
}

// Executar teste
testarAPI(); 