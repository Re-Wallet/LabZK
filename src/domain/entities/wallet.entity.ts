/**
 * domain/entities/wallet.entity.ts
 *
 * Entidad de dominio: Wallet Stellar (non-custodial).
 * El backend nunca custodia claves ni fondos.
 */

export type WalletId = string;
export type StellarPublicKey = string;
export type WalletStatus = 'active' | 'frozen' | 'closed';

export interface Wallet {
  id: WalletId;
  userId: string;
  publicKey: StellarPublicKey;  // Dirección Stellar pública
  custodyType: 'non_custodial'; // Invariante: siempre non_custodial
  status: WalletStatus;
  createdAt: number;
}
