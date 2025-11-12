// Script para verificar configurações do Mercado Pago
// Execute: node verificar-config.js

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configurações do Mercado Pago...\n');

// Verificar se .env.local existe
const envPath = path.join(__dirname, '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('❌ Arquivo .env.local NÃO encontrado!');
  console.log('📝 Crie o arquivo .env.local na raiz do projeto\n');
  console.log('Copie o conteúdo de .env.example e adicione suas credenciais:\n');
  console.log('MERCADO_PAGO_ACCESS_TOKEN=TEST-seu-token-aqui');
  console.log('NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=TEST-sua-key-aqui');
  console.log('NEXT_PUBLIC_APP_URL=http://localhost:3000\n');
  process.exit(1);
}

console.log('✅ Arquivo .env.local encontrado\n');

// Ler conteúdo do .env.local
const envContent = fs.readFileSync(envPath, 'utf-8');

// Verificar variáveis necessárias
const requiredVars = [
  'MERCADO_PAGO_ACCESS_TOKEN',
  'NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY',
  'NEXT_PUBLIC_APP_URL'
];

let allConfigured = true;

requiredVars.forEach(varName => {
  const regex = new RegExp(`${varName}=(.+)`, 'm');
  const match = envContent.match(regex);
  
  if (!match) {
    console.log(`❌ ${varName} NÃO configurado`);
    allConfigured = false;
  } else {
    const value = match[1].trim();
    if (value === '' || value.includes('seu-') || value.includes('sua-')) {
      console.log(`⚠️  ${varName} configurado mas com valor de exemplo`);
      console.log(`   Valor atual: ${value}`);
      allConfigured = false;
    } else {
      // Mostrar apenas início e fim do token por segurança
      const maskedValue = value.length > 20 
        ? `${value.substring(0, 10)}...${value.substring(value.length - 10)}`
        : value;
      console.log(`✅ ${varName} configurado`);
      console.log(`   Valor: ${maskedValue}`);
    }
  }
});

console.log('\n' + '='.repeat(60));

if (allConfigured) {
  console.log('✅ TODAS as configurações estão OK!');
  console.log('🚀 Você pode testar o checkout agora!');
} else {
  console.log('❌ Algumas configurações estão faltando ou incorretas');
  console.log('\n📚 Veja o arquivo CONFIGURAR_MERCADOPAGO.md para instruções');
  console.log('🔗 https://www.mercadopago.com.br/developers/panel/credentials');
}

console.log('='.repeat(60) + '\n');
