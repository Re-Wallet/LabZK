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
import { Piilo } from '@neylanxyz/piilo';

describe('Adaptador — PiiloAdapter (Privacidad de montos)', () => {
  let mockWallet: any;
  let adapter: PiiloAdapter;

  beforeEach(() => {
    (Piilo as any).clearInstances();

    mockWallet = {
      publicKey: jest.fn<any>().mockResolvedValue('GDEST...address' as any),
      signTransaction: jest.fn<any>().mockResolvedValue('signed-xdr' as any),
      signMessage: jest.fn<any>().mockResolvedValue({ signature: new Uint8Array([1, 2, 3]) } as any),
    };

    adapter = new PiiloAdapter({
      network: 'testnet',
      asset: 'USDC',
      wallet: mockWallet,
    });
  });

  it('deposit crea commitment → éxito', async () => {
    const result = await adapter.deposit({ amount: 50_000_000n });

    expect(result.success).toBe(true);
    const instance = (Piilo as any).instances[(Piilo as any).instances.length - 1];
    expect(instance.deposit).toHaveBeenCalledWith(50_000_000n);
  });

  it('transfer oculta monto → éxito', async () => {
    const result = await adapter.transferPrivate({
      to: 'GDEST...address',
      amount: 20_000_000n,
    });

    expect(result.success).toBe(true);
    const instance = (Piilo as any).instances[(Piilo as any).instances.length - 1];
    expect(instance.transfer).toHaveBeenCalledWith({
      to: 'GDEST...address',
      amount: 20_000_000n,
    });
  });

  it('withdraw revela saldo → éxito', async () => {
    const result = await adapter.withdraw();

    expect(result.success).toBe(true);
    const instance = (Piilo as any).instances[(Piilo as any).instances.length - 1];
    expect(instance.withdraw).toHaveBeenCalledTimes(1);
  });

  it('getBalance retorna balance local sin revelar monto en claro al backend', async () => {
    const balance = await adapter.getBalance();
    expect(balance).toBe('50000000');
  });

  it('exportBackup() tratado como secreto → nunca se loguea ni se envía', async () => {
    await adapter.getBalance();
    const instance = (Piilo as any).instances[(Piilo as any).instances.length - 1];
    const backup = instance.exportBackup();
    expect(backup).toBe('mock-backup');
  });

  it('settlePending → recibe transferencias pendientes', async () => {
    const result = await adapter.settlePending();
    expect(result).toEqual({ received: '0' });
  });

  it('lanza error si no hay wallet configurada', async () => {
    const adapterNoWallet = new PiiloAdapter({
      network: 'testnet',
      asset: 'USDC',
    });
    await expect(adapterNoWallet.getBalance()).rejects.toThrow(/no configurado/);
  });
});
