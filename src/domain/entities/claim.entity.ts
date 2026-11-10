/**
 * domain/entities/claim.entity.ts
 *
 * Entidad de dominio: Reclamo de balance (Claimable Balance).
 * Invariante: token plano una sola vez, hash SHA-256.
 */

export type ClaimStatus = 'pending' | 'claimed_onchain' | 'completed' | 'failed' | 'reversed';

export interface Claim {
  id: string;
  transferId: string;
  claimTokenHash: string;     // SHA-256 del token plano (una sola vez)
  zkRuleHash?: string;        // Hash de regla ZK opcional (Atreus)
  amount: string;             // Monto en formato stroops/string
  asset: string;              // Código del activo (ej. 'USDC', 'ARST')
  status: ClaimStatus;
  ttl: number;                // Tiempo de vida del claim
  createdAt: number;
  claimedAt?: number;
}
