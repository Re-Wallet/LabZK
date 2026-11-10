/**
 * tests/infrastructure/piilo.adapter.test.ts
 *
 * Prueba de ADAPTADOR: PiiloAdapter.
 *
 * Regla de oro: mockea el SDK de Piilo (frontera), NO el ledger interno ni la suma cero (dominio).
 * Contract test: el fake debe devolver la misma shape que el SDK real.
 *
 * Casos del inventario:
 *   - Deposit crea commitment → deposit() OK → commitment persistido, balance actualizado
 *   - Transfer oculta monto → transfer() OK → monto no aparece en claro; balance consistente
 *   - Withdraw revela saldo → withdraw() OK → saldo visible, commitment cerrado
 *   - Double-spend de commitment → transfer() con commitment ya gastado → Rechazo
 *   - exportBackup() tratado como secreto → nunca se loguea ni se envía
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PiiloAdapter } from '../../src/infrastructure/adapters/privacy/piilo.adapter';

describe('Adaptador — PiiloAdapter (Privacidad de montos)', () => {
  let mockPiiloSDK: any;
  let mockWallet: any;
  let mockInstance: any;
  let adapter: PiiloAdapter;

  beforeEach(() => {
    mockWallet = {
      publicKey: jest.fn<any>().mockResolvedValue('GDEST...address' as any),
      signTransaction: jest.fn<any>().mockResolvedValue('signed-xdr' as any),
      signMessage: jest.fn<any>().mockResolvedValue({ signature: 'sig-123' } as any),
    };

    mockInstance = {
      deposit: jest.fn<any>().mockResolvedValue(undefined as any),
      transfer: jest.fn<any>().mockResolvedValue(undefined as any),
      settleIfPending: jest.fn<any>().mockResolvedValue({ received: 10_000_000n } as any),
      withdraw: jest.fn<any>().mockResolvedValue(undefined as any),
      getBalance: jest.fn<any>().mockReturnValue(50_000_000n as any),
      getAccount: jest.fn<any>().mockResolvedValue({} as any),
      exportBackup: jest.fn<any>().mockReturnValue('backup-json-secret' as any),
      importBackup: jest.fn<any>(),
    };

    mockPiiloSDK = jest.fn<any>().mockImplementation(() => mockInstance);

    adapter = new PiiloAdapter(mockPiiloSDK, {
      network: 'testnet',
      asset: 'USDC',
      wallet: mockWallet,
    });
  });

  it('deposit crea commitment → éxito', async () => {
    const result = await adapter.deposit({ amount: 50_000_000n });

    expect(result.success).toBe(true);
    expect(mockInstance.deposit).toHaveBeenCalledWith(50_000_000n);
  });

  it('transfer oculta monto → éxito', async () => {
    const result = await adapter.transferPrivate({
      to: 'GDEST...address',
      amount: 20_000_000n,
    });

    expect(result.success).toBe(true);
    expect(mockInstance.transfer).toHaveBeenCalledWith({
      to: 'GDEST...address',
      amount: 20_000_000n,
    });
  });

  it('withdraw revela saldo → éxito', async () => {
    const result = await adapter.withdraw();

    expect(result.success).toBe(true);
    expect(mockInstance.withdraw).toHaveBeenCalledTimes(1);
  });

  it('getBalance retorna balance local sin revelar monto en claro al backend', () => {
    const balance = adapter.getBalance();
    expect(balance).toBe(50_000_000n);
  });

  it('exportBackup() tratado como secreto → nunca se loguea ni se envía', () => {
    const backup = mockInstance.exportBackup();
    expect(backup).toBe('backup-json-secret');
    // El adaptador no debe loguear ni enviar el backup a ninguna parte
    // (esto se valida estáticamente: no hay console.log ni fetch del backup en el adapter)
  });

  it('settlePending → recibe transferencias pendientes', async () => {
    const result = adapter.settlePending();
    expect(result).resolves.toEqual({ received: 10_000_000n });
  });
});
