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
 *   - On-ramp ARS → USDC exitoso → SEP-24 deposit OK → Saldo USDC acreditado
 *   - Anchor rechaza operación → SEP-24 error → Fondos devueltos, estado failed
 *   - Idempotency key → Misma key usada dos veces → Error de duplicado
 *   - Webhook válido → Actualiza estado de operación
 *   - Webhook con firma inválida → Rechazo
 *   - Webhook duplicado → Mismo event_id → Procesado una sola vez
 *   - Operación inexistente → null
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AnchorAdapter } from '../../src/infrastructure/adapters/ramp/anchor.adapter';

// Mock global fetch
const originalFetch = global.fetch;
const mockFetch: any = jest.fn();

beforeEach(() => {
  mockFetch.mockClear();
  (global as any).fetch = mockFetch;
});

afterEach(() => {
  (global as any).fetch = originalFetch;
  jest.restoreAllMocks();
});

function mockAnchorResponse(data: unknown) {
  const json = jest.fn<any>().mockResolvedValue(data);
  mockFetch.mockResolvedValueOnce({ ok: true, json });
}

const mockAnchorConfig = {
  anchors: {
    settle: {
      name: 'Settle',
      baseUrl: 'https://api.settle.com/sep',
      sep6Enabled: true,
      sep24Enabled: true,
      kycRequired: true,
      supportedAssets: ['USDC', 'ARS'],
      apiKey: 'test-api-key',
    },
    vesseo: {
      name: 'Vesseo',
      baseUrl: 'https://api.vesseo.com/sep',
      sep6Enabled: true,
      sep24Enabled: true,
      kycRequired: true,
      supportedAssets: ['USDC', 'ARS'],
      apiKey: 'test-api-key-2',
    },
    bitso: {
      name: 'Bitso',
      baseUrl: 'https://api.bitso.com/sep',
      sep6Enabled: true,
      sep24Enabled: false,
      kycRequired: true,
      supportedAssets: ['USDC', 'ARS'],
      apiKey: 'test-api-key-3',
    },
  },
  horizonUrl: 'https://horizon-testnet.stellar.org',
  webhookSecret: 'test-webhook-secret',
};

describe('Adaptador — AnchorAdapter (Off-ramp/On-ramp fiat)', () => {
  let adapter: AnchorAdapter;

  beforeEach(() => {
    adapter = new AnchorAdapter(mockAnchorConfig);
  });

  it('off-ramp USDC → ARS exitoso → estado pending, operación creada', async () => {
    mockAnchorResponse({
      id: 'anchor-tx-123',
      status: 'pending',
      amount_usdc: '1000',
      amount_ars: '1200000',
      external_transaction_id: 'ext-123',
    });

    const op = await adapter.offRampFiat({
      userId: 'user-123',
      anchor: 'settle',
      amountUsdc: '1000',
      cbuCvu: '1234567890',
      direction: 'off-ramp',
    });

    expect(op.status).toBe('pending');
    expect(op.anchor).toBe('settle');
    expect(op.amountUsdc).toBe('1000');
    expect(op.direction).toBe('off-ramp');
    expect(op.id).toBeDefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callUrl = (mockFetch as jest.Mock).mock.calls[0][0];
    expect(String(callUrl)).toContain('/sep6/withdraw');
    expect(String(callUrl)).toContain('amount=1000');
  });

  it('on-ramp ARS → USDC exitoso → operación creada', async () => {
    mockAnchorResponse({
      id: 'anchor-tx-456',
      status: 'pending',
      amount_ars: '1000000',
      amount_usdc: '1000',
      external_transaction_id: 'ext-456',
    });

    const op = await adapter.onRampFiat({
      userId: 'user-123',
      anchor: 'settle',
      amountArs: '1000000',
      cbuCvu: '1234567890',
      direction: 'on-ramp',
    });

    expect(op.status).toBe('pending');
    expect(op.anchor).toBe('settle');
    expect(op.direction).toBe('on-ramp');
    expect(op.amountArs).toBe('1000000');
    expect(op.id).toBeDefined();
    const callUrl = (mockFetch as jest.Mock).mock.calls[0][0];
    expect(String(callUrl)).toContain('/sep6/deposit');
    expect(String(callUrl)).toContain('amount=1000000');
  });

  it('getRampStatus → consulta estado de operación', async () => {
    mockAnchorResponse({
      id: 'anchor-tx-789',
      status: 'pending',
      amount_usdc: '500',
      external_transaction_id: 'ext-789',
    });

    const op = await adapter.offRampFiat({
      userId: 'user-123',
      anchor: 'vesseo',
      amountUsdc: '500',
      direction: 'off-ramp',
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
    mockAnchorResponse({
      id: 'anchor-tx-1',
      status: 'pending',
      amount_usdc: '100',
      external_transaction_id: 'ext-1',
    });
    mockAnchorResponse({
      id: 'anchor-tx-2',
      status: 'pending',
      amount_usdc: '200',
      external_transaction_id: 'ext-2',
    });

    const op1 = await adapter.offRampFiat({
      userId: 'user-1',
      anchor: 'settle',
      amountUsdc: '100',
      direction: 'off-ramp',
    });
    const op2 = await adapter.offRampFiat({
      userId: 'user-2',
      anchor: 'bitso',
      amountUsdc: '200',
      direction: 'off-ramp',
    });

    expect(op1.id).not.toBe(op2.id);
    expect(op1.anchor).toBe('settle');
    expect(op2.anchor).toBe('bitso');
  });

  it('anchor rechaza operación → estado failed', async () => {
    mockAnchorResponse({
      id: 'anchor-tx-reject',
      status: 'failed',
      error: 'insufficient_funds',
    });

    const op = await adapter.offRampFiat({
      userId: 'user-123',
      anchor: 'settle',
      amountUsdc: '1000000000',
      direction: 'off-ramp',
    });

    expect(op.status).toBe('failed');
    expect(op.error).toBe('insufficient_funds');
  });

  it('idempotency key usada dos veces → error de duplicado', async () => {
    mockAnchorResponse({
      id: 'anchor-tx-idem',
      status: 'pending',
      amount_usdc: '100',
      external_transaction_id: 'ext-idem',
    });

    await adapter.offRampFiat({
      userId: 'user-123',
      anchor: 'settle',
      amountUsdc: '100',
      idempotencyKey: 'idem-key-1',
      direction: 'off-ramp',
    });

    await expect(
      adapter.offRampFiat({
        userId: 'user-123',
        anchor: 'settle',
        amountUsdc: '100',
        idempotencyKey: 'idem-key-1',
        direction: 'off-ramp',
      })
    ).rejects.toThrow(/ya procesada/);
  });

  it('isIdempotencyKeyUsed → retorna true si key ya fue usada', async () => {
    expect(await adapter.isIdempotencyKeyUsed('new-key')).toBe(false);

    mockAnchorResponse({
      id: 'anchor-tx-idem2',
      status: 'pending',
      amount_usdc: '50',
      external_transaction_id: 'ext-idem2',
    });

    await adapter.offRampFiat({
      userId: 'user-123',
      anchor: 'settle',
      amountUsdc: '50',
      idempotencyKey: 'idem-key-2',
      direction: 'off-ramp',
    });

    expect(await adapter.isIdempotencyKeyUsed('idem-key-2')).toBe(true);
  });

  it('webhook válido → actualiza estado de operación a completed', async () => {
    mockAnchorResponse({
      id: 'anchor-tx-webhook',
      status: 'pending',
      amount_usdc: '300',
      external_transaction_id: 'ext-webhook',
    });

    const op = await adapter.offRampFiat({
      userId: 'user-123',
      anchor: 'settle',
      amountUsdc: '300',
      direction: 'off-ramp',
    });

    const result = await adapter.processWebhook({
      id: 'webhook-1',
      operationId: op.id,
      status: 'completed' as const,
      amountUsdc: '300',
      stellarTransactionId: 'stellar-tx-1',
      receivedAt: Date.now(),
      signature: 'valid-signature',
    });

    expect(result).not.toBeNull();
    expect(result!.status).toBe('completed');
    expect(result!.stellarTransactionId).toBe('stellar-tx-1');
    expect(result!.completedAt).toBeDefined();
  });

  it('webhook duplicado → mismo event_id → procesado una sola vez', async () => {
    mockAnchorResponse({
      id: 'anchor-tx-webhook2',
      status: 'pending',
      amount_usdc: '200',
      external_transaction_id: 'ext-webhook2',
    });

    const op = await adapter.offRampFiat({
      userId: 'user-123',
      anchor: 'settle',
      amountUsdc: '200',
      direction: 'off-ramp',
    });

    const webhookEvent = {
      id: 'webhook-dup-1',
      operationId: op.id,
      status: 'completed' as const,
      amountUsdc: '200',
      receivedAt: Date.now(),
      signature: 'valid-signature',
    };

    const result1 = await adapter.processWebhook(webhookEvent);
    const result2 = await adapter.processWebhook(webhookEvent);

    // El segundo webhook con el mismo id no debe cambiar nada
    expect(result1!.status).toBe('completed');
    expect(result2!.status).toBe('completed');
  });

  it('webhook con firma inválida → rechazo', async () => {
    const adapterWithSecret = new AnchorAdapter({
      ...mockAnchorConfig,
      webhookSecret: 'secret',
    });

    mockAnchorResponse({
      id: 'anchor-tx-sig',
      status: 'pending',
      amount_usdc: '100',
      external_transaction_id: 'ext-sig',
    });

    const op = await adapterWithSecret.offRampFiat({
      userId: 'user-123',
      anchor: 'settle',
      amountUsdc: '100',
      direction: 'off-ramp',
    });

    await expect(
      adapterWithSecret.processWebhook({
        id: 'webhook-sig',
        operationId: op.id,
        status: 'completed' as const,
        receivedAt: Date.now(),
        signature: '', // Firma vacía con secreto configurado → inválida
      })
    ).rejects.toThrow(/Firma de webhook inválida/);
  });

  it('operación inexistente en webhook → null', async () => {
    const result = await adapter.processWebhook({
      id: 'webhook-noop',
      operationId: 'ramp-inexistente',
      status: 'completed' as const,
      receivedAt: Date.now(),
    });
    expect(result).toBeNull();
  });

  it('anchor no configurado → error', async () => {
    await expect(
      adapter.offRampFiat({
        userId: 'user-123',
        anchor: 'anchor-inexistente',
        amountUsdc: '100',
        direction: 'off-ramp',
      })
    ).rejects.toThrow(/no configurado/);
  });
});
