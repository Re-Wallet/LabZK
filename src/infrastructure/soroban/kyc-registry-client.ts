/**
 * src/infrastructure/soroban/kyc-registry-client.ts
 * Cliente para kyc_registry en Soroban (usa mismo contrato desplegado).
 * CONTRATO: CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT
 * SDK: @stellar/stellar-sdk v17.4.0
 */
import { TransactionBuilder, Contract, nativeToScVal, rpc, xdr } from '@stellar/stellar-sdk';
import type { Groth16ProofSoroban, Groth16PublicInputs } from './types.js';

export interface KycRegistryConfig {
  contractId: string;
  rpcUrl: string;
  networkPassphrase: string;
}

export class KycRegistryClient {
  private readonly config: KycRegistryConfig;
  private readonly server: rpc.Server;
  private readonly contract: Contract;

  constructor(config: KycRegistryConfig) {
    this.config = config;
    this.server = new rpc.Server(config.rpcUrl, { allowHttp: true });
    this.contract = new Contract(config.contractId);
  }

  async verifyKycProof(proof: Groth16ProofSoroban, publicInputs: Groth16PublicInputs): Promise<{ verified: boolean; nullifier?: string; error?: string }> {
    if (!this.isReadyToVerify()) {
      return { verified: false, error: 'Cliente no configurado' };
    }

    try {
      const nullifierHex = publicInputs.nullifier.startsWith('0x') ? publicInputs.nullifier.slice(2) : publicInputs.nullifier;
      if (nullifierHex.length !== 64) {
        return { verified: false, error: 'Nullifier debe ser 32 bytes' };
      }

      const sourceAccount = await this.server.getAccount(this.config.contractId);
      const tx = new TransactionBuilder(sourceAccount, {
        fee: '1000000',
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(
          this.contract.call('verify_proof', nativeToScVal(Buffer.from(nullifierHex, 'hex'), { type: 'bytes' }))
        )
        .setTimeout(300)
        .build();

      const sim = await this.server.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(sim)) {
        return { verified: false, error: sim.error };
      }

      return { verified: true, nullifier: publicInputs.nullifier };
    } catch (error) {
      return { verified: false, error: error instanceof Error ? error.message : 'Error' };
    }
  }

  async isNullifierRegistered(nullifier: string): Promise<boolean> {
    if (!this.isReadyToVerify()) return false;
    try {
      const nullifierHex = nullifier.startsWith('0x') ? nullifier.slice(2) : nullifier;
      if (nullifierHex.length !== 64) return false;

      const sourceAccount = await this.server.getAccount(this.config.contractId);
      const tx = new TransactionBuilder(sourceAccount, {
        fee: '1000000',
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(
          this.contract.call('is_nullifier_used', nativeToScVal(Buffer.from(nullifierHex, 'hex'), { type: 'bytes' }))
        )
        .setTimeout(300)
        .build();

      const sim = await this.server.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(sim)) return false;

      const result = sim.result?.retval;
      if (result) {
        const scVal = xdr.ScVal.fromXDR(result.toXDR('base64'), 'base64');
        if (scVal.value !== undefined) {
          return scVal.value as boolean;
        }
      }
      return false;
    } catch { return false; }
  }

  isReadyToVerify(): boolean {
    return Boolean(this.config.contractId && this.config.rpcUrl && this.config.networkPassphrase);
  }

  getConfig(): KycRegistryConfig { return { ...this.config }; }
}