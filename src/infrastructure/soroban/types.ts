/**
 * src/infrastructure/soroban/types.ts
 *
 * Tipos para la verificación on-chain de pruebas ZK en Soroban (CAP-0074 BN254).
 *
 * Variables de entorno requeridas para conectar al contrato desplegado:
 *   SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
 *   SOROBAN_NETWORK_PASSPHRASE=Testnet SDF Network ; September 2015
 *   SOROBAN_VERIFIER_CONTRACT_ID=CA... (contrato desplegado)
 *   SOROBAN_VERIFICATION_KEY_HASH=... (hash del vkey de Circom)
 *   SOROBAN_KYC_REGISTRY_CONTRACT_ID=CA... (contrato kyc_registry desplegado)
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

/**
 * Configuración del contrato KYC Registry Soroban.
 */
export interface KycRegistryConfig {
  contractId: string;
  rpcUrl: string;
  networkPassphrase: string;
}
