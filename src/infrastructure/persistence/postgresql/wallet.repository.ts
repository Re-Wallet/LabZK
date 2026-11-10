/**
 * infrastructure/persistence/postgresql/wallet.repository.ts
 *
 * Repositorio PostgreSQL de wallets Stellar (non-custodial).
 *
 * Esquema esperado:
 *   wallets (
 *     id TEXT PRIMARY KEY,
 *     user_id TEXT UNIQUE,
 *     public_key TEXT UNIQUE,
 *     custody_type TEXT DEFAULT 'non_custodial',
 *     status TEXT DEFAULT 'active',
 *     created_at BIGINT
 *   )
 */

import type { WalletRepository } from '../../../domain/ports/wallet.repository.js';
import type { Wallet } from '../../../domain/entities/wallet.entity.js';

export class PostgresWalletRepository implements WalletRepository {
  constructor(private readonly pool: any) {} // pg.Pool

  async save(wallet: Wallet): Promise<void> {
    await this.pool.query(
      `INSERT INTO wallets (id, user_id, public_key, custody_type, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         public_key = EXCLUDED.public_key,
         status = EXCLUDED.status`,
      [
        wallet.id,
        wallet.userId,
        wallet.publicKey,
        wallet.custodyType,
        wallet.status,
        wallet.createdAt,
      ]
    );
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    const res = await this.pool.query(
      `SELECT id, user_id, public_key, custody_type, status, created_at
       FROM wallets WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (res.rowCount === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      publicKey: row.public_key,
      custodyType: row.custody_type,
      status: row.status,
      createdAt: row.created_at,
    };
  }

  async findByPublicKey(publicKey: string): Promise<Wallet | null> {
    const res = await this.pool.query(
      `SELECT id, user_id, public_key, custody_type, status, created_at
       FROM wallets WHERE public_key = $1 LIMIT 1`,
      [publicKey]
    );
    if (res.rowCount === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      publicKey: row.public_key,
      custodyType: row.custody_type,
      status: row.status,
      createdAt: row.created_at,
    };
  }
}
