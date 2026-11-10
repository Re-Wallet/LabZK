import {
  TransactionBuilder,
  Contract,
  nativeToScVal,
  xdr,
  Keypair,
  rpc,
  Account,
} from '@stellar/stellar-sdk';

const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

const CONTRACTS = {
  zkVerifier: 'CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT',
  piiloPrivacy: 'CBDQUOJRFITV4QUEQQXGARLVE6K6RENHVPMQNDKZXOJWGHONKOB7QF46',
  atreusPayment: 'CDBOSNSY6SARRNMDKOB7VZDEWAYJPVFJMOQONTNRMVC6WUZ75FH3JHIT',
};

const server = new rpc.Server(RPC_URL, { allowHttp: true });
const sourceKeypair = Keypair.random();
const sourceAccount = new Account(sourceKeypair.publicKey(), '0');

async function main() {
  console.log('========================================');
  console.log('EVIDENCIA REAL — Pruebas contra Stellar Testnet');
  console.log('Fecha:', new Date().toISOString());
  console.log('RPC:', RPC_URL);
  console.log('Source account (temporal, solo lectura):', sourceKeypair.publicKey());
  console.log('========================================\n');

  async function simulateContractCall(contractId, functionName, args = []) {
    const contract = new Contract(contractId);
    const tx = new TransactionBuilder(sourceAccount, {
      fee: '1000000',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(functionName, ...args))
      .setTimeout(300)
      .build();
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      return { error: sim.error, success: false };
    }
    const result = sim.result?.retval;
    let decoded = null;
    if (result) {
      const scVal = xdr.ScVal.fromXDR(result.toXDR('base64'), 'base64');
      decoded = scVal.value;
    }
    return { success: true, result: decoded };
  }

  let passed = 0;
  let failed = 0;

  function check(name, result, expected) {
    const ok = result.success && result.result === expected;
    if (ok) {
      console.log(`✅ ${name} = ${result.result}`);
      passed++;
    } else {
      console.log(`❌ ${name}: ${result.error ?? 'resultado inesperado'} (esperado: ${expected})`);
      failed++;
    }
  }

  // 1. zk_verifier: is_nullifier_used (nullifier nuevo)
  const r1 = await simulateContractCall(
    CONTRACTS.zkVerifier,
    'is_nullifier_used',
    [nativeToScVal(Buffer.from('01'.repeat(32), 'hex'), { type: 'bytes' })]
  );
  check('zk_verifier.is_nullifier_used(01...32)', r1, false);

  // 2. zk_verifier: is_nullifier_used (nullifier vacío)
  const r1b = await simulateContractCall(
    CONTRACTS.zkVerifier,
    'is_nullifier_used',
    [nativeToScVal(Buffer.alloc(32), { type: 'bytes' })]
  );
  check('zk_verifier.is_nullifier_used(00...32)', r1b, false);

  // 3. piilo_privacy: get_commitment (commitment vacío, no existe)
  const r2 = await simulateContractCall(
    CONTRACTS.piiloPrivacy,
    'get_commitment',
    [nativeToScVal(Buffer.alloc(32), { type: 'bytes' })]
  );
  if (r2.success && !r2.result) {
    console.log(`✅ piilo_privacy.get_commitment(00...32) = vacío (commitment no existe)`);
    passed++;
  } else {
    console.log(`❌ piilo_privacy.get_commitment(00...32): ${r2.error ?? 'resultado inesperado'}`);
    failed++;
  }

  // 4. atreus_payment: get_payment_link (link vacío, no existe)
  const r3 = await simulateContractCall(
    CONTRACTS.atreusPayment,
    'get_payment_link',
    [nativeToScVal(Buffer.alloc(32), { type: 'bytes' })]
  );
  if (r3.success && !r3.result) {
    console.log(`✅ atreus_payment.get_payment_link(00...32) = vacío (link no existe)`);
    passed++;
  } else {
    console.log(`❌ atreus_payment.get_payment_link(00...32): ${r3.error ?? 'resultado inesperado'}`);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`Resultado: ${passed} pasaron, ${failed} fallaron`);
  console.log('========================================');

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
