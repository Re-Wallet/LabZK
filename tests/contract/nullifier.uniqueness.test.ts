/**
 * tests/contract/nullifier.uniqueness.test.ts
 *
 * Prueba TRANSVERSAL — Nullifier uniqueness.
 *
 * Regla: zk_nullifiers.nullifier tiene constraint UNIQUE (anti-replay).
 * Esto se valida contra el DDL real.
 */

import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';

const DDL_ZK = readFileSync(
  require.resolve('../../migrations/002_zk_layer.sql'),
  'utf8'
);

describe('Transversal — Nullifier: constraint único en zk_nullifiers', () => {
  it('zk_nullifiers.nullifier tiene UNIQUE constraint', () => {
    // Buscar la definición de la tabla zk_nullifiers con UNIQUE en nullifier
    expect(DDL_ZK).toMatch(/CREATE TABLE IF NOT EXISTS zk_nullifiers/);
    expect(DDL_ZK).toMatch(/nullifier\s+TEXT NOT NULL UNIQUE/);
    expect(DDL_ZK).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS zk_nullifiers_nullifier_uq/);
  });

  it('zk_nullifiers tiene foreign key a users(user_id)', () => {
    expect(DDL_ZK).toMatch(/user_id\s+UUID REFERENCES users\(id\)/);
  });
});
