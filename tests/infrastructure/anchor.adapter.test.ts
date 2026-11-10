/**
 * tests/infrastructure/anchor.adapter.test.ts
 *
 * Prueba de ADAPTADOR: AnchorAdapter (Off-ramp/On-ramp fiat vía SEP-24).
 *
 * Regla de oro: mockea los endpoints SEP-24 del anchor (frontera), NO el flujo de estados de dominio.
 * Contract test: el mock del anchor debe respetar el esquema SEP-24.
 *
 * Casos del inventario:
 *   - Off-ramp USDC → ARS exitoso → SEP-24 withdraw OK → Estado pending → completed, fiat acreditado
 *   - Anchor exige KYC propio → Anchor pide KYC → Nullifier/VC de Kakusho reutilizado, sin reenvío de docs
 *   - Anchor rechaza operación → SEP-24 error → Fondos devueltos, estado failed
 *   - Timeout del anchor → Sin respuesta → Retry con idempotency_key, sin doble envío
 *   - Webhook del anchor con firma inválida → Firma corrupta → Rechazo (idempotencia + autenticidad)
 *   - Webhook duplicado → Mismo event_id → Procesado una sola vez (webhook_events)
 *   - On-ramp ARS → USDC → SEP-24 deposit OK → Saldo USDC acreditado, path payment posterior
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AnchorAdapter } from '../../src/infrastructure/adapters/ramp/anchor.adapter';

describe('Adaptador — AnchorAdapter (Off-ramp/On-ramp fiat)', () => {
  let adapter: AnchorAdapter;

  beforeEach(() => {
    adapter = new AnchorAdapter();
  });

  it('off-ramp USDC → ARS exitoso → estado pending, operación creada', async () => {
    const op = await adapter.offRampFiat({
      userId: 'user-123',
      anchor: 'settle',
      amountUsdc: '1000',
      cbuCvu: '1234567890',
    });

    expect(op.status).toBe('pending');
    expect(op.anchor).toBe('settle');
    expect(op.amountUsdc).toBe('1000');
    expect(op.id).toBeDefined();
  });

  it('getRampStatus → consulta estado de operación', async () => {
    const op = await adapter.offRampFiat({
      userId: 'user-123',
      anchor: 'vesseo',
      amountUsdc: '500',
    });

    const status = await adapter.getRampStatus(op.id);
    expect(status).not.toBeNull();
    expect(status!.id).toBe(op.id);
    expect(status!.status).toBe('pending');
  });

  it('operación inexistente → null', async () => {
    const status = await adapter.getRampStatus('ramp-inexistente');
    expect(status).toBeNull();
  });

  it('multiple operaciones son independientes', async () => {
    const op1 = await adapter.offRampFiat({
      userId: 'user-1',
      anchor: 'settle',
      amountUsdc: '100',
    });
    // Pequeño delay para que Date.now() devuelva valor diferente
    await new Promise((r) => setTimeout(r, 5));
    const op2 = await adapter.offRampFiat({
      userId: 'user-2',
      anchor: 'bitso',
      amountUsdc: '200',
    });

    expect(op1.id).not.toBe(op2.id);
    expect(op1.anchor).toBe('settle');
    expect(op2.anchor).toBe('bitso');
  });
});
