/**
 * domain/ports/kyc-verifier.port.ts
 *
 * Puerto: Verificación KYC ZK (Kakusho).
 * Reemplaza a DiditClient. El backend recibe nullifier + prueba, NUNCA PII.
 *
 * Flujo: OCR local en cliente → prueba Groth16 → backend recibe nullifier +
 * prueba → kyc_registry en Soroban valida on-chain.
 */

export interface KycProofInput {
  /** Prueba Groth16 serializada (pi_a, pi_b, pi_c) */
  proof: { pi_a: string[]; pi_b: string[][]; pi_c: string[] };
  /** Inputs públicos: [nullifier, seed] */
  publicInputs: { nullifier: string; seed: string };
  /** Semilla pública usada para derivar el nullifier */
  seed: string;
}

export interface KycVerifyResult {
  verified: boolean;
  nullifier: string;
  status: 'approved' | 'rejected';
  reason?: string;
}

export interface KycVerifierPort {
  /**
   * Verifica una prueba ZK de KYC sin recibir PII.
   * Retorna el nullifier si la prueba es válida.
   */
  verifyKycProof(input: KycProofInput): Promise<KycVerifyResult>;

  /**
   * Verifica si un nullifier ya está registrado y aprobado.
   * (Consulta kyc_registry en Soroban o tabla zk_nullifiers)
   */
  isNullifierVerified(nullifier: string): Promise<boolean>;

  /**
   * Registra un nullifier como verificado (primera vez).
   * Retorna false si ya existe (replay/doble uso).
   */
  registerNullifier(nullifier: string): Promise<boolean>;
}
