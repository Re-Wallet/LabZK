/**
 * application/kyc/verify-kyc.use-case.ts
 *
 * Caso de uso: Verificación KYC ZK (Kakusho).
 * El backend recibe nullifier + prueba ZK, NUNCA PII.
 *
 * Invariante: KYC es la puerta del claim — sin kyc_status='approved'
 * no se ejecuta claimClaimableBalance.
 */

import type { KycVerifierPort } from '../../domain/ports/kyc-verifier.port.js';
import type { NullifierRepository } from '../../domain/ports/nullifier.repository.js';
import type { UserRepository } from '../../domain/ports/user.repository.js';
import type { User } from '../../domain/entities/user.entity.js';

export interface VerifyKycInput {
  proof: { pi_a: string[]; pi_b: string[][]; pi_c: string[] };
  publicInputs: { nullifier: string; seed: string };
  seed: string;
  userId: string;
}

export interface VerifyKycOutput {
  verified: boolean;
  nullifier: string;
  user: User;
}

export class VerifyKycUseCase {
  constructor(
    private readonly kycVerifier: KycVerifierPort,
    private readonly nullifierRepo: NullifierRepository,
    private readonly userRepo: UserRepository
  ) {}

  async execute(input: VerifyKycInput): Promise<VerifyKycOutput> {
    // 1. Verificar la prueba ZK (sin PII)
    const result = await this.kycVerifier.verifyKycProof({
      proof: input.proof,
      publicInputs: input.publicInputs,
      seed: input.seed,
    });

    if (!result.verified) {
      throw new Error(`KYC verification failed: ${result.reason ?? 'invalid proof'}`);
    }

    // 2. Registrar el nullifier (anti-replay). Si ya existe, rechazar.
    const registered = await this.nullifierRepo.save(
      result.nullifier,
      'kakusho'
    );
    if (!registered) {
      throw new Error('Nullifier already used — replay detected');
    }

    // 3. Vincular nullifier al usuario y aprobar KYC
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser: User = {
      ...user,
      nullifier: result.nullifier,
      kycApproved: true,
      updatedAt: Date.now(),
    };
    await this.userRepo.save(updatedUser);

    return { verified: true, nullifier: result.nullifier, user: updatedUser };
  }
}
