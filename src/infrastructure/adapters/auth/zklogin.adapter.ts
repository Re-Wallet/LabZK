/**
 * infrastructure/adapters/auth/zklogin.adapter.ts
 *
 * Adaptador: zkLogin (@stellar-zklogin/sdk v2.0.0).
 * Implementa AuthPort. Login social (Google/Apple) → smart wallet de Soroban.
 *
 * Conecta al SDK real de zkLogin para:
 *   - Autenticación OAuth (Google/Apple) → derivación de smart wallet Soroban
 *   - Firma de transacciones Stellar/Soroban con la clave efímera del usuario
 *   - Invocación de contratos Soroban (zk_verifier, piilo_privacy, atreus_payment)
 *   - Persistencia de sesión en IndexedDB
 *
 * Advertencia: testnet/beta, no auditado. No usar con fondos reales.
 */

import type { AuthPort, AuthSession, AuthProvider } from '../../../domain/ports/auth.port.js';
import {
  createWallet,
  type ZkLoginWalletAdapter,
  type WalletConfig,
  type WalletAccount,
  type ContractCallRequest,
  type TransactionRequest,
  type SignedTransaction,
} from '@stellar-zklogin/sdk';

export interface ZkLoginAdapterConfig {
  appName: string;
  oauthClients: { google?: string; apple?: string };
  network?: 'mainnet' | 'testnet' | 'futurenet' | 'standalone';
  rpcUrl?: string;
  sessionDurationSeconds?: number;
  persistSessions?: boolean;
}

export class ZkLoginAdapter implements AuthPort {
  private wallet: ZkLoginWalletAdapter | null = null;
  private session: AuthSession | null = null;
  private readonly config: WalletConfig;
  private initialized = false;

  constructor(config: ZkLoginAdapterConfig) {
    this.config = {
      appName: config.appName,
      oauthClients: config.oauthClients,
      network: config.network ?? 'testnet',
      rpcUrl: config.rpcUrl,
      sessionDuration: config.sessionDurationSeconds,
      persistSessions: config.persistSessions ?? true,
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized && this.wallet) return;
    this.wallet = createWallet(this.config);
    await this.wallet.init();
    this.initialized = true;
  }

  async login(provider: AuthProvider): Promise<{ address: string; session: AuthSession }> {
    await this.ensureInitialized();
    if (!this.wallet) {
      throw new Error('Wallet no inicializado');
    }

    const clientId = provider === 'google' ? this.config.oauthClients?.google : this.config.oauthClients?.apple;
    if (!clientId) {
      throw new Error(`OAuth client ID not configured for ${provider}`);
    }

    // zkLogin connect convierte el OAuth JWT en prueba ZK y deriva el smart wallet
    const account: WalletAccount = await this.wallet.connect(provider);
    const address = account.address;

    const session: AuthSession = {
      accessToken: `zklogin_${provider}_${Date.now()}`,
      expiresAt: account.expiresAt ?? Date.now() + 24 * 60 * 60 * 1000,
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
    await this.ensureInitialized();
    if (!this.wallet) {
      throw new Error('Wallet no inicializado');
    }

    // El SDK maneja el redirect de OAuth internamente mediante el flujo de connect
    // El código de autorización se intercambia por el SDK
    const account: WalletAccount = await this.wallet.connect(provider);
    const address = account.address;

    const session: AuthSession = {
      accessToken: `zklogin_${provider}_${Date.now()}`,
      expiresAt: account.expiresAt ?? Date.now() + 24 * 60 * 60 * 1000,
      provider,
    };
    this.session = session;

    return { address, session };
  }

  logout(): void {
    if (this.wallet) {
      this.wallet.disconnect();
    }
    this.wallet = null;
    this.session = null;
    this.initialized = false;
  }

  isAuthenticated(): boolean {
    return this.session !== null && this.wallet?.isConnected() === true;
  }

  getAddress(): string | null {
    return this.wallet ? this.wallet.getAddress() : null;
  }

  /**
   * Obtiene la información completa de la cuenta conectada.
   */
  getAccount(): WalletAccount | null {
    return this.wallet ? this.wallet.getAccount() : null;
  }

  /**
   * Obtiene los balances de la cuenta conectada.
   */
  async getBalances(): Promise<{ asset: string; balance: string; issuer: string | null }[]> {
    if (!this.wallet) {
      throw new Error('Wallet no inicializado');
    }
    const balances = await this.wallet.getBalances();
    return balances.map((b) => ({ asset: b.asset, balance: b.balance, issuer: b.issuer }));
  }

  /**
   * Firma una transacción XDR con la clave efímera del smart wallet.
   * Devuelve el XDR firmado listo para enviar a Horizon/Soroban RPC.
   */
  async signTransaction(txXdr: string): Promise<SignedTransaction> {
    if (!this.wallet) {
      throw new Error('Wallet no inicializado');
    }
    return this.wallet.signTransaction(txXdr);
  }

  /**
   * Invoca un contrato Soroban mediante el smart wallet autenticado.
   * El SDK gestiona la autorización Soroban con la clave efímera del usuario.
   */
  async callContract(request: ContractCallRequest): Promise<unknown> {
    if (!this.wallet) {
      throw new Error('Wallet no inicializado');
    }
    return this.wallet.callContract(request);
  }

  /**
   * Envía un pago nativo o de token desde el smart wallet.
   */
  async sendPayment(request: TransactionRequest): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet no inicializado');
    }
    return this.wallet.sendPayment(request);
  }

  /**
   * Cambia de red (testnet/mainnet).
   */
  async switchNetwork(network: 'mainnet' | 'testnet' | 'futurenet' | 'standalone'): Promise<void> {
    if (!this.wallet) {
      throw new Error('Wallet no inicializado');
    }
    await this.wallet.switchNetwork(network);
  }

  /**
   * Obtiene el estado de conexión actual.
   */
  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' | 'error' {
    if (!this.wallet) return 'disconnected';
    const status = this.wallet.getStatus();
    switch (status) {
      case 'connected': return 'connected';
      case 'disconnected': return 'disconnected';
      case 'connecting': return 'connecting';
      case 'error': return 'error';
      default: return 'disconnected';
    }
  }
}
