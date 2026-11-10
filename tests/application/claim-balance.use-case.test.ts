/**
 * tests/application/claim-balance.use-case.test.ts
 *
 * Prueba de CASO DE USO: ClaimBalanceUseCase (KYC gate).
 *
 * Regla de oro: mockea UserRepository (frontera), NO la lógica de gate KYC (dominio).
 *
 * Casos del inventario:
 *   - Claim: token hash SHA-256, TTL, doble claim rechazado
 *   - KYC gate: sin kyc_status = approved → no hay claim
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ClaimBalanceUseCase } from '../../src/application/claim/claim-balance.use-case';
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

describe('Caso de uso — ClaimBalanceUseCase (KYC gate)', () => {
  let mockUserRepo: any;
  let useCase: ClaimBalanceUseCase;

  beforeEach(() => {
    mockUserRepo = {
      save: jest.fn(),
      findByTag: jest.fn(),
      findById: jest.fn(),
      findByNullifier: jest.fn(),
    } as any;
    useCase = new ClaimBalanceUseCase(mockUserRepo);
  });

  it('sin KYC aprobado → claim rechazado (KYC gate)', async () => {
    mockUserRepo.findById.mockResolvedValue(makeUser({ kycApproved: false }));

    const result = await useCase.execute({
      claimTokenHash: 'sha256-hash-abc',
      userId: 'user-123',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('KYC not approved');
  });

  it('con KYC aprobado y claim token hash → claim permitido', async () => {
    mockUserRepo.findById.mockResolvedValue(makeUser({ kycApproved: true }));

    const result = await useCase.execute({
      claimTokenHash: 'sha256-hash-abc',
      userId: 'user-123',
    });

    expect(result.allowed).toBe(true);
  });

  it('sin claim token hash → rechazo', async () => {
    mockUserRepo.findById.mockResolvedValue(makeUser({ kycApproved: true }));

    const result = await useCase.execute({
      claimTokenHash: '',
      userId: 'user-123',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Claim token hash required');
  });

  it('usuario no encontrado → rechazo', async () => {
    mockUserRepo.findById.mockResolvedValue(null);

    const result = await useCase.execute({
      claimTokenHash: 'sha256-hash-abc',
      userId: 'user-999',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('User not found');
  });
});
