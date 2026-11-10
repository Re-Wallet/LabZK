/**
 * tests/e2e/contracts.e2e.test.ts
 *
 * Pruebas de integración END-TO-END contra contratos REALES desplegados en Stellar Testnet.
 * Usa @stellar/stellar-sdk para hacer llamadas de solo lectura (simulateTransaction)
 * a los contratos Soroban desplegados. SIN MOCKS del SDK de Stellar.
 *
 * Contratos desplegados en Stellar Testnet (ver DESPLIEGUE_SOROBAN.md):
 *   - ZK Verifier: CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT
 *   - Piilo Privacy: CBDQUOJRFITV4QUEQQXGARLVE6K6RENHVPMQNDKZXOJWGHONKOB7QF46
 *   - Atreus Payment: CDBOSNSY6SARRNMDKOB7VZDEWAYJPVFJMOQONTNRMVC6WUZ75FH3JHIT
 *
 * Evidencia real guardada en: tests/e2e/TESTNET_EVIDENCE.md
 * Script adicional: tests/e2e/testnet-real.mjs (ejecutable con Node directamente)
 */

import { describe, it, expect } from '@jest/globals';
import {
  TransactionBuilder,
  Contract,
  nativeToScVal,
  xdr,
  Keypair,
  rpc,
  Account,
} from '@stellar/stellar-sdk';

// Contratos desplegados en Stellar Testnet
const CONTRACTS = {
  zkVerifier: 'CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT',
  piiloPrivacy: 'CBDQUOJRFITV4QUEQQXGARLVE6K6RENHVPMQNDKZXOJWGHONKOB7QF46',
  atreusPayment: 'CDBOSNSY6SARRNMDKOB7VZDEWAYJPVFJMOQONTNRMVC6WUZ75FH3JHIT',
};

const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

// ============================================================================
// Cliente real de Stellar Testnet para llamadas de solo lectura
// ============================================================================
const server = new rpc.Server(RPC_URL, { allowHttp: true });
const sourceKeypair = Keypair.random();
const sourceAccount = new Account(sourceKeypair.publicKey(), '0');

async function simulateContractCall(
  contractId: string,
  functionName: string,
  args: unknown[] = []
) {
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(sourceAccount, {
    fee: '1000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(functionName, ...(args as any[])))
    .setTimeout(300)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error ?? 'Error de simulación desconocido');
  }
  const result = sim.result?.retval;
  if (result) {
    const scVal = xdr.ScVal.fromXDR(result.toXDR('base64'), 'base64');
    return scVal.value;
  }
  return null;
}

// ============================================================================
// Llamadas REALES a contratos Soroban en Testnet (sin mocks)
// ============================================================================
describe('Contratos Soroban reales en Stellar Testnet', () => {
  it('zk_verifier existe y responde is_nullifier_used en testnet', async () => {
    const result = await simulateContractCall(
      CONTRACTS.zkVerifier,
      'is_nullifier_used',
      [nativeToScVal(Buffer.from('01'.repeat(32), 'hex'), { type: 'bytes' })]
    );
    expect(result).toBe(false);
  });

  it('zk_verifier is_nullifier_used con nullifier vacío retorna false', async () => {
    const result = await simulateContractCall(
      CONTRACTS.zkVerifier,
      'is_nullifier_used',
      [nativeToScVal(Buffer.alloc(32), { type: 'bytes' })]
    );
    expect(result).toBe(false);
  });

  it('piilo_privacy existe y responde get_commitment en testnet', async () => {
    const result = await simulateContractCall(
      CONTRACTS.piiloPrivacy,
      'get_commitment',
      [nativeToScVal(Buffer.alloc(32), { type: 'bytes' })]
    );
    // Commitment vacío no existe → retorna null/falsy
    expect(result).toBeFalsy();
  });

  it('atreus_payment existe y responde get_payment_link en testnet', async () => {
    const result = await simulateContractCall(
      CONTRACTS.atreusPayment,
      'get_payment_link',
      [nativeToScVal(Buffer.alloc(32), { type: 'bytes' })]
    );
    // Link vacío no existe → retorna null/falsy
    expect(result).toBeFalsy();
  });

  it('zk_verifier es accesible y retorna valor booleano', async () => {
    const result = await simulateContractCall(
      CONTRACTS.zkVerifier,
      'is_nullifier_used',
      [nativeToScVal(Buffer.from('ff'.repeat(32), 'hex'), { type: 'bytes' })]
    );
    expect(typeof result).toBe('boolean');
    expect(result).toBe(false);
  });
});
