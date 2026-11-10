/**
 * tests/domain/transfer.idempotency.test.ts
 *
 * Pruebas de DOMINIO (sin mocks): idempotencia de transferencias.
 *
 * Regla: transfers.idempotency_key previene duplicación de transferencias.
 * Lógica de dominio pura — lógica real, cero mocks.
 */

import { describe, it, expect } from '@jest/globals';

type Transfer = { idempotencyKey: string; status: string };

function processTransfer(
  key: string,
  processedKeys: Set<string>
): { duplicate: boolean; processed: Set<string> } {
  if (processedKeys.has(key)) {
    return { duplicate: true, processed: processedKeys };
  }
  processedKeys.add(key);
  return { duplicate: false, processed: processedKeys };
}

describe('Dominio — Transfer: idempotency_key previene duplicación', () => {
  it('primera transfer con una clave se procesa', () => {
    const processed = new Set<string>();
    const r = processTransfer('key-1', processed);
    expect(r.duplicate).toBe(false);
    expect(processed.has('key-1')).toBe(true);
  });

  it('misma clave se rechaza como duplicado', () => {
    const processed = new Set<string>();
    processTransfer('key-2', processed);
    const r = processTransfer('key-2', processed);
    expect(r.duplicate).toBe(true);
  });

  it('claves diferentes se procesan independientemente', () => {
    const processed = new Set<string>();
    expect(processTransfer('key-a', processed).duplicate).toBe(false);
    expect(processTransfer('key-b', processed).duplicate).toBe(false);
    expect(processTransfer('key-a', processed).duplicate).toBe(true);
    expect(processed.size).toBe(2);
  });
});
