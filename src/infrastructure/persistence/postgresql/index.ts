/**
 * src/infrastructure/persistence/postgresql/index.ts
 *
 * Export central de repositorios PostgreSQL.
 */

export { PostgresNullifierRepository } from './nullifier.repository.js';
export { PostgresCommitmentRepository } from './commitment.repository.js';
export { PostgresUserRepository } from './user.repository.js';
export { createPool, healthCheck, type DatabaseConfig } from './pool.js';
