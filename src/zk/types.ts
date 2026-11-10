/**
 * Tipos compartidos para el PoC ZK (Groth16 / BN254).
 */

export type BigIntStr = string;

/**
 * Resultado de generación de prueba ZK.
 * Los campos se serializan a strings decimales para ser enviados al
 * backend / verificador Soroban (que recibe big-endian bytes).
 */
export interface Groth16Proof {
  pi_a: BigIntStr[];
  pi_b: BigIntStr[][];
  pi_c: BigIntStr[];
  protocol?: string;
  curve?: string;
}

/**
 * Inputs públicos del circuito (lo que el backend recibe y verifica).
 */
export interface PublicInputs {
  nullifier: BigIntStr;
  seed: BigIntStr;
}

/**
 * Testigo privado (solo en el cliente, nunca sale del dispositivo).
 */
export interface PrivateInputs {
  secreto: BigIntStr;
}

/**
 * Resultado de verificación.
 */
export interface VerifyResult {
  valid: boolean;
  nullifier?: string;
  reason?: string;
}

/**
 * Estado de un nullifier en el registro (simula la tabla zk_nullifiers).
 */
export interface NullifierRecord {
  nullifier: string;
  usedAt: number;
  usedBy: string;
  integrator: string;
  valid: boolean;
}
