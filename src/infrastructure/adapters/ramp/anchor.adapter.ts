/**
 * infrastructure/adapters/ramp/anchor.adapter.ts
 *
 * Adaptador: Anchor Platform (SEP-6 / SEP-24).
 * Implementa RampPort. Off-ramp/On-ramp fiat vía anchors (Settle, Vesseo, Bitso).
 *
 * No custodia fondos. El anchor convierte USDC → ARS y deposina en banco local (CBU/CVU).
 * Puede reutilizar el nullifier de Kakusho (vía VCs) para reducir fricción KYC.
 *
 * Advertencia: anchors tienen requisitos regulatorios propios.
 */

import type { RampPort, RampOperation, RampOperationInput } from '../../../domain/ports/ramp.port.js';

export class AnchorAdapter implements RampPort {
  private operations = new Map<string, RampOperation>();

  async offRampFiat(input: RampOperationInput): Promise<RampOperation> {
    const id = `ramp_${Date.now()}`;
    const operation: RampOperation = {
      id,
      userId: input.userId,
      anchor: input.anchor,
      status: 'pending',
      amountUsdc: input.amountUsdc,
      cbuCvu: input.cbuCvu,
      createdAt: Date.now(),
    };
    this.operations.set(id, operation);

    // TODO: Llamar a la API del anchor (SEP-24) para iniciar el off-ramp
    // El anchor puede requerir KYC propio; el nullifier de Kakusho se puede reutilizar
    return operation;
  }

  async getRampStatus(operationId: string): Promise<RampOperation | null> {
    return this.operations.get(operationId) ?? null;
  }
}
