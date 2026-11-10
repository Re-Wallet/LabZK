/**
 * src/infrastructure/soroban/index.ts
 *
 * Export central de clientes Soroban.
 */

export {
  Groth16VerifierClient,
} from './groth16-verifier-client.js';
export {
  KycRegistryClient,
  type KycRegistryConfig,
} from './kyc-registry-client.js';
export type {
  Groth16ProofSoroban,
  Groth16PublicInputs,
  Groth16VerifyResult,
  SorobanVerifierConfig,
} from './types.js';
