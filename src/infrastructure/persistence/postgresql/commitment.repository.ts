/**
 * infrastructure/persistence/postgresql/commitment.repository.ts
 *
 * Repositorio PostgreSQL de compromisos de Pedersen (Piilo).
 * Solo almacena commitments (no montos en claro).
 *
 * Esquema esperado:
 *   commitments (
 *     commitment TEXT PRIMARY KEY,
 *     owner_address TEXT,
 *     asset TEXT,
 *     created_at TIMESTAMP,
 *     is_spent BOOLEAN DEFAULT false
 *   )
 */

export class PostgresCommitmentRepository {
  constructor(private readonly pool: any) {} // pg.Pool

  async save(commitment: string, ownerAddress: string, asset: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO commitments (commitment, owner_address, asset, created_at, is_spent)
       VALUES ($1, $2, $3, NOW(), false)
       ON CONFLICT (commitment) DO NOTHING`,
      [commitment, ownerAddress, asset]
    );
  }

  async markSpent(commitment: string): Promise<void> {
    await this.pool.query(
      `UPDATE commitments SET is_spent = true WHERE commitment = $1`,
      [commitment]
    );
  }

  async getByOwner(ownerAddress: string): Promise<string[]> {
    const res = await this.pool.query(
      `SELECT commitment FROM commitments WHERE owner_address = $1 AND is_spent = false`,
      [ownerAddress]
    );
    return res.rows.map((r: any) => r.commitment);
  }
}
