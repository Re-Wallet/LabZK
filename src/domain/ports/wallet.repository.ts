/**
 * domain/ports/wallet.repository.ts
 *
 * Puerto: Repositorio de wallets Stellar (non-custodial).
 */

export interface WalletRepository {
  save(wallet: Wallet): Promise<void>;
  findByUserId(userId: string): Promise<Wallet | null>;
  findByPublicKey(publicKey: string): Promise<Wallet | null>;
}

import type { Wallet } from '../entities/wallet.entity.js';
