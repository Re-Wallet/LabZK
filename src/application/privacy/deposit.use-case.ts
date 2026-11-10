/**
 * application/privacy/deposit.use-case.ts
 *
 * Caso de uso: Depósito en modo confidencial (Piilo).
 * Oculta el monto con compromiso de Pedersen.
 */

import type { PrivacyPort } from '../../domain/ports/privacy.port.js';

export interface DepositUseCaseInput {
  amount: bigint; // stroops
}

export class DepositUseCase {
  constructor(private readonly privacyPort: PrivacyPort) {}

  async execute(input: DepositUseCaseInput): Promise<{ success: boolean; reason?: string }> {
    return this.privacyPort.deposit({ amount: input.amount });
  }
}
