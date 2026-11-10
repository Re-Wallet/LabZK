/**
 * infrastructure/adapters/auth/zklogin.adapter.ts
 *
 * Adaptador: zkLogin (@stellar-zklogin/sdk v2.0.0).
 * Implementa AuthPort. Login social (Google/Apple) → smart wallet de Soroban.
 *
 * API oficial documentada (npm registry):
 *   import { createWallet } from '@stellar-zklogin/sdk'
 *   const wallet = createWallet({ appName: 'My dApp', oauthClients: { google: 'YOUR_ID' } })
 *   const account = await wallet.connect('google')
 *   console.log('Logged in:', account.address)
 *
 * Características:
 *   - 3-Line Integration
 *   - Zero Wallet Extensions
 *   - Social Login (Google, Apple)
 *   - Auto Persistence (IndexedDB)
 *   - Full Soroban Support
 *   - X-Ray Protocol (BN254 + Poseidon, CAP-0074/75)
 *
 * Advertencia: testnet/beta, no auditado. No usar con fondos reales.
 */

import type { AuthPort, AuthSession, AuthProvider } from '../../../domain/ports/auth.port.js';
import { createWallet } from '@stellar-zklogin/sdk';

export class ZkLoginAdapter implements AuthPort {
  private wallet: ReturnType<typeof createWallet> | null = null;
  private session: AuthSession | null = null;

  constructor(
    private readonly appName: string,
    private readonly oauthClients: { google?: string; apple?: string }
  ) {}

  async login(provider: AuthProvider): Promise<{ address: string; session: AuthSession }> {
    const clientId = provider === 'google' ? this.oauthClients.google : this.oauthClients.apple;
    if (!clientId) {
      throw new Error(`OAuth client ID not configured for ${provider}`);
    }

    this.wallet = createWallet({
      appName: this.appName,
      oauthClients: { [provider]: clientId },
    });

    // zkLogin connect convierte el OAuth JWT en prueba ZK y deriva el smart wallet
    const account = await this.wallet.connect(provider);
    const address = account.address;

    const session: AuthSession = {
      accessToken: `zklogin_${provider}_${Date.now()}`,
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
    // El SDK maneja el redirect de OAuth internamente
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
