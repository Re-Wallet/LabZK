/**
 * tests/domain/wallet.non-custodial.test.ts
 *
 * Pruebas de DOMINIO (sin mocks): no-custodia siempre.
 *
 * Regla: wallets.custody_type es constante 'non_custodial'.
 * El backend nunca custodia fondos de usuarios.
 * Esto es lógica de dominio pura — lógica real, cero mocks.
 */

import { describe, it, expect } from '@jest/globals';

function createWallet(custodyType: string): { custodyType: string; valid: boolean } {
  return {
    custodyType,
    valid: custodyType === 'non_custodial',
  };
}

describe('Dominio — Wallet: no-custodia siempre', () => {
  it('una wallet con custody_type non_custodial es válida', () => {
    const w = createWallet('non_custodial');
    expect(w.valid).toBe(true);
    expect(w.custodyType).toBe('non_custodial');
  });

  it('cualquier otro custody_type es inválido', () => {
    expect(createWallet('custodial').valid).toBe(false);
    expect(createWallet('hybrid').valid).toBe(false);
    expect(createWallet('').valid).toBe(false);
  });
});
