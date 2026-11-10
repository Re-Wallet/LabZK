/**
 * infrastructure/adapters/privacy/piilo.adapter.ts
 *
 * Adaptador: Piilo (@neylanxyz/piilo).
 * Implementa PrivacyPort (fase 1: confidencialidad de montos).
 *
 * API oficial (v0.1.4):
 *   import { Piilo } from '@neylanxyz/piilo'
 *   const piilo = new Piilo({ network: 'testnet', asset: 'USDC', wallet })
 *   await piilo.deposit(50_000_000n)          // 5 XLM en stroops
 *   await piilo.transfer({ to: 'G…', amount: 20_000_000n })
 *   await piilo.settleIfPending()
 *   await piilo.withdraw()
 *
 * Criptografía: Pedersen commitments en JubJub (BLS12-381) + Groth16 ZK proofs.
 * Direcciones públicas (AML/KYC), montos ocultos.
 *
 * Advertencia: testnet/beta, no auditado. No usar con fondos reales.
 */

import type { PrivacyPort, PrivacyResult } from '../../../domain/ports/privacy.port.js';

type PiiloWallet = {
  publicKey(): Promise<string>;
  signTransaction(xdr: string): Promise<string>;
  signMessage(message: string): Promise<{ signature: string }>;
};

type PiiloSDK = {
  new (config: {
    network: 'testnet' | 'mainnet';
    asset?: string;
    contractId?: string;
    wallet: PiiloWallet;
    circuitsUrl?: string;
  }): PiiloInstance;
};

type PiiloInstance = {
  deposit(amount: bigint): Promise<void>;
  transfer({ to, amount }: { to: string; amount: bigint }): Promise<void>;
  settleIfPending(): Promise<{ received: bigint } | null>;
  withdraw(): Promise<void>;
  getBalance(): bigint;
  getAccount(address: string): Promise<unknown>;
  exportBackup(): string;
  importBackup(json: string): void;
};

export class PiiloAdapter implements PrivacyPort {
  private piilo: PiiloInstance | null = null;

  constructor(
    private readonly PiiloSDK: PiiloSDK,
    private readonly config: {
      network: 'testnet' | 'mainnet';
      asset: string;
      wallet: PiiloWallet;
      circuitsUrl?: string;
    }
  ) {}

  private ensureInitialized(): PiiloInstance {
    if (!this.piilo) {
      this.piilo = new this.PiiloSDK({
        network: this.config.network,
        asset: this.config.asset,
        wallet: this.config.wallet,
        circuitsUrl: this.config.circuitsUrl,
      });
    }
    return this.piilo;
  }

  async deposit(input: { amount: bigint }): Promise<PrivacyResult> {
    try {
      await this.ensureInitialized().deposit(input.amount);
      return { success: true };
    } catch (err) {
      return { success: false, reason: err instanceof Error ? err.message : 'Deposit failed' };
    }
  }

  async transferPrivate(input: { to: string; amount: bigint }): Promise<PrivacyResult> {
    try {
      // Piilo genera la prueba Groth16 client-side (~2-5s)
      await this.ensureInitialized().transfer({ to: input.to, amount: input.amount });
      return { success: true };
    } catch (err) {
      return { success: false, reason: err instanceof Error ? err.message : 'Private transfer failed' };
    }
  }

  async settlePending(): Promise<{ received: bigint } | null> {
    return this.ensureInitialized().settleIfPending();
  }

  async withdraw(): Promise<PrivacyResult> {
    try {
      await this.ensureInitialized().withdraw();
      return { success: true };
    } catch (err) {
      return { success: false, reason: err instanceof Error ? err.message : 'Withdraw failed' };
    }
  }

  getBalance(): bigint {
    return this.ensureInitialized().getBalance();
  }
}
