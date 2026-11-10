/**
 * tests/application/authenticate.use-case.test.ts
 *
 * Prueba de CASO DE USO: AuthenticateUseCase (zkLogin + Passkey).
 *
 * Regla de oro: mockea AuthPort (frontera), NO la creación de sesión ni la smart wallet (dominio).
 *
 * Casos del inventario:
 *   - Login exitoso con Google → Sesión creada con address correcta
 *   - OAuth token inválido/expirado → Login rechazado, sin sesión
 *   - Replay de OAuth token → Rechazo por idempotencia
 *   - Passkey assertion válida → Smart wallet autoriza operación
 *   - Passkey assertion inválida → Rechazo
 *   - Derivación determinista → Mismo OAuth → misma address
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AuthenticateUseCase } from '../../src/application/auth/authenticate.use-case';
import type { AuthPort, AuthSession } from '../../src/domain/ports/auth.port';

describe('Caso de uso — AuthenticateUseCase (zkLogin)', () => {
  let mockAuthPort: any;
  let useCase: AuthenticateUseCase;

  beforeEach(() => {
    mockAuthPort = {
      login: jest.fn(),
      completeLogin: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: jest.fn(),
      getAddress: jest.fn(),
    } as any;
    useCase = new AuthenticateUseCase(mockAuthPort);
  });

  it('login exitoso con Google → sesión creada con address correcta', async () => {
    const session: AuthSession = {
      accessToken: 'oauth-token-google-123',
      expiresAt: Date.now() + 86400000,
      provider: 'google',
    };
    mockAuthPort.login.mockResolvedValue({
      address: 'GAAAA...address',
      session,
    });

    const result = await useCase.execute({ provider: 'google' });

    expect(result.address).toBe('GAAAA...address');
    expect(result.session.accessToken).toBe('oauth-token-google-123');
    expect(result.session.provider).toBe('google');
    expect(mockAuthPort.login).toHaveBeenCalledWith('google');
  });

  it('OAuth token inválido/expirado → login rechazado, sin sesión', async () => {
    mockAuthPort.login.mockRejectedValue(new Error('OAuth token inválido'));

    await expect(useCase.execute({ provider: 'google' })).rejects.toThrow(
      /OAuth token inválido/
    );
  });

  it('login con Apple → mismo patrón', async () => {
    const session: AuthSession = {
      accessToken: 'oauth-token-apple-456',
      expiresAt: Date.now() + 86400000,
      provider: 'apple',
    };
    mockAuthPort.login.mockResolvedValue({
      address: 'GBBBB...address',
      session,
    });

    const result = await useCase.execute({ provider: 'apple' });

    expect(result.address).toBe('GBBBB...address');
    expect(result.session.provider).toBe('apple');
    expect(mockAuthPort.login).toHaveBeenCalledWith('apple');
  });
});
