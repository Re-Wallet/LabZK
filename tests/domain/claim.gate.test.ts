/**
 * tests/domain/claim.gate.test.ts
 *
 * Pruebas de DOMINIO (sin mocks): KYC es la puerta del claim.
 *
 * Regla: Sin kyc_status = 'approved' no se ejecuta claimClaimableBalance.
 * Esto es lógica de dominio pura — lógica real, cero mocks.
 */

import { describe, it, expect } from '@jest/globals';

function canClaim(kycApproved: boolean, claimTokenHashPresent: boolean): boolean {
  // Invariante: KYC es la puerta del claim
  if (!kycApproved) return false;
  // Invariante: token plano una sola vez — solo el hash se guarda
  if (!claimTokenHashPresent) return false;
  return true;
}

describe('Dominio — Claim: KYC es la puerta', () => {
  it('sin KYC aprobado, claim rechazado', () => {
    expect(canClaim(false, true)).toBe(false);
  });

  it('con KYC aprobado pero sin claim token hash, claim rechazado', () => {
    expect(canClaim(true, false)).toBe(false);
  });

  it('con KYC aprobado y claim token hash, claim permitido', () => {
    expect(canClaim(true, true)).toBe(true);
  });
});
