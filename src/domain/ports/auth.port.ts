/**
 * domain/ports/auth.port.ts
 *
 * Puerto: Autenticación sin fricción (zkLogin / Passkey).
 * Adaptador: ZkLoginAdapter (@stellar-zklogin/sdk).
 */

export type AuthProvider = 'google' | 'apple';

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  provider: AuthProvider;
}

export interface AuthPort {
  /**
   * Inicia sesión con proveedor OAuth social (Google/Apple).
   * Deriva smart wallet de Soroban sin seed phrase.
   */
  login(provider: AuthProvider): Promise<{ address: string; session: AuthSession }>;

  /**
   * Completa el flujo OAuth después del redirect.
   */
  completeLogin(
    provider: AuthProvider,
    code: string,
    redirectUri: string
  ): Promise<{ address: string; session: AuthSession }>;

  /**
   * Cierra sesión y limpia la sesión local.
   */
  logout(): void;

  /**
   * Verifica si hay una sesión activa.
   */
  isAuthenticated(): boolean;

  /**
   * Obtiene la dirección Stellar del usuario autenticado.
   */
  getAddress(): string | null;
}
