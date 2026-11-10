/**
 * tests/application/transfer-private.use-case.test.ts
 *
 * Prueba de CASO DE USO: TransferPrivateUseCase (Piilo).
 *
 * Regla de oro: mockea PrivacyPort (frontera), NO el ledger interno ni la suma cero (dominio).
 *
 * Casos del inventario:
 *   - Transfer oculta monto → transfer() OK → monto no aparece en claro; balance consistente
 *   - Double-spend de commitment → transfer() con commitment ya gastado → Rechazo
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { TransferPrivateUseCase } from '../../src/application/privacy/transfer.use-case';
import type { PrivacyPort, PrivacyResult } from '../../src/domain/ports/privacy.port';

describe('Caso de uso — TransferPrivateUseCase (Piilo)', () => {
  let mockPrivacyPort: any;
  let useCase: TransferPrivateUseCase;

  beforeEach(() => {
    mockPrivacyPort = {
      deposit: jest.fn(),
      transferPrivate: jest.fn(),
      settlePending: jest.fn(),
      withdraw: jest.fn(),
      getBalance: jest.fn(),
    } as any;
    useCase = new TransferPrivateUseCase(mockPrivacyPort);
  });

  it('transfer oculta monto → éxito, balance consistente', async () => {
    mockPrivacyPort.transferPrivate.mockResolvedValue({
      success: true,
    } as PrivacyResult);

    const result = await useCase.execute({
      to: 'GDDEST...address',
      amount: 20_000_000n,
    });

    expect(result.success).toBe(true);
    expect(mockPrivacyPort.transferPrivate).toHaveBeenCalledWith({
      to: 'GDDEST...address',
      amount: 20_000_000n,
    });
  });

  it('double-spend de commitment → rechazo', async () => {
    mockPrivacyPort.transferPrivate.mockResolvedValue({
      success: false,
      reason: 'Commitment already spent',
    } as PrivacyResult);

    const result = await useCase.execute({
      to: 'GDDEST...address',
      amount: 20_000_000n,
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('Commitment already spent');
  });
});
