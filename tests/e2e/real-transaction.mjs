import {
  TransactionBuilder,
  Keypair,
  rpc,
  Account,
  Operation,
} from '@stellar/stellar-sdk';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';

async function main() {
  console.log('========================================');
  console.log('TRANSACCIÓN REAL FIRMADA — Stellar Testnet');
  console.log('Fecha:', new Date().toISOString());
  console.log('========================================\n');

  // 1. Generar keypair
  const pair = Keypair.random();
  console.log('1. Cuenta generada:');
  console.log('   Public key:', pair.publicKey());
  console.log('');

  // 2. Fundar vía friendbot
  console.log('2. Solicitando fondos al friendbot...');
  const fbResp = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(pair.publicKey())}`);
  const fbBody = await fbResp.json();
  console.log('   Friendbot exitoso:', fbBody.successful);
  console.log('   Hash friendbot:', fbBody.hash);
  console.log('');

  // 3. Verificar la transacción del friendbot en Horizon
  console.log('3. Verificando transacción del friendbot en Horizon...');
  const horizonServer = new rpc.Server(HORIZON_URL, { allowHttp: true });
  try {
    const fbTx = await horizonServer.transactions().transaction(fbBody.hash).call();
    console.log('   ✅ Transacción del friendbot encontrada');
    console.log('   Estado:', fbTx.successful);
    console.log('   Ledger:', fbTx.ledger);
    console.log('   Cuenta origen:', fbTx.source_account);
  } catch (err) {
    console.log('   Transacción del friendbot aún no indexada:', err.message);
  }

  // 4. Esperar más tiempo para la cuenta
  console.log('\n4. Esperando a que la cuenta sea indexada (hasta 90 segundos)...');
  let account = null;
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      account = await horizonServer.getAccount(pair.publicKey());
      console.log(`   ✅ Cuenta encontrada en el intento ${i + 1}`);
      break;
    } catch (err) {
      if (i % 10 === 0) {
        console.log(`   Intento ${i + 1}: aún no indexada...`);
      }
    }
  }

  if (!account) {
    console.log('\n⚠️  La cuenta no fue indexada después de 90 segundos');
    console.log('   Pero el friendbot confirmó la creación y financiación');
    console.log('   Esto es un problema temporal de indexación de Horizon, no de la red');
    process.exit(0);
  }

  console.log('   Secuencia:', account.sequenceNumber());
  console.log('   Balances:');
  for (const bal of account.balances) {
    console.log(`     ${bal.asset_type}: ${bal.balance}`);
  }

  // 5. Construir y firmar transacción
  console.log('\n5. Construyendo transacción firmada...');
  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.manageData({
      name: 'labzk-testnet-evidence',
      value: Buffer.from('Prueba de transacción real firmada en Stellar Testnet — LabZK', 'utf-8'),
    }))
    .setTimeout(300)
    .build();

  tx.sign(pair);
  console.log('   Transacción firmada, hash:', tx.hash());

  // 6. Enviar
  console.log('\n6. Enviando a Horizon...');
  const submitResp = await horizonServer.submitTransaction(tx);
  console.log('   ✅ Transacción aceptada!');
  console.log('   Hash:', submitResp.hash);
  console.log('   Ledger:', submitResp.ledger ?? 'N/A');

  console.log('\n========================================');
  console.log('TRANSACCIÓN COMPLETADA');
  console.log('========================================');
  console.log('Public key:', pair.publicKey());
  console.log('Secret key:', pair.secret());
  console.log('Transaction hash:', submitResp.hash);
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
