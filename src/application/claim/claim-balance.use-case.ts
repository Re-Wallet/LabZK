/**
 * application/claim/claim-balance.use-case.ts
 *
 * Caso de uso: Reclamo de balance (Claimable Balance).
 *
 * Invariantes:
 *   - KYC es la puerta del claim: sin kyc_status='approved' no se ejecuta.
 *   - Token plano una sola vez: solo se guarda SHA-256 hash.
 *   - El destinatario se materializa solo cuando reclama.
 */

import type { UserRepository } from '../../domain/ports/user.repository.js';

export interface ClaimBalanceInput {
  claimTokenHash: string;   // SHA-256 del token plano (una sola vez)
  userId: string;           // Usuario que reclama (debe tener KYC aprobado)
  zkRuleHash?: string;      // Regla ZK opcional (Atreus)
}

export class ClaimBalanceUseCase {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(input: ClaimBalanceInput): Promise<{ allowed: boolean; reason?: string }> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // Invariante: KYC es la puerta del claim
    if (!user.kycApproved) {
      return { allowed: false, reason: 'KYC not approved — claim gate not satisfied' };
    }

    // Invariante: token plano una sola vez — solo el hash se guarda
    if (!input.claimTokenHash) {
      return { allowed: false, reason: 'Claim token hash required' };
    }

    return { allowed: true };
  }
}
