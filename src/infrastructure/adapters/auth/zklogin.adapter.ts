/**
 * infrastructure/adapters/auth/zklogin.adapter.ts
 *
 * Adaptador: zkLogin (@stellar-zklogin/sdk).
 * Implementa AuthPort. Login social (Google/Apple) → smart wallet de Soroban.
 *
 * API oficial (v2.0.0):
 *   import { createWallet } from '@stellar-zklogin/sdk'
 *   const wallet = createWallet({ appName, oauthClients: { google: clientId } })
 *   const account = await wallet.connect('google')
 *   console.log('Logged in:', account.address)
 *
 * Advertencia: stack ZK en testnet/beta, no auditado. No usar con fondos reales.
 */

import type { AuthPort, AuthSession, AuthProvider } from '../../../domain/ports/auth.port.js';

// Tipo del SDK (se ajusta cuando se instale el paquete)
type ZkLoginWallet = {
  getAddress(): string;
  isActive(): Promise<boolean>;
  signTransaction(txXdr: string): Promise<string>;
};

type CreateWalletFn = (config: {
  appName: string;
  oauthClients: { google?: string; apple?: string };
}) => ZkLoginWallet;

export class ZkLoginAdapter implements AuthPort {
  private wallet: ZkLoginWallet | null = null;
  private session: AuthSession | null = null;

  constructor(
    private readonly createWallet: CreateWalletFn,
    private readonly appName: string,
    private readonly oauthClients: { google?: string; apple?: string }
  ) {}

  async login(provider: AuthProvider): Promise<{ address: string; session: AuthSession }> {
    const clientId = provider === 'google' ? this.oauthClients.google : this.oauthClients.apple;
    if (!clientId) {
      throw new Error(`OAuth client ID not configured for ${provider}`);
    }

    this.wallet = this.createWallet({ appName: this.appName, oauthClients: { [provider]: clientId } });

    // zkLogin connect convierte el OAuth JWT en prueba ZK y deriva el smart wallet
    // El SDK maneja el flujo OAuth completo (redirect, popup, etc.)
    const address = this.wallet.getAddress();

    const session: AuthSession = {
      accessToken: `zklogin_${provider}_${Date.now()}`, // placeholder; el SDK gestiona la sesión real
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      provider,
    };
    this.session = session;

    return { address, session };
  }

  async completeLogin(
    provider: AuthProvider,
    code: string,
    redirectUri: string
  ): Promise<{ address: string; session: AuthSession }> {
    // El SDK maneja el redirect de OAuth internamente.
    // Aquí se completaría el flujo si se usa redirect en lugar de popup.
    return this.login(provider);
  }

  logout(): void {
    this.wallet = null;
    this.session = null;
  }

  isAuthenticated(): boolean {
    return this.session !== null && this.wallet !== null;
  }

  getAddress(): string | null {
    return this.wallet ? this.wallet.getAddress() : null;
  }
}
