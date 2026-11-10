/**
 * src/infrastructure/persistence/postgresql/index.ts
 *
 * Export central de repositorios PostgreSQL.
 */

export { PostgresNullifierRepository } from './nullifier.repository.js';
export { PostgresCommitmentRepository } from './commitment.repository.js';
export { PostgresUserRepository } from './user.repository.js';
export { PostgresTransferRepository } from './transfer.repository.js';
export { PostgresWalletRepository } from './wallet.repository.js';
export { PostgresLedgerRepository } from './ledger.repository.js';
export { createPool, healthCheck, type DatabaseConfig } from './pool.js';
