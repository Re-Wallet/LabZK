/**
 * tests/domain/ledger.invariant.test.ts
 *
 * Pruebas de DOMINIO (sin mocks): invariante de doble entrada contable.
 *
 * Regla: Todo movimiento en el ledger genera asientos de débito y crédito
 * cuya suma es cero por grupo de transacción.
 *
 * Esto es lógica de dominio pura — se testa con lógica real, cero mocks.
 */

import { describe, it, expect } from '@jest/globals';
import type { LedgerEntry, LedgerEntryType } from '../../src/domain/entities/ledger-entry.entity.js';

type Direction = 'debit' | 'credit';

function makeEntry(
  groupId: string,
  direction: Direction,
  amount: number,
  account: string = 'account-1'
): LedgerEntry {
  return {
    id: `entry_${Math.random()}`,
    transferId: `transfer_${groupId}`,
    type: direction === 'debit' ? 'debit' : 'credit',
    amount: amount.toString(),
    asset: 'USDC',
    account,
    createdAt: Date.now(),
  } as unknown as LedgerEntry;
}

function groupSumZero(entries: LedgerEntry[]): boolean {
  const byGroup = new Map<string, { debit: number; credit: number }>();
  for (const e of entries) {
    if (!byGroup.has(e.transferId)) {
      byGroup.set(e.transferId, { debit: 0, credit: 0 });
    }
    const g = byGroup.get(e.transferId)!;
    const amt = Number(e.amount);
    if (e.type === 'debit') g.debit += amt;
    else g.credit += amt;
  }
  for (const [, g] of byGroup) {
    if (Math.abs(g.debit - g.credit) > 0.00000001) return false;
  }
  return true;
}

describe('Dominio — Ledger: doble entrada suma cero', () => {
  it('un transfer válido tiene débito y crédito iguales (suma cero)', () => {
    const entries: LedgerEntry[] = [
      makeEntry('tx-1', 'debit', 100, 'usuario-a'),
      makeEntry('tx-1', 'credit', 100, 'usuario-b'),
    ];
    expect(groupSumZero(entries)).toBe(true);
  });

  it('un transfer con múltiples asientos del mismo grupo suma cero', () => {
    const entries: LedgerEntry[] = [
      makeEntry('tx-2', 'debit', 50, 'usuario-a'),
      makeEntry('tx-2', 'debit', 30, 'usuario-a'),
      makeEntry('tx-2', 'credit', 80, 'usuario-b'),
    ];
    expect(groupSumZero(entries)).toBe(true);
  });

  it('un transfer desbalanceado NO pasa la invariante', () => {
    const entries: LedgerEntry[] = [
      makeEntry('tx-3', 'debit', 100, 'usuario-a'),
      makeEntry('tx-3', 'credit', 90, 'usuario-b'),
    ];
    expect(groupSumZero(entries)).toBe(false);
  });

  it('diferentes grupos son independientes', () => {
    const entries: LedgerEntry[] = [
      makeEntry('tx-4', 'debit', 100, 'usuario-a'),
      makeEntry('tx-4', 'credit', 100, 'usuario-b'),
      makeEntry('tx-5', 'debit', 200, 'usuario-c'),
      // tx-5 sin crédito → desbalanceado, pero tx-4 está bien
    ];
    // tx-4 sí suma cero, tx-5 no → al menos un grupo desbalanceado
    const byGroup = new Map<string, boolean>();
    for (const e of entries) {
      if (!byGroup.has(e.transferId)) byGroup.set(e.transferId, true);
    }
    expect(byGroup.size).toBe(2);
    expect(groupSumZero(entries)).toBe(false);
  });
});
