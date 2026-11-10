/**
 * domain/entities/transfer.entity.ts
 *
 * Entidad de dominio: Transferencia.
 * Invariante: idempotency_key previene duplicación.
 */

export type TransferStatus =
  | 'pending'
  | 'pending_claim'
  | 'claimed_onchain'
  | 'completed'
  | 'failed'
  | 'reversed';

export interface Transfer {
  id: string;
  idempotencyKey: string;     // Invariante: previene duplicación
  fromUserId?: string;        // Undefined si el pagador aún no existe
  toTag?: string;             // Destinatario (no existe hasta el reclamo)
  amount: string;
  asset: string;
  status: TransferStatus;
  claimId?: string;
  createdAt: number;
  updatedAt: number;
}
