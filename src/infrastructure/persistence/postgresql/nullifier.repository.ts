/**
 * infrastructure/persistence/postgresql/nullifier.repository.ts
 *
 * Repositorio PostgreSQL de nullifiers ZK (tabla zk_nullifiers).
 * Solo almacena nullifiers, nunca PII.
 *
 * Esquema esperado (pendiente de DDL completo):
 *   zk_nullifiers (
 *     nullifier TEXT PRIMARY KEY,
 *     integrator_id TEXT,
 *     created_at TIMESTAMP,
 *     is_valid BOOLEAN DEFAULT true
 *   )
 */

import type { NullifierRepository } from '../../../domain/ports/nullifier.repository.js';

export class PostgresNullifierRepository implements NullifierRepository {
  constructor(private readonly pool: any) {} // pg.Pool

  async save(nullifier: string, integrator: string): Promise<boolean> {
    try {
      // INSERT ... ON CONFLICT DO NOTHING → retorna false si ya existe (replay)
      const res = await this.pool.query(
        `INSERT INTO zk_nullifiers (nullifier, integrator_id, created_at, is_valid)
         VALUES ($1, $2, NOW(), true)
         ON CONFLICT (nullifier) DO NOTHING`,
        [nullifier, integrator]
      );
      return (res.rowCount ?? 0) > 0;
    } catch (err) {
      console.error('Nullifier repository error:', err);
      return false;
    }
  }

  async exists(nullifier: string): Promise<boolean> {
    const res = await this.pool.query(
      `SELECT 1 FROM zk_nullifiers WHERE nullifier = $1 LIMIT 1`,
      [nullifier]
    );
    return (res.rowCount ?? 0) > 0;
  }
}
