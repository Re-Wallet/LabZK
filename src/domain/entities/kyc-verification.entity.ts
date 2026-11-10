/**
 * domain/entities/kyc-verification.entity.ts
 *
 * Entidad de dominio: Verificación KYC ZK (Kakusho).
 * Sin datos OCR, sin nombre, sin documento. Solo nullifier + prueba.
 */

export type KycStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface KycVerification {
  id: string;
  userId: string;
  nullifier: string;          // Nullifier emitido por Kakusho (no vinculable a identidad)
  status: KycStatus;
  proofSubmittedAt: number;
  verifiedAt?: number;
  integrator: string;         // Qué servicio emitió el nullifier (ej. 'kakusho')
}
