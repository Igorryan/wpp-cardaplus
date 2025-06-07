# 🔄 Integração WhatsApp + QuoteRequest

## 📋 Visão Geral

Este sistema integra o bot de notificações do WhatsApp com a página de checkout do QuoteRequest. Quando um cliente finaliza uma compra (pagamento aprovado), uma notificação é enviada automaticamente via WhatsApp.

## 🏗️ Arquitetura da Integração

```
┌─────────────────┐    📱 Pagamento     ┌──────────────────┐    📤 API Call    ┌─────────────────┐
│   QuoteRequest  │ ────Aprovado────> │  Frontend React  │ ──────────────>  │  Bot WhatsApp   │
│   (Checkout)    │                    │   (localhost)    │                   │ (localhost:3000)│
└─────────────────┘                    └──────────────────┘                   └─────────────────┘
                                               │                                         │
                                               │                                         │
                                               ▼                                         ▼
                                        💳 Payment APIs                          📲 WhatsApp Web
                                        (Mercado Pago)                          (whatsapp-web.js)
```

## 🚀 Como Funciona

### 1. Fluxo de Pagamento
1. Cliente preenche dados no QuoteRequest
2. Seleciona plano e método de pagamento (PIX ou Cartão)
3. Pagamento é processado via Mercado Pago
4. **Sistema detecta pagamento aprovado**
5. **Dispara notificação automática via WhatsApp**

### 2. Dados Enviados para WhatsApp
```javascript
{
  "numero": "5531999998888",      // Telefone do cliente (formatado)
  "nomeCliente": "João Silva",    // Nome do cliente
  "nomeLoja": "Pizzaria do João"  // Nome da loja do iFood
}
```

### 3. Mensagem Enviada
```
Olá, João Silva! 👋 

Muito obrigado pelo seu pedido de melhoria de cardápio na Cardaplus!

Recebemos a sua loja: *Pizzaria do João*.

Já estamos preparando tudo por aqui com muito carinho. Em breve você receberá novas atualizações. 🚀
```

## 🔧 Configuração

### 1. Bot WhatsApp (localhost:3000)
```bash
# Na pasta whatsapp/
npm install
npm start
```

### 2. Frontend React (localhost:porta_do_frontend)
- A integração já está configurada no arquivo `QuoteRequest/index.tsx`
- Chama automaticamente `http://localhost:3000/enviar-mensagem` após pagamento aprovado

## 📝 Pontos de Integração

### PIX - Pagamento Aprovado
**Arquivo:** `frontend/src/pages/QuoteRequest/index.tsx`
**Linha:** ~441
```javascript
if (response.data.status === 'aprovado') {
  // ... atualizar order ...
  
  // 📱 Enviar notificação via WhatsApp
  await enviarNotificacaoWhatsApp();
  
  setCurrentSlide(totalSlides);
}
```

### Cartão - Pagamento Aprovado
**Arquivo:** `frontend/src/pages/QuoteRequest/index.tsx`
**Linha:** ~838
```javascript
if (response.data.success && response.data.status === 'approved') {
  // ... atualizar order ...
  
  // 📱 Enviar notificação via WhatsApp
  await enviarNotificacaoWhatsApp();
  
  setCurrentSlide(totalSlides);
}
```

## 🛠️ Função de Integração

```javascript
const enviarNotificacaoWhatsApp = async () => {
  try {
    // Formatar número: 5531999998888
    const numeroLimpo = formData.phone.replace(/\D/g, '');
    const numeroCompleto = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;
    
    const dadosNotificacao = {
      numero: numeroCompleto,
      nomeCliente: formData.name,
      nomeLoja: storePreview?.name || 'Loja não identificada'
    };

    const response = await fetch('http://localhost:3000/enviar-mensagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosNotificacao)
    });

    if (response.ok) {
      console.log('✅ Notificação WhatsApp enviada');
    }
  } catch (error) {
    console.error('❌ Erro na integração WhatsApp:', error);
    // Não interrompe o fluxo principal
  }
};
```

## 🔍 Logs e Monitoramento

### Frontend (Console do Browser)
```
📱 Enviando notificação via WhatsApp...
📤 Dados para WhatsApp: {numero: "5531999998888", nomeCliente: "João", nomeLoja: "Pizzaria"}
✅ Notificação WhatsApp enviada: {status: "sucesso", mensagem: "Mensagem enviada com sucesso!"}
```

### Backend WhatsApp (Terminal)
```
📨 NOVA REQUISIÇÃO: POST /enviar-mensagem
👤 Cliente: João Silva
📱 Número: 5531999998888
🏪 Loja: Pizzaria do João
✅ Mensagem enviada com sucesso para João Silva (5531999998888)
```

## ⚠️ Considerações Importantes

### 1. Ordem de Inicialização
```bash
# 1. Primeiro, inicie o bot WhatsApp
cd whatsapp && npm start

# 2. Depois, inicie o frontend
cd frontend && npm run dev
```

### 2. Tratamento de Erros
- Se o bot WhatsApp estiver offline, a notificação falha **silenciosamente**
- O checkout continua normalmente mesmo se o WhatsApp falhar
- Logs de erro são registrados no console para debug

### 3. Formatação de Números
- Remove todos os caracteres não-numéricos
- Adiciona código do país (55) se não existir
- Formato final: `5531999998888@c.us`

## 🧪 Testando a Integração

### 1. Teste Manual
1. Inicie o bot WhatsApp (`npm start` na pasta whatsapp)
2. Escaneie o QR Code com seu WhatsApp
3. Acesse o QuoteRequest no frontend
4. Complete uma compra até o pagamento ser aprovado
5. Verifique se recebeu a mensagem no WhatsApp

### 2. Teste da API Diretamente
```bash
curl -X POST http://localhost:3000/enviar-mensagem \
  -H "Content-Type: application/json" \
  -d '{
    "numero": "5531999998888",
    "nomeCliente": "Teste",
    "nomeLoja": "Loja Teste"
  }'
```

## 🔧 Troubleshooting

### Problema: "Connection refused localhost:3000"
**Causa:** Bot WhatsApp não está rodando
**Solução:** `cd whatsapp && npm start`

### Problema: "Mensagem não foi enviada"
**Causa:** WhatsApp não conectado
**Solução:** Verificar QR Code e conexão

### Problema: "Número inválido"
**Causa:** Formato do telefone incorreto
**Solução:** Verificar se o número tem DDD correto

---

## 📊 Status da Integração
- ✅ PIX - Integrado e testado
- ✅ Cartão de Crédito - Integrado e testado  
- ✅ Formatação de números - Funcionando
- ✅ Tratamento de erros - Implementado
- ✅ Logs e monitoramento - Ativo 