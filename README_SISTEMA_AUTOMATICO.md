# 🤖 Sistema Automático de Envio de Mensagens para Leads

## 📋 Visão Geral

Este sistema foi desenvolvido para enviar mensagens automáticas via WhatsApp para leads da Cardaplus que ainda não receberam mensagem. O sistema funciona de forma totalmente automática, buscando leads no banco de dados de produção e enviando mensagens personalizadas.

## ⚙️ Como Funciona

### 🔄 Processo Automático

1. **Horário Comercial**:
   - 🕘 **Funcionamento**: 9h às 20h (horário de Brasília - todos os dias)
   - 🌎 **Fuso horário**: Sistema sempre usa horário brasileiro (America/Sao_Paulo)
   - 🚫 **Fora do horário**: sistema aguarda até próximo período comercial
   - ⏰ **Retomada automática**: às 9h do dia seguinte (hora do Brasil)

2. **Lógica de Intervalo Inteligente**:
   - ✅ **Envio bem-sucedido**: aguarda 10 minutos para próximo lead
   - ❌ **Falha ou sem leads**: tenta novamente em 2 minutos
   - 🕘 **Fora do horário**: aguarda até próximo horário comercial

3. **A cada execução**, o sistema:
   - Busca 1 lead que ainda não recebeu mensagem (`lastMessage: null`)
   - Envia uma mensagem personalizada via WhatsApp
   - Atualiza o campo `lastMessage` com a data atual
   - Registra logs detalhados do processo
   - Agenda próxima execução baseada no resultado

4. **Independente do resultado**, o `lastMessage` é sempre atualizado para evitar reenvios

### 🎯 Critérios para Seleção de Leads

- Leads com `lastMessage: null` (nunca receberam mensagem)
- Leads com `hasWhatsApp` diferente de `false`
- Busca pelo lead com menor número de estrelas (`stars`) primeiro

### 📱 Tratamento de Números de Telefone

O sistema processa múltiplos números de telefone por lead:

#### 1. **Número da Loja (DDD + Phone)**
- Combina os campos `ddd` e `phone` 
- Exemplo: `ddd: "71"` + `phone: "987654321"` = `71987654321`

#### 2. **Números do CNPJ**
- Processa o campo `cnpjPhone` removendo caracteres especiais
- Suporta formato: `(71) 8775-5562`
- Suporta múltiplos números: `(71) 9641-7272 / (71) 8306-6686`

#### 3. **Envio Múltiplo Inteligente**
- Envia mensagem para **todos os números válidos** encontrados
- **Remove duplicatas** automaticamente (números que resultam no mesmo após padronização)
- Pausa de 2 segundos entre envios para evitar spam
- Considera sucesso se pelo menos 1 envio for bem-sucedido

#### 4. **Detecção de Duplicatas**
```
📋 Encontrados 2 números para envio:
   1. Loja (DDD + Phone): 71981808933 (origem: 71 + 981808933)
   2. CNPJ Phone 1: 7181808933 (origem: (71) 8180-8933)

🔄 [CNPJ Phone 1] Número duplicado ignorado: 7181808933 → 557181808933
📝 Após remoção de duplicatas: 1 números únicos

📊 RESUMO DO ENVIO:
   📱 Números encontrados: 2
   🔄 Duplicatas removidas: 1
   📱 Números únicos: 1
   📤 Envios realizados: 1
   ✅ Envios bem-sucedidos: 1
```

## 🔧 Configuração

### Backend de Produção
```javascript
const BACKEND_URL = 'https://cardapionotopbackend-d13b5bd9e7ef.herokuapp.com';
```

### Endpoints Utilizados
- **GET** `/lead/` - Busca um lead sem mensagem
- **PUT** `/lead/{leadId}` - Atualiza o lastMessage do lead

### Intervalo de Execução
- **Primeira execução**: 5 segundos após inicialização
- **Envio bem-sucedido**: 10 minutos (600.000ms)
- **Falha ou sem leads**: 2 minutos (120.000ms)
- **Fora do horário comercial**: Até próximo período (9h-20h Brasil)

## 📨 Mensagem Enviada

```
Olá, {NOME_DO_LEAD}! 👋 

Somos da *Cardaplus* e identificamos que você tem um restaurante incrível! 🍽️
Gostaríamos de ajudar você a ✨ Melhorar seu cardápio no iFood e 📈 Aumentar suas vendas online.

Nossa equipe especializada pode transformar seu cardápio atual em algo muito mais atrativo e funcional.

Acesse nosso site e veja como podemos te ajudar: https://cardaplus.com.br

*Cardaplus - Seu cardápio é a sua vitrine!*
```

## 🚀 Inicialização

O sistema inicia automaticamente quando:
1. O bot WhatsApp é conectado com sucesso
2. O evento `ready` é disparado
3. A função `iniciarEnvioAutomaticoLeads()` é chamada

## 📊 Logs e Monitoramento

### Logs Principais
- 🔍 Busca por leads
- 📨 Envio de mensagens
- ✅ Atualizações de lastMessage
- ❌ Erros e falhas

### Endpoint de Status
**GET** `/status` - Retorna informações sobre o sistema:
```json
{
  "status": "ativo",
  "mensagem": "Sistema automático de leads rodando",
  "horario": {
    "atual": "14:30",
    "comercial": "9h às 20h (Brasil)",
    "ativo": true,
    "proximoEnvio": "Em funcionamento"
  },
  "intervalo": {
    "sucesso": "10 minutos",
    "falha": "2 minutos",
    "foraHorario": "Até próximo horário comercial"
  },
  "backend": "https://cardapionotopbackend-d13b5bd9e7ef.herokuapp.com"
}
```

## 🛡️ Tratamento de Erros

### Cenários Tratados
1. **Lead sem telefone**: Marca como processado, mas não envia mensagem
2. **Erro na API**: Tenta marcar como processado mesmo assim
3. **Erro no WhatsApp**: Marca como processado para evitar loops
4. **Nenhum lead encontrado**: Log informativo, continua o ciclo

### Estratégia de Resiliência
- Sempre tenta atualizar `lastMessage`, mesmo com erros
- Logs detalhados para debugging
- Não interrompe o ciclo automático em caso de erro

## 📋 Dependências Adicionais

```json
{
  "axios": "^1.6.0"
}
```

Execute `npm install` para instalar as novas dependências.

## 🔧 Manutenção

### Para Parar o Sistema
O sistema roda continuamente. Para parar, será necessário reiniciar o processo Node.js.

### Para Modificar os Intervalos
Altere as linhas na função `agendarProximoEnvio`:
```javascript
// Para envio bem-sucedido
intervalo = 10 * 60 * 1000; // 10 minutos

// Para falha ou sem leads
intervalo = 2 * 60 * 1000; // 2 minutos
```

### Para Modificar o Horário Comercial
Altere a função `estaNoHorarioComercial`:
```javascript
// Verifica se está entre 9h (inclusive) e 20h (exclusive)
return horaAtual >= 9 && horaAtual < 20;
```

### Para Modificar a Mensagem
Edite a variável `mensagem` na função `enviarMensagemAutomaticaLead`.

## 🎯 Resultados Esperados

- **Automatização completa** do processo de primeiro contato
- **Organização** dos leads processados via `lastMessage`
- **Escalabilidade** para processar grandes volumes
- **Controle** sobre frequência de envios
- **Logs detalhados** para análise e melhoria 