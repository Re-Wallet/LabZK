/**
 * src/infrastructure/soroban/types.ts
 *
 * Tipos para la verificación on-chain de pruebas ZK en Soroban (CAP-0074 BN254).
 *
 * Cuando circom compile y se genere el verification_key.json, estos tipos
 * se usarán para serializar las pruebas Groth16 y enviarlas al contrato
 * verificador de Soroban.
 */

export type G1Point = [string, string];   // [x, y] big-endian 32 bytes cada uno
export type G2Point = [string, string, string, string]; // [x_c1, x_c0, y_c1, y_c0]

/**
 * Prueba Groth16 serializada para envío a Soroban (256 bytes: A|B|C).
 * Formato BN254 según stellar-zk-groth16.
 */
export interface Groth16ProofSoroban {
  a: G1Point;      // 2 field elements
  b: [G2Point, G2Point]; // 2 Fp2 elements (each 2 field elements)
  c: G1Point;      // 2 field elements
}

/**
 * Inputs públicos para verificación on-chain.
 * Orden: [nullifier, seed] (según el circuito proof-of-knowledge.circom)
 */
export interface Groth16PublicInputs {
  nullifier: string;
  seed: string;
}

/**
 * Resultado de verificación on-chain.
 */
export interface Groth16VerifyResult {
  valid: boolean;
  nullifier?: string;
  txHash?: string;
  error?: string;
}

/**
 * Configuración del contrato verificador Soroban.
 */
export interface SorobanVerifierConfig {
  contractId: string;        // Dirección del contrato verificador en Soroban
  rpcUrl: string;            // RPC URL de Stellar (testnet/mainnet)
  networkPassphrase: string; // 'Testnet SDF Network ; September 2015' o mainnet
  verificationKeyHash?: string; // Hash de la verification key (para verificación ligera)
}
