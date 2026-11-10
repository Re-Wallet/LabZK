/**
 * domain/ports/transfer.repository.ts
 *
 * Puerto: Repositorio de transferencias.
 * Invariante: idempotency_key previene duplicación de transferencias.
 */

export interface TransferRepository {
  save(transfer: Transfer): Promise<void>;
  findByIdempotencyKey(idempotencyKey: string): Promise<Transfer | null>;
  findById(id: string): Promise<Transfer | null>;
  updateStatus(id: string, status: Transfer['status'], claimId?: string): Promise<void>;
}

import type { Transfer } from '../entities/transfer.entity.js';
