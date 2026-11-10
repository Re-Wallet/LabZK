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
 *   - Sin client ID configurado → error de configuración
 *   - Derivación determinista → Mismo OAuth → misma address
 *   - Logout limpia la sesión
 *   - signTransaction firma un XDR con la clave efímera
 *   - callContract invoca un contrato Soroban
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ZkLoginAdapter } from '../../src/infrastructure/adapters/auth/zklogin.adapter';

// Mock automático del SDK de zkLogin (sin factory que referencia 'jest')
jest.mock('@stellar-zklogin/sdk');

const { createWallet } = require('@stellar-zklogin/sdk');

describe('Adaptador — ZkLoginAdapter (Auth sin fricción)', () => {
  let adapter: ZkLoginAdapter;
  let mockWallet: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWallet = {
      init: jest.fn<any>().mockResolvedValue(undefined),
      connect: jest.fn<any>().mockResolvedValue({
        address: 'GAAAA...address',
        provider: 'google',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      }),
      getAddress: jest.fn<any>().mockReturnValue('GAAAA...address'),
      getAccount: jest.fn<any>().mockReturnValue({
        address: 'GAAAA...address',
        provider: 'google',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      }),
      isConnected: jest.fn<any>().mockReturnValue(true),
      getStatus: jest.fn<any>().mockReturnValue('connected'),
      disconnect: jest.fn<any>().mockResolvedValue(undefined),
      getBalances: jest.fn<any>().mockResolvedValue([]),
      signTransaction: jest.fn<any>().mockResolvedValue({ xdr: 'signed-xdr', hash: 'hash', networkPassphrase: 'testnet' }),
      callContract: jest.fn<any>().mockResolvedValue({ result: true }),
      sendPayment: jest.fn<any>().mockResolvedValue('tx-hash'),
      switchNetwork: jest.fn<any>().mockResolvedValue(undefined),
    };
    (createWallet as jest.Mock).mockImplementation(() => mockWallet);
    adapter = new ZkLoginAdapter({
      appName: 'LabZK',
      oauthClients: {
        google: 'google-client-id',
        apple: 'apple-client-id',
      },
    });
  });

  it('login exitoso con Google → sesión creada con address correcta', async () => {
    const result = await adapter.login('google');

    expect(result.address).toBe('GAAAA...address');
    expect(result.session.provider).toBe('google');
    expect(result.session.accessToken).toBeDefined();
    expect(createWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        appName: 'LabZK',
        network: 'testnet',
        persistSessions: true,
        oauthClients: expect.objectContaining({
          google: 'google-client-id',
        }),
      })
    );
    expect(mockWallet.init).toHaveBeenCalled();
    expect(mockWallet.connect).toHaveBeenCalledWith('google');
  });

  it('login con Apple → mismo patrón', async () => {
    const result = await adapter.login('apple');

    expect(result.address).toBe('GAAAA...address');
    expect(result.session.provider).toBe('apple');
    expect(mockWallet.connect).toHaveBeenCalledWith('apple');
  });

  it('sin client ID configurado → error', async () => {
    const adapterNoClient = new ZkLoginAdapter({
      appName: 'LabZK',
      oauthClients: {
        google: undefined as unknown as string,
      },
    });

    await expect(adapterNoClient.login('google')).rejects.toThrow(
      /OAuth client ID not configured/
    );
  });

  it('derivación determinista → mismo OAuth → misma address', async () => {
    const r1 = await adapter.login('google');
    const r2 = await adapter.login('google');

    // Same provider → same address derived (mock returns same)
    expect(r1.address).toBe(r2.address);
  });

  it('logout limpia la sesión', async () => {
    await adapter.login('google');
    expect(adapter.isAuthenticated()).toBe(true);

    adapter.logout();
    expect(adapter.isAuthenticated()).toBe(false);
    expect(adapter.getAddress()).toBeNull();
    expect(mockWallet.disconnect).toHaveBeenCalled();
  });

  it('signTransaction firma un XDR con la clave efímera', async () => {
    await adapter.login('google');
    const signed = await adapter.signTransaction('dummy-xdr');
    expect(signed.xdr).toBe('signed-xdr');
    expect(mockWallet.signTransaction).toHaveBeenCalledWith('dummy-xdr');
  });

  it('callContract invoca un contrato Soroban', async () => {
    await adapter.login('google');
    const result = await adapter.callContract({
      contract: 'CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT',
      method: 'verify_proof',
      args: [],
    });
    expect(result).toEqual({ result: true });
    expect(mockWallet.callContract).toHaveBeenCalled();
  });
});
