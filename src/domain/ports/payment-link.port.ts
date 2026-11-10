/**
 * domain/ports/payment-link.port.ts
 *
 * Puerto: Links de pago con reglas ZK (Atreus).
 * Escrow condicional: el receptor reclama generando una prueba ZK
 * de conocimiento del secreto sin revelarlo on-chain.
 */

export interface CreateLinkInput {
  amount: string;
  asset: string;
  zkRuleHash?: string;   // Hash de la regla ZK (ej. "KYC aprobado")
  secretHash?: string;    // Hash del secreto para reclamar
  ttl: number;            // Tiempo de vida del link
}

export interface PaymentLink {
  id: string;
  url: string;            // QR/link público
  zkRuleHash?: string;
  secretHash?: string;
  amount: string;
  asset: string;
  status: 'active' | 'claimed' | 'expired';
  createdAt: number;
  expiresAt: number;
}

export interface PaymentLinkPort {
  /**
   * Crea un link/QR de pago con regla ZK opcional.
   */
  createLink(input: CreateLinkInput): Promise<PaymentLink>;

  /**
   * Reclama fondos de un link generando prueba ZK.
   */
  claimLink(linkId: string, zkProof: unknown): Promise<{ success: boolean; txHash?: string }>;
}
