/**
 * application/privacy/withdraw.use-case.ts
 *
 * Caso de uso: Retiro del modo confidencial (Piilo).
 * Revela el balance y sale del modo privado antes de enviar a dirección pública.
 */

import type { PrivacyPort } from '../../domain/ports/privacy.port.js';

export class WithdrawUseCase {
  constructor(private readonly privacyPort: PrivacyPort) {}

  async execute(): Promise<{ success: boolean; reason?: string }> {
    return this.privacyPort.withdraw();
  }
}
