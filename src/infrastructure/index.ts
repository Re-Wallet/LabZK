/**
 * src/infrastructure/index.ts
 *
 * Export central de adaptadores e infraestructura.
 */

export { ZkLoginAdapter } from './adapters/auth/zklogin.adapter.js';
export { KakushoAdapter } from './adapters/kyc-verifier/kakusho.adapter.js';
export { PiiloAdapter } from './adapters/privacy/piilo.adapter.js';
export { AtreusAdapter } from './adapters/payment-link/atreus.adapter.js';
export { AnchorAdapter } from './adapters/ramp/anchor.adapter.js';
export { StellarPathAdapter } from './adapters/path-payment/stellar-path.adapter.js';
export { StellarHorizonClient } from './persistence/stellar/horizon.client.js';
export { PostgresNullifierRepository } from './persistence/postgresql/nullifier.repository.js';
export { PostgresCommitmentRepository } from './persistence/postgresql/commitment.repository.js';
export { PostgresUserRepository } from './persistence/postgresql/user.repository.js';
export {
  Groth16VerifierClient,
  KycRegistryClient,
  type Groth16ProofSoroban,
  type Groth16PublicInputs,
  type SorobanVerifierConfig,
  type KycRegistryConfig,
} from './soroban/index.js';
