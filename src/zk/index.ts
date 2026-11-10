/**
 * src/zk/index.ts
 *
 * Punto de entrada del módulo ZK. Exporta las funciones clave del PoC.
 */

export { generateProof } from './prover';
export { verifyProof } from './verifier';
export {
  registerNullifier,
  isNullifierUsed,
  getNullifierRecord,
  clearNullifiers,
} from './nullifier-manager';
export type {
  Groth16Proof,
  PublicInputs,
  PrivateInputs,
  VerifyResult,
  NullifierRecord,
} from './types';
