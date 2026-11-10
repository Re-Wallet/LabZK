/**
 * infrastructure/persistence/stellar/horizon.client.ts
 *
 * Cliente Stellar Horizon (testnet) para consultas on-chain.
 * Carga @stellar/stellar-sdk de forma dinámica (ESM) para evitar problemas
 * de interop CommonJS/ESM con tsx.
 */

export class StellarHorizonClient {
  private readonly horizon: any;

  constructor(horizonUrl: string = 'https://horizon-testnet.stellar.org') {
    try {
      const stellarSdk = require('@stellar/stellar-sdk');
      const Horizon = stellarSdk.Horizon ?? stellarSdk.default?.Horizon;
      if (!Horizon) {
        throw new Error('@stellar/stellar-sdk no expuso Horizon');
      }
      this.horizon = new Horizon(horizonUrl);
    } catch (err) {
      console.warn(
        '⚠️  StellarHorizonClient no pudo inicializarse (SDK no disponible):',
        err instanceof Error ? err.message : String(err)
      );
      this.horizon = null;
    }
  }

  async getAccount(address: string) {
    if (!this.horizon) throw new Error('Horizon no disponible');
    return this.horizon.accounts().accountId(address).call();
  }

  async getTransaction(txHash: string) {
    if (!this.horizon) throw new Error('Horizon no disponible');
    return this.horizon.transactions().transaction(txHash).call();
  }

  async getPaymentOperations(account: string) {
    if (!this.horizon) throw new Error('Horizon no disponible');
    return this.horizon.payments().forAccount(account).call();
  }
}
