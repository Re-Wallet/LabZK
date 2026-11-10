/**
 * application/privacy/transfer.use-case.ts
 *
 * Caso de uso: Transferencia privada (Piilo).
 * Genera prueba ZK de Groth16 client-side; monto oculto.
 * La dirección del destinatario sigue pública (AML/KYC).
 */

import type { PrivacyPort } from '../../domain/ports/privacy.port.js';

export interface TransferPrivateInput {
  to: string;
  amount: bigint;
}

export class TransferPrivateUseCase {
  constructor(private readonly privacyPort: PrivacyPort) {}

  async execute(input: TransferPrivateInput): Promise<{ success: boolean; reason?: string }> {
    return this.privacyPort.transferPrivate(input);
  }
}
