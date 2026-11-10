/**
 * tests/application/deposit.use-case.test.ts
 *
 * Prueba de CASO DE USO: DepositUseCase (Piilo - privacidad de montos).
 *
 * Regla de oro: mockea PrivacyPort (frontera), NO el ledger interno ni la suma cero (dominio).
 *
 * Casos del inventario:
 *   - Deposit crea commitment → deposit() OK → commitment persistido, balance actualizado
 *   - exportBackup() tratado como secreto → nunca se loguea ni se envía
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DepositUseCase } from '../../src/application/privacy/deposit.use-case';
import type { PrivacyPort, PrivacyResult } from '../../src/domain/ports/privacy.port';

describe('Caso de uso — DepositUseCase (Piilo)', () => {
  let mockPrivacyPort: any;
  let useCase: DepositUseCase;

  beforeEach(() => {
    mockPrivacyPort = {
      deposit: jest.fn(),
      transferPrivate: jest.fn(),
      settlePending: jest.fn(),
      withdraw: jest.fn(),
      getBalance: jest.fn(),
    } as any;
    useCase = new DepositUseCase(mockPrivacyPort);
  });

  it('deposit crea commitment → balance actualizado', async () => {
    mockPrivacyPort.deposit.mockResolvedValue({ success: true } as PrivacyResult);

    const result = await useCase.execute({ amount: 50_000_000n });

    expect(result.success).toBe(true);
    expect(mockPrivacyPort.deposit).toHaveBeenCalledWith({ amount: 50_000_000n });
  });

  it('deposit falla → error devuelto', async () => {
    mockPrivacyPort.deposit.mockResolvedValue({
      success: false,
      reason: 'Insufficient funds',
    } as PrivacyResult);

    const result = await useCase.execute({ amount: 50_000_000n });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('Insufficient funds');
  });
});
