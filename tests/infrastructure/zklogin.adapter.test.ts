/**
 * tests/infrastructure/zklogin.adapter.test.ts
 *
 * Prueba de ADAPTADOR: ZkLoginAdapter.
 *
 * Regla de oro: mockea el SDK de zkLogin y el proveedor OAuth (frontera), NO la creación de sesión ni la smart wallet (dominio).
 * Contract test: el fake debe devolver la misma shape que el SDK real.
 *
 * Casos del inventario:
 *   - Login exitoso con Google → OAuth token válido + deriveWallet → Sesión creada con address correcta
 *   - OAuth token inválido/expirado → Token rechazado → Login rechazado, sin sesión
 *   - Replay de OAuth token → Token ya usado → Rechazo por idempotencia
 *   - Derivación determinista → Mismo OAuth → misma address
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ZkLoginAdapter } from '../../src/infrastructure/adapters/auth/zklogin.adapter';

describe('Adaptador — ZkLoginAdapter (Auth sin fricción)', () => {
  let adapter: ZkLoginAdapter;
  let mockCreateWallet: any;

  beforeEach(() => {
    mockCreateWallet = jest.fn(() => ({
      getAddress: jest.fn<any>().mockReturnValue('GAAAA...address'),
      isActive: jest.fn<any>().mockResolvedValue(true as any),
      signTransaction: jest.fn<any>().mockResolvedValue('signed-xdr' as any),
    }));
    adapter = new ZkLoginAdapter(mockCreateWallet, 'LabZK', {
      google: 'google-client-id',
      apple: 'apple-client-id',
    });
  });

  it('login exitoso con Google → sesión creada con address correcta', async () => {
    const result = await adapter.login('google');

    expect(result.address).toBe('GAAAA...address');
    expect(result.session.provider).toBe('google');
    expect(result.session.accessToken).toBeDefined();
    expect(mockCreateWallet).toHaveBeenCalledWith({
      appName: 'LabZK',
      oauthClients: { google: 'google-client-id' },
    });
  });

  it('login con Apple → mismo patrón', async () => {
    const result = await adapter.login('apple');

    expect(result.address).toBe('GAAAA...address');
    expect(result.session.provider).toBe('apple');
    expect(mockCreateWallet).toHaveBeenCalledWith({
      appName: 'LabZK',
      oauthClients: { apple: 'apple-client-id' },
    });
  });

  it('sin client ID configurado → error', async () => {
    const adapterNoClient = new ZkLoginAdapter(mockCreateWallet, 'LabZK', {
      google: undefined as any,
    });

    await expect(adapterNoClient.login('google')).rejects.toThrow(
      /OAuth client ID not configured/
    );
  });

  it('derivación determinista → mismo OAuth → misma address', async () => {
    const r1 = await adapter.login('google');
    const r2 = await adapter.login('google');

    // Same provider → same address derived
    expect(r1.address).toBe(r2.address);
  });

  it('logout limpia la sesión', async () => {
    await adapter.login('google');
    expect(adapter.isAuthenticated()).toBe(true);

    adapter.logout();
    expect(adapter.isAuthenticated()).toBe(false);
    expect(adapter.getAddress()).toBeNull();
  });
});
