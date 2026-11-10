/**
 * infrastructure/persistence/postgresql/transfer.repository.ts
 *
 * Repositorio PostgreSQL de transferencias.
 * Almacena transferencias con idempotency_key para prevenir duplicación.
 *
 * Esquema esperado:
 *   transfers (
 *     id TEXT PRIMARY KEY,
 *     idempotency_key TEXT UNIQUE,
 *     from_user_id TEXT,
 *     to_tag TEXT,
 *     amount TEXT,
 *     asset TEXT,
 *     status TEXT,
 *     claim_id TEXT,
 *     created_at BIGINT,
 *     updated_at BIGINT
 *   )
 */

import type { TransferRepository } from '../../../domain/ports/transfer.repository.js';
import type { Transfer } from '../../../domain/entities/transfer.entity.js';

export class PostgresTransferRepository implements TransferRepository {
  constructor(private readonly pool: any) {} // pg.Pool

  async save(transfer: Transfer): Promise<void> {
    await this.pool.query(
      `INSERT INTO transfers (id, idempotency_key, from_user_id, to_tag, amount, asset, status, claim_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (idempotency_key) DO UPDATE SET
         status = EXCLUDED.status,
         updated_at = EXCLUDED.updated_at,
         claim_id = EXCLUDED.claim_id`,
      [
        transfer.id,
        transfer.idempotencyKey,
        transfer.fromUserId ?? null,
        transfer.toTag ?? null,
        transfer.amount,
        transfer.asset,
        transfer.status,
        transfer.claimId ?? null,
        transfer.createdAt,
        transfer.updatedAt,
      ]
    );
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<Transfer | null> {
    const res = await this.pool.query(
      `SELECT id, idempotency_key, from_user_id, to_tag, amount, asset, status, claim_id, created_at, updated_at
       FROM transfers WHERE idempotency_key = $1 LIMIT 1`,
      [idempotencyKey]
    );
    if (res.rowCount === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      idempotencyKey: row.idempotency_key,
      fromUserId: row.from_user_id ?? undefined,
      toTag: row.to_tag ?? undefined,
      amount: row.amount,
      asset: row.asset,
      status: row.status,
      claimId: row.claim_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<Transfer | null> {
    const res = await this.pool.query(
      `SELECT id, idempotency_key, from_user_id, to_tag, amount, asset, status, claim_id, created_at, updated_at
       FROM transfers WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (res.rowCount === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      idempotencyKey: row.idempotency_key,
      fromUserId: row.from_user_id ?? undefined,
      toTag: row.to_tag ?? undefined,
      amount: row.amount,
      asset: row.asset,
      status: row.status,
      claimId: row.claim_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateStatus(id: string, status: Transfer['status'], claimId?: string): Promise<void> {
    await this.pool.query(
      `UPDATE transfers SET status = $2, claim_id = $3, updated_at = $4 WHERE id = $1`,
      [id, status, claimId ?? null, Date.now()]
    );
  }
}
