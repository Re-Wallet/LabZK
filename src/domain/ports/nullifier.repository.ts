/**
 * domain/ports/nullifier.repository.ts
 *
 * Puerto: Repositorio de nullifiers ZK (anti-replay).
 * Tabla zk_nullifiers — solo nullifiers, nunca PII.
 */

export interface NullifierRepository {
  save(nullifier: string, integrator: string): Promise<boolean>;
  // Retorna false si el nullifier ya existe (replay)
  exists(nullifier: string): Promise<boolean>;
}
