# 📋 Comandos Úteis - WhatsApp Gemini Bot

## 🚀 Comandos de Execução

### Instalar dependências
```bash
npm install
```

### Executar o bot (modo produção)
```bash
npm start
```

### Executar o bot (modo desenvolvimento com auto-reload)
```bash
npm run dev
```

### Parar o bot
```bash
Ctrl + C
```

## 🔧 Comandos de Configuração

### Editar arquivo de configuração
```bash
nano .env
# ou
code .env
```

### Verificar se as dependências estão instaladas
```bash
npm list
```

### Atualizar dependências
```bash
npm update
```

## 🗂️ Comandos de Gerenciamento

### Limpar dados de sessão (reconectar WhatsApp)
```bash
rm -rf .wwebjs_auth/
```

### Ver logs em tempo real
```bash
npm start | tee logs.txt
```

### Verificar espaço em disco
```bash
du -sh .wwebjs_auth/
```

## 📊 Comandos de Monitoramento

### Ver processos Node.js ativos
```bash
ps aux | grep node
```

### Verificar se o bot está rodando
```bash
pgrep -f "node index.js"
```

### Verificar porta em uso (se aplicável)
```bash
lsof -i :3000
```

## 🐛 Comandos de Debug

### Executar com logs detalhados
```bash
NODE_ENV=development npm start
```

### Verificar sintaxe do código
```bash
node -c index.js
```

### Testar conectividade da API
```bash
curl -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"teste"}]}]}' \
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=SUA_CHAVE_API"
```

## 🔄 Comandos de Manutenção

### Fazer backup dos dados de sessão
```bash
tar -czf backup-sessao-$(date +%Y%m%d).tar.gz .wwebjs_auth/
```

### Restaurar backup da sessão
```bash
tar -xzf backup-sessao-YYYYMMDD.tar.gz
```

### Limpar cache do npm
```bash
npm cache clean --force
```

## 📱 Comandos de Teste

### Testar se o Node.js está funcionando
```bash
node --version
npm --version
```

### Testar se as dependências estão OK
```bash
npm audit
```

### Verificar configuração do ambiente
```bash
printenv | grep GEMINI
```

## 🚨 Comandos de Emergência

### Forçar parada do bot
```bash
pkill -f "node index.js"
```

### Limpar tudo e reinstalar
```bash
rm -rf node_modules/ package-lock.json .wwebjs_auth/
npm install
```

### Ver logs de erro do sistema
```bash
tail -f /var/log/system.log | grep node
```

## 📋 Checklist de Troubleshooting

1. ✅ **Node.js instalado e versão correta**
   ```bash
   node --version  # Deve ser >= 18.0.0
   ```

2. ✅ **Dependências instaladas**
   ```bash
   npm list --depth=0
   ```

3. ✅ **Chave da API configurada**
   ```bash
   cat .env | grep GEMINI_API_KEY
   ```

4. ✅ **Sem processos conflitantes**
   ```bash
   ps aux | grep "node index.js"
   ```

5. ✅ **Permissões corretas**
   ```bash
   ls -la .wwebjs_auth/
   ```

## 🔗 Links Úteis

- [Documentação whatsapp-web.js](https://wwebjs.dev/)
- [Google AI Studio](https://makersuite.google.com/app/apikey)
- [Documentação Google Gemini](https://ai.google.dev/docs)
- [Node.js Download](https://nodejs.org/)

---

**💡 Dica**: Mantenha este arquivo sempre atualizado com novos comandos que você descobrir! 