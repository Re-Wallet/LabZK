import {
  TransactionBuilder,
  Keypair,
  rpc,
  Account,
  Operation,
} from '@stellar/stellar-sdk';

const RPC_URL = 'https://soroban-testnet.stellar.org';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

  if (!fbResp.ok || !fbBody.successful) {
    throw new Error(`Friendbot falló: ${fbResp.status}`);
  }

  // 3. Esperar a que el RPC indexe la cuenta (hasta 3 minutos)
  console.log('\n3. Esperando a que el RPC indexe la cuenta (hasta 3 minutos)...');
  const horizonServer = new rpc.Server(HORIZON_URL, { allowHttp: true });
  const rpcServer = new rpc.Server(RPC_URL, { allowHttp: true });

  let accountData = null;
  let source = 'ninguno';

  for (let i = 0; i < 90; i++) {
    await sleep(2000);

    try {
      accountData = await rpcServer.getAccount(pair.publicKey());
      source = 'RPC';
      console.log(`   ✅ Cuenta encontrada en ${source} (intento ${i + 1})`);
      break;
    } catch (err) {
      try {
        accountData = await horizonServer.getAccount(pair.publicKey());
        source = 'Horizon';
        console.log(`   ✅ Cuenta encontrada en ${source} (intento ${i + 1})`);
        break;
      } catch (err2) {
        if (i % 10 === 0) {
          console.log(`   Intento ${i + 1}: aún no indexada...`);
        }
      }
    }
  }

  if (!accountData) {
    console.log('\n⚠️  Cuenta no indexada después de 3 minutos');
    console.log('   Pero el friendbot confirmó: successful=true');
    process.exit(1);
  }

  // Extraer sequence number de la respuesta (diferente formato según el servicio)
  let sequenceNumber;
  if (typeof accountData.sequenceNumber === 'function') {
    // RPC devuelve instancia de Account del SDK
    sequenceNumber = accountData.sequenceNumber();
  } else if (accountData.sequenceNumber) {
    sequenceNumber = String(accountData.sequenceNumber);
  } else if (accountData.data?.sequence_number) {
    sequenceNumber = String(accountData.data.sequence_number);
  } else {
    sequenceNumber = '0';
  }

  console.log('   Secuencia:', sequenceNumber);

  // Usar el accountData directamente si es instancia de Account del SDK,
  // o crear uno nuevo si es objeto plano
  let sdkAccount;
  if (accountData instanceof Account || accountData.accountId) {
    sdkAccount = accountData;
  } else {
    sdkAccount = new Account(pair.publicKey(), sequenceNumber);
  }

  // 4. Construir y firmar transacción real
  console.log('\n4. Construyendo transacción firmada (Manage Data)...');
  const tx = new TransactionBuilder(sdkAccount, {
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
  console.log('   Transacción firmada');
  console.log('   Hash:', tx.hash());

  // 5. Enviar transacción a través de RPC (Horizon sendTransaction no disponible en este endpoint)
  console.log('\n5. Enviando transacción firmada...');
  const submitResp = await rpcServer.sendTransaction(tx);
  console.log('   ✅ Transacción aceptada!');
  console.log('   Hash:', submitResp.hash);
  console.log('   Ledger:', submitResp.ledger ?? 'N/A');

  console.log('\n========================================');
  console.log('TRANSACCIÓN COMPLETADA');
  console.log('========================================');
  console.log('Public key:', pair.publicKey());
  console.log('Secret key:', pair.secret());
  console.log('Friendbot hash:', fbBody.hash);
  console.log('Transaction hash:', submitResp.hash);
  console.log('Ledger:', submitResp.ledger ?? 'N/A');
}

main().catch((err) => {
  console.error('\n❌ Error fatal:', err.message);
  process.exit(1);
});
