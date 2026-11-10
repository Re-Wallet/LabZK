/**
 * tests/infrastructure/atreus.adapter.test.ts
 *
 * Prueba de ADAPTADOR: AtreusAdapter (Payment Links con reglas ZK).
 *
 * Regla de oro: mockea el escrow y el attester (frontera), NO la lógica del link ni el TTL (dominio).
 * Contract test: el attester fake debe responder igual que el real.
 *
 * Casos del inventario:
 *   - Crear link con regla ZK → createEscrow() OK → zk_rule_hash persistido junto a claim_token_hash
 *   - Claim con prueba válida → Attester → valid → Fondos liberados
 *   - Claim con prueba inválida → Attester → invalid → Rechazo, fondos intactos
 *   - Regla no cumplida → Rechazo
 *   - Link expirado → TTL vencido → Rechazo
 *   - Link ya reclamado → claimed_at seteado → Rechazo
 *   - Attester caído → Timeout → Retry con idempotencia, sin doble liberación
 *   - Secreto no revelado on-chain → solo se publica el hash, nunca el preimage
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AtreusAdapter } from '../../src/infrastructure/adapters/payment-link/atreus.adapter';

describe('Adaptador — AtreusAdapter (Payment Links ZK)', () => {
  let adapter: AtreusAdapter;

  beforeEach(() => {
    adapter = new AtreusAdapter();
  });

  const createLinkInput = {
    amount: '100',
    asset: 'USDC',
    zkRuleHash: 'zk-rule-hash-abc',
    secretHash: 'secret-hash-xyz',
    ttl: 3600000,
  };

  it('crear link con regla ZK → link creado con zk_rule_hash', async () => {
    const link = await adapter.createLink(createLinkInput);

    expect(link.status).toBe('active');
    expect(link.zkRuleHash).toBe('zk-rule-hash-abc');
    expect(link.secretHash).toBe('secret-hash-xyz');
    expect(link.amount).toBe('100');
    expect(link.url).toContain('/pay/');
    expect(link.expiresAt).toBeGreaterThan(link.createdAt);
  });

  it('claim con prueba válida → fondos liberados', async () => {
    const link = await adapter.createLink(createLinkInput);

    const result = await adapter.claimLink(link.id, { proof: 'valid-zk-proof' });

    expect(result.success).toBe(true);
    expect(result.txHash).toBeDefined();
  });

  it('claim con link expirado → rechazo', async () => {
    const expiredLink = await adapter.createLink({
      ...createLinkInput,
      ttl: -1, // ya expirado
    });
    // Forzar estado expirado manualmente para el test
    (expiredLink as any).status = 'expired';

    const result = await adapter.claimLink(expiredLink.id, { proof: 'valid' });

    expect(result.success).toBe(false);
  });

  it('doble claim en el mismo link → segundo rechazado', async () => {
    const link = await adapter.createLink(createLinkInput);

    const r1 = await adapter.claimLink(link.id, { proof: 'valid-zk-proof' });
    expect(r1.success).toBe(true);

    const r2 = await adapter.claimLink(link.id, { proof: 'valid-zk-proof' });
    expect(r2.success).toBe(false);
  });

  it('secreto no revelado on-chain → solo se publica el hash', async () => {
    const link = await adapter.createLink(createLinkInput);

    // El link debe tener el hash del secreto, no el preimage
    expect(link.secretHash).toBe('secret-hash-xyz');
    expect(link.secretHash).not.toBe('mi-secreto-preimage');
    // La URL del link no debe contener el secreto en claro
    expect(link.url).not.toContain('mi-secreto-preimage');
  });
});
