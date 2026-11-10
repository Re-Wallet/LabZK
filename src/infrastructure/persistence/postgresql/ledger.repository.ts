/**
 * infrastructure/persistence/postgresql/ledger.repository.ts
 *
 * Repositorio PostgreSQL de asientos de ledger (doble entrada, suma cero).
 *
 * Esquema esperado:
 *   ledger_entries (
 *     id TEXT PRIMARY KEY,
 *     transfer_id TEXT,
 *     type TEXT,           -- 'debit' | 'credit'
 *     amount TEXT,
 *     asset TEXT,
 *     account TEXT,
 *     created_at BIGINT
 *   )
 */

import type { LedgerRepository } from '../../../domain/ports/ledger.repository.js';
import type { LedgerEntry } from '../../../domain/entities/ledger-entry.entity.js';

export class PostgresLedgerRepository implements LedgerRepository {
  constructor(private readonly pool: any) {} // pg.Pool

  async saveEntry(entry: LedgerEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO ledger_entries (id, transfer_id, type, amount, asset, account, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.id,
        entry.transferId,
        entry.type,
        entry.amount,
        entry.asset,
        entry.account,
        entry.createdAt,
      ]
    );
  }

  async findByTransferId(transferId: string): Promise<LedgerEntry[]> {
    const res = await this.pool.query(
      `SELECT id, transfer_id, type, amount, asset, account, created_at
       FROM ledger_entries WHERE transfer_id = $1
       ORDER BY created_at`,
      [transferId]
    );
    return res.rows.map((row: any) => ({
      id: row.id,
      transferId: row.transfer_id,
      type: row.type,
      amount: row.amount,
      asset: row.asset,
      account: row.account,
      createdAt: row.created_at,
    }));
  }
}
