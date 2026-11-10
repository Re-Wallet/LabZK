/**
 * tests/contract/schema.no-pii.test.ts
 *
 * Prueba TRANSVERSAL — Schema estático.
 *
 * Regla: Ninguna tabla tiene columnas de PII (nombre, documento, fecha de
 * nacimiento, email, teléfono, nacionalidad) después de la migración ZK.
 *
 * Se valida contra migrations/002_zk_layer.sql (la migración ZK).
 */

import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';

const DDL_ZK = readFileSync(
  require.resolve('../../migrations/002_zk_layer.sql'),
  'utf8'
);

// Columnas PII que deben ser ELIMINADAS por la migración ZK
const PII_COLUMNS = [
  'full_name',
  'email',
  'phone_number',
  'document_type',
  'document_number',
  'document_expiry',
  'date_of_birth',
  'nationality',
  'kyc_verified_at',
  'kyc_expires_at',
];

// Columnas de Didit que son datos sensibles y deben ser eliminadas
const DIDIT_PII_COLUMNS = [
  'didit_session_id',
  'workflow_id',
  'session_url',
  'decision_payload',
  'decline_reason',
  'session_created_at',
  'resolved_at',
];

// Columnas no-PII que NO deben ser dropeadas (se mantienen)
const ALLOWED_COLUMNS = [
  'id',
  'tag',
  'tag_change_count',
  'tag_updated_at',
  'kyc_status',
  'account_status',
  'created_at',
  'updated_at',
];

describe('Transversal — Schema: ninguna columna PII en BD después de migración ZK', () => {
  it('todas las columnas PII son dropeadas en la migración ZK', () => {
    for (const col of PII_COLUMNS) {
      expect(DDL_ZK).toContain(`DROP COLUMN ${col}`);
    }
  });

  it('todas las columnas Didit/PII son dropeadas de kyc_verifications', () => {
    for (const col of DIDIT_PII_COLUMNS) {
      expect(DDL_ZK).toContain(`DROP COLUMN ${col}`);
    }
  });

  it('ninguna columna no-PII permitida es dropeada', () => {
    for (const col of ALLOWED_COLUMNS) {
      expect(DDL_ZK).not.toContain(`DROP COLUMN ${col}`);
    }
  });

  it('zk_nullifiers.nullifier tiene UNIQUE constraint', () => {
    expect(DDL_ZK).toContain('CREATE TABLE IF NOT EXISTS zk_nullifiers');
    expect(/nullifier\s+TEXT\s+NOT\s+NULL\s+UNIQUE/.test(DDL_ZK)).toBe(true);
    expect(
      /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+zk_nullifiers_nullifier_uq/.test(
        DDL_ZK
      )
    ).toBe(true);
  });

  it('zk_nullifiers tiene foreign key a users(user_id)', () => {
    expect(
      /user_id\s+UUID\s+REFERENCES\s+users\(id\)\s+ON\s+DELETE\s+SET\s+NULL/.test(
        DDL_ZK
      )
    ).toBe(true);
  });

  it('claims tiene columna zk_rule_hash (regla ZK opcional, Atreus)', () => {
    expect(/zk_rule_hash\s+TEXT/.test(DDL_ZK)).toBe(true);
  });

  it('users tiene columnas nullifier_id y zk_kyc_approved agregadas', () => {
    expect(/nullifier_id\s+UUID\s+REFERENCES\s+zk_nullifiers\(id\)/.test(DDL_ZK)).toBe(
      true
    );
    expect(/zk_kyc_approved\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+false/.test(DDL_ZK)).toBe(
      true
    );
  });
});
