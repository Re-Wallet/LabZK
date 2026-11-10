/**
 * tests/application/verify-kyc.use-case.test.ts
 *
 * Prueba de CASO DE USO: VerifyKycUseCase.
 *
 * Regla de oro: mockea los PUERTOS (KycVerifierPort, NullifierRepository, UserRepository),
 * NO la lógica del caso de uso.
 *
 * Casos del inventario:
 *   - Prueba válida + nullifier nuevo → Usuario aprobado, nullifier persistido
 *   - Prueba inválida → Rechazo
 *   - Nullifier ya usado (replay) → Rechazo por doble uso
 *   - Prueba expirada → Rechazo
 *   - Circuito/claim incorrecto → Rechazo por mismatch
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { VerifyKycUseCase } from '../../src/application/kyc/verify-kyc.use-case';
import type { KycVerifierPort, KycVerifyResult, KycProofInput } from '../../src/domain/ports/kyc-verifier.port';
import type { NullifierRepository } from '../../src/domain/ports/nullifier.repository';
import type { UserRepository } from '../../src/domain/ports/user.repository';
import type { User } from '../../src/domain/entities/user.entity';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    tag: 'usuario1',
    tagChangeCount: 0,
    custodyType: 'non_custodial',
    kycApproved: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  } as User;
}

describe('Caso de uso — VerifyKycUseCase (KYC sin datos)', () => {
  let mockKycVerifier: any;
  let mockNullifierRepo: any;
  let mockUserRepo: any;
  let useCase: VerifyKycUseCase;

  const validProofInput: KycProofInput = {
    proof: { pi_a: ['1', '2'], pi_b: [['3', '4'], ['5', '6']], pi_c: ['7', '8'] } as any,
    publicInputs: { nullifier: 'nullifier-abc', seed: 'seed-123' },
    seed: 'seed-123',
  } as KycProofInput;

  beforeEach(() => {
    mockKycVerifier = {
      verifyKycProof: jest.fn(),
      isNullifierVerified: jest.fn(),
      registerNullifier: jest.fn(),
    } as any;
    mockNullifierRepo = {
      save: jest.fn(),
      exists: jest.fn(),
    } as any;
    mockUserRepo = {
      save: jest.fn(),
      findByTag: jest.fn(),
      findById: jest.fn(),
      findByNullifier: jest.fn(),
    } as any;

    useCase = new VerifyKycUseCase(mockKycVerifier, mockNullifierRepo, mockUserRepo);
  });

  it('prueba válida + nullifier nuevo → usuario aprobado, nullifier persistido', async () => {
    mockKycVerifier.verifyKycProof.mockResolvedValue({
      verified: true,
      nullifier: 'nullifier-abc',
      status: 'approved',
    } as KycVerifyResult);
    mockNullifierRepo.save.mockResolvedValue(true);
    mockUserRepo.findById.mockResolvedValue(makeUser());
    mockUserRepo.save.mockResolvedValue(undefined);

    const result = await useCase.execute({
      userId: 'user-123',
      proof: validProofInput.proof,
      publicInputs: validProofInput.publicInputs,
      seed: validProofInput.seed,
    });

    expect(result.verified).toBe(true);
    expect(result.nullifier).toBe('nullifier-abc');
    expect(mockKycVerifier.verifyKycProof).toHaveBeenCalledTimes(1);
    expect(mockNullifierRepo.save).toHaveBeenCalledWith('nullifier-abc', 'kakusho');
    expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
    const savedUser = mockUserRepo.save.mock.calls[0][0];
    expect(savedUser.kycApproved).toBe(true);
    expect(savedUser.nullifier).toBe('nullifier-abc');
  });

  it('prueba inválida → rechazo', async () => {
    mockKycVerifier.verifyKycProof.mockResolvedValue({
      verified: false,
      nullifier: 'nullifier-abc',
      status: 'rejected',
      reason: 'Invalid ZK proof',
    } as KycVerifyResult);

    await expect(
      useCase.execute({
        userId: 'user-123',
        proof: validProofInput.proof,
        publicInputs: validProofInput.publicInputs,
        seed: validProofInput.seed,
      })
    ).rejects.toThrow(/KYC verification failed/);

    expect(mockNullifierRepo.save).not.toHaveBeenCalled();
    expect(mockUserRepo.save).not.toHaveBeenCalled();
  });

  it('nullifier ya usado (replay) → rechazo por doble uso', async () => {
    mockKycVerifier.verifyKycProof.mockResolvedValue({
      verified: true,
      nullifier: 'nullifier-duplicate',
      status: 'approved',
    } as KycVerifyResult);
    mockNullifierRepo.save.mockResolvedValue(false); // ya existe → replay
    mockUserRepo.findById.mockResolvedValue(makeUser());

    await expect(
      useCase.execute({
        userId: 'user-123',
        proof: validProofInput.proof,
        publicInputs: validProofInput.publicInputs,
        seed: validProofInput.seed,
      })
    ).rejects.toThrow(/already used/);

    expect(mockUserRepo.save).not.toHaveBeenCalled();
  });

  it('usuario no encontrado → rechazo', async () => {
    mockKycVerifier.verifyKycProof.mockResolvedValue({
      verified: true,
      nullifier: 'nullifier-abc',
      status: 'approved',
    } as KycVerifyResult);
    mockNullifierRepo.save.mockResolvedValue(true);
    mockUserRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'user-999',
        proof: validProofInput.proof,
        publicInputs: validProofInput.publicInputs,
        seed: validProofInput.seed,
      })
    ).rejects.toThrow(/User not found/);
  });
});
