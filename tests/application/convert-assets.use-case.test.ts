/**
 * tests/application/convert-assets.use-case.test.ts
 *
 * Prueba de CASO DE USO: ConvertAssetsUseCase (Path Payment ARS→USDC).
 *
 * Regla de oro: mockea PathPaymentPort / Horizon (frontera), NO la atomicidad (dominio).
 *
 * Casos del inventario:
 *   - ARS digital → USDC exitoso → Conversión completa, saldo USDC correcto
 *   - Sin path disponible → Falla limpia, sin estado intermedio
 *   - Slippage > min → Rechazo atómico
 *   - Liquidez parcial → Falla completa (no fill parcial)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ConvertAssetsUseCase } from '../../src/application/path-payment/convert-assets.use-case';
import type { PathPaymentPort, PathPaymentResult } from '../../src/domain/ports/path-payment.port';

describe('Caso de uso — ConvertAssetsUseCase (Path Payment)', () => {
  let mockPathPayment: any;
  let useCase: ConvertAssetsUseCase;

  beforeEach(() => {
    mockPathPayment = {
      convert: jest.fn(),
    } as any;
    useCase = new ConvertAssetsUseCase(mockPathPayment);
  });

  it('ARS digital → USDC exitoso → conversión completa', async () => {
    mockPathPayment.convert.mockResolvedValue({
      success: true,
      txHash: 'tx-path-123',
      sendAmount: '1000',
      destAmount: '1',
      route: ['ARST', 'XLM', 'USDC'],
    } as PathPaymentResult);

    const result = await useCase.execute({
      sendAsset: 'ARST',
      sendAmount: '1000',
      destAsset: 'USDC',
      destMin: '0.99',
      destination: 'GDEST...',
    });

    expect(result.success).toBe(true);
    expect(result.txHash).toBe('tx-path-123');
    expect(result.route).toEqual(['ARST', 'XLM', 'USDC']);
  });

  it('sin path disponible → falla limpia, sin estado intermedio', async () => {
    mockPathPayment.convert.mockResolvedValue({
      success: false,
      reason: 'No path available',
    } as PathPaymentResult);

    const result = await useCase.execute({
      sendAsset: 'ARST',
      sendAmount: '1000',
      destAsset: 'USDC',
      destMin: '0.99',
      destination: 'GDEST...',
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('No path available');
  });

  it('slippage > min → rechazo atómico', async () => {
    mockPathPayment.convert.mockResolvedValue({
      success: false,
      reason: 'Destination min not met — slippage exceeded',
    } as PathPaymentResult);

    const result = await useCase.execute({
      sendAsset: 'ARST',
      sendAmount: '1000',
      destAsset: 'USDC',
      destMin: '5.0',
      destination: 'GDEST...',
    });

    expect(result.success).toBe(false);
    expect(result.reason).toContain('slippage');
  });
});
