/**
 * infrastructure/adapters/payment-link/atreus.adapter.ts
 *
 * Adaptador: Atreus (@atreus-lab/atreus).
 * Implementa PaymentLinkPort.
 *
 * Arquitectura: Noir (UltraHonk) → backend attester → Soroban escrow.
 * Nota: actualmente usa attester off-chain porque el toolchain targetea BN254
 * y la verificación nativa en Soroban aún no está disponible directamente.
 * Cuando CAP-0074 esté maduro, el attester puede sustituirse por verificación on-chain pura.
 *
 * Flujo:
 *   1. Creador crea link con monto + regla ZK opcional.
 *   2. Receptor genera prueba ZK de conocimiento del secreto.
 *   3. Escrow libera fondos tras verificación.
 *
 * Advertencia: testnet/beta, no auditado.
 */

import type { PaymentLinkPort, PaymentLink, CreateLinkInput } from '../../../domain/ports/payment-link.port.js';

export class AtreusAdapter implements PaymentLinkPort {
  private links = new Map<string, PaymentLink>();

  async createLink(input: CreateLinkInput): Promise<PaymentLink> {
    const id = `link_${Date.now()}`;
    const link: PaymentLink = {
      id,
      url: `https://wallet.labzk.app/pay/${id}`,
      zkRuleHash: input.zkRuleHash,
      secretHash: input.secretHash,
      amount: input.amount,
      asset: input.asset,
      status: 'active',
      createdAt: Date.now(),
      expiresAt: Date.now() + input.ttl,
    };
    this.links.set(id, link);
    return link;
  }

  async claimLink(linkId: string, zkProof: unknown): Promise<{ success: boolean; txHash?: string }> {
    const link = this.links.get(linkId);
    if (!link || link.status !== 'active') {
      return { success: false };
    }

    // Aquí se verificaría la prueba ZK con el attester de Atreus
    // (off-chain hasta que CAP-0074 permita verificación on-chain directa)
    link.status = 'claimed';
    this.links.set(linkId, link);

    return { success: true, txHash: `tx_claim_${Date.now()}` };
  }
}
