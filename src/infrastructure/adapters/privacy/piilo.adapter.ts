/**
 * infrastructure/adapters/privacy/piilo.adapter.ts
 *
 * Adaptador: Piilo (@neylanxyz/piilo v0.1.4).
 * Implementa PrivacyPort (fase 1: confidencialidad de montos).
 *
 * API oficial documentada (npm registry):
 *   import { Piilo } from '@neylanxyz/piilo'
 *   const piilo = new Piilo({
 *     network: 'testnet',
 *     asset:   'USDC',    // o 'XLM' — resuelve contrato del on-chain registry
 *     wallet,             // WalletAdapter & WalletSigner
 *   })
 *   await piilo.deposit(50_000_000n)          // 5 XLM en stroops
 *   await piilo.transfer({ to: 'G…', amount: 20_000_000n })
 *   await piilo.settleIfPending()             // receive incoming transfers
 *   await piilo.withdraw()                    // exit privacy, receive XLM back
 *   piilo.getBalance()                        // local plaintext balance
 *
 * Criptografía: Pedersen commitments en JubJub (BLS12-381) + Groth16 ZK proofs.
 * Direcciones públicas (AML/KYC), montos ocultos.
 *
 * Advertencia: testnet/beta, no auditado. No usar con fondos reales.
 */

import type { PrivacyPort, PrivacyResult } from '../../../domain/ports/privacy.port.js';
import { Piilo } from '@neylanxyz/piilo';

/**
 * Tipo interno para el wallet de Piilo.
 * El SDK espera WalletAdapter & WalletSigner con signMessage retornando Uint8Array.
 * Usamos cualquier tipo compatible internamente; el cast se hace al pasar al SDK.
 */
type PiiloWalletInput = {
  publicKey(): Promise<string>;
  signTransaction(xdr: string): Promise<string>;
  signMessage(message: string): Promise<{ signature: Uint8Array }>;
};

export class PiiloAdapter implements PrivacyPort {
  private piilo: InstanceType<typeof Piilo> | null = null;

  constructor(
    private readonly config: {
      network: 'testnet' | 'mainnet';
      asset: string;
      wallet?: PiiloWalletInput;
      circuitsUrl?: string;
    }
  ) {}

  private ensureInitialized(): InstanceType<typeof Piilo> {
    if (!this.piilo) {
      if (!this.config.wallet) {
        throw new Error(
          'Piilo wallet no configurado. Proporciona una wallet compatible con PiiloWalletInput.'
        );
      }
      this.piilo = new Piilo({
        network: this.config.network,
        asset: this.config.asset,
        wallet: this.config.wallet as any,
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
      // Piilo genera la prueba Groth16 client-side (~2–5s)
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

  async getBalance(): Promise<bigint> {
    return this.ensureInitialized().getBalance();
  }
}
