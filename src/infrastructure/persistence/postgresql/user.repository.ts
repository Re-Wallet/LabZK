/**
 * src/infrastructure/persistence/postgresql/user.repository.ts
 *
 * Repositorio PostgreSQL de usuarios (sin PII).
 */

import type { UserRepository, User, CreateUserInput } from '../../../domain/ports/user.repository.js';

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: any) {} // pg.Pool

  async save(user: User): Promise<void> {
    await this.pool.query(
      `INSERT INTO users (id, tag, tag_change_count, account_status, nullifier_id, zk_kyc_approved, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         tag = EXCLUDED.tag,
         nullifier_id = EXCLUDED.nullifier_id,
         zk_kyc_approved = EXCLUDED.zk_kyc_approved,
         updated_at = now()`,
      [user.id, user.tag, user.tagChangeCount, user.custodyType, user.nullifier ?? null, user.kycApproved, user.createdAt, user.updatedAt]
    );
  }

  async findByTag(tag: string): Promise<User | null> {
    const res = await this.pool.query(
      `SELECT id, tag, tag_change_count, account_status, nullifier_id, zk_kyc_approved, created_at, updated_at
       FROM users WHERE lower(tag) = lower($1) LIMIT 1`,
      [tag]
    );
    if (res.rowCount === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findById(id: string): Promise<User | null> {
    const res = await this.pool.query(
      `SELECT id, tag, tag_change_count, account_status, nullifier_id, zk_kyc_approved, created_at, updated_at
       FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (res.rowCount === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByNullifier(nullifier: string): Promise<User | null> {
    const res = await this.pool.query(
      `SELECT u.id, u.tag, u.tag_change_count, u.account_status, u.nullifier_id, u.zk_kyc_approved, u.created_at, u.updated_at
       FROM users u
       JOIN zk_nullifiers zn ON u.nullifier_id = zn.id
       WHERE zn.nullifier = $1 LIMIT 1`,
      [nullifier]
    );
    if (res.rowCount === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  private mapRow(row: any): User {
    return {
      id: row.id,
      tag: row.tag,
      tagChangeCount: row.tag_change_count,
      custodyType: 'non_custodial',
      kycApproved: row.zk_kyc_approved,
      nullifier: undefined, // se resuelve vía zk_nullifiers
      createdAt: row.created_at.getTime(),
      updatedAt: row.updated_at.getTime(),
    };
  }
}
