# 🤖 WhatsApp Gemini Bot

Bot inteligente para WhatsApp integrado com a API do Google Gemini para respostas automáticas e inteligentes.

## ✨ Funcionalidades

- 🧠 **IA Avançada**: Integração com Google Gemini para respostas inteligentes
- 💬 **WhatsApp Web**: Conecta-se ao WhatsApp Web usando whatsapp-web.js
- 🔐 **Sessão Persistente**: Mantém a sessão ativa, não precisa escanear QR Code toda vez
- 📱 **Apenas Conversas Privadas**: Ignora mensagens de grupos automaticamente
- ⌨️ **Feedback Visual**: Mostra "digitando..." enquanto processa a mensagem
- 🔄 **Tratamento de Erros**: Sistema robusto de tratamento de erros
- 📋 **Logs Detalhados**: Sistema completo de logs para monitoramento

## 🚀 Configuração e Instalação

### 1. Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- Conta do Google para acessar a API do Gemini

### 2. Obter Chave da API do Google Gemini

1. Acesse [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Faça login com sua conta Google
3. Crie uma nova chave de API
4. Copie a chave gerada

### 3. Instalação

```bash
# 1. Navegue até a pasta do projeto
cd whatsapp

# 2. Instale as dependências
npm install

# 3. Configure a chave da API
# Edite o arquivo .env e substitua "SUA_CHAVE_API_VAI_AQUI" pela sua chave real
nano .env
```

### 4. Configuração do arquivo .env

Abra o arquivo `.env` e substitua o valor da chave:

```env
# Coloque sua chave de API do Google Gemini aqui
GEMINI_API_KEY="sua_chave_real_aqui"
```

## 🏃‍♂️ Como Executar

### Modo Produção
```bash
npm start
```

### Modo Desenvolvimento (com auto-reload)
```bash
npm run dev
```

## 📱 Primeira Conexão

1. Execute o bot com `npm start`
2. Um QR Code aparecerá no terminal
3. Abra o WhatsApp no seu celular
4. Vá em **Menu** → **WhatsApp Web** → **Escanear código QR**
5. Escaneie o código QR exibido no terminal
6. Aguarde a mensagem "BOT CONECTADO COM SUCESSO!"

## 💡 Como Usar

Após a conexão:

1. **Envie uma mensagem** para o número conectado ao bot
2. O bot mostrará **"digitando..."** enquanto processa
3. **Resposta inteligente** será enviada automaticamente
4. O bot funciona apenas em **conversas privadas** (não responde em grupos)

## 🔧 Estrutura do Projeto

```
whatsapp/
├── package.json      # Dependências e scripts
├── index.js          # Código principal do bot
├── .env              # Variáveis de ambiente (chave da API)
├── .gitignore        # Arquivos ignorados pelo Git
├── README.md         # Este arquivo
└── .wwebjs_auth/     # Dados de sessão (criado automaticamente)
```

## 📋 Logs e Monitoramento

O bot exibe logs detalhados no console:

- ✅ Status de conexão
- 📨 Mensagens recebidas
- 🤖 Respostas da IA
- ❌ Erros e problemas
- 📊 Estatísticas de uso

## 🛠️ Personalização

### Modificar o Comportamento da IA

Edite o `prompt` no arquivo `index.js` (linha ~115) para personalizar como a IA responde:

```javascript
const prompt = `Você é um assistente inteligente integrado ao WhatsApp.
// Adicione suas instruções personalizadas aqui
`;
```

### Alterar Modelo da IA

Você pode alterar o modelo do Gemini editando a linha 23 do `index.js`:

```javascript
// Modelos disponíveis:
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Rápido e eficiente
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // Mais avançado
// const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" }); // Versão anterior
```

### Adicionar Comandos Específicos

Você pode adicionar comandos especiais antes de enviar para a IA:

```javascript
// Exemplo: comando /help
if (userMessage.startsWith('/help')) {
    await message.reply('🤖 Comandos disponíveis:\n/help - Esta mensagem\n/sobre - Informações do bot');
    return;
}
```

## ⚠️ Considerações Importantes

1. **Política do WhatsApp**: Use com responsabilidade e respeite os termos de uso
2. **Limites da API**: A API do Gemini pode ter limites de uso
3. **Sessão**: Os dados de sessão são salvos em `.wwebjs_auth/`
4. **Segurança**: Nunca compartilhe sua chave da API

## 🐛 Solução de Problemas

### Bot não conecta
- Verifique se o Node.js está atualizado
- Tente deletar a pasta `.wwebjs_auth/` e reconectar

### Erro de API Key
- Verifique se a chave no arquivo `.env` está correta
- Confirme se a API do Gemini está ativa na sua conta Google

### QR Code não aparece
- Verifique se todas as dependências foram instaladas
- Tente executar com `npm install` novamente

### Erro "model not found" ou "404 Not Found"
- Verifique se está usando o modelo correto: `gemini-1.5-flash`
- Modelos antigos como `gemini-pro` foram descontinuados
- Atualize o código se necessário conforme seção "Alterar Modelo da IA"

## 📄 Licença

MIT License - Veja o arquivo LICENSE para detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Abra uma issue ou envie um pull request.

---

**Desenvolvido com ❤️ usando Node.js, WhatsApp Web.js e Google Gemini AI** 