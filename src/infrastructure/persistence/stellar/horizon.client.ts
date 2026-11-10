/**
 * infrastructure/persistence/stellar/horizon.client.ts
 *
 * Cliente Stellar Horizon (testnet) para consultas on-chain.
 * Se usa para verificar estados de transacción, balances, etc.
 *
 * @stellar/stellar-sdk se instala cuando se necesite conexión real a Horizon.
 * Por ahora la clase se resuelve dinámicamente para mantener el PoC
 * sin dependencia obligatoria en tiempo de compilación.
 */

export class StellarHorizonClient {
  private readonly horizon: any;

  constructor(horizonUrl: string = 'https://horizon-testnet.stellar.org') {
    const { Horizon } = require('@stellar/stellar-sdk');
    this.horizon = new Horizon(horizonUrl);
  }

  async getAccount(address: string) {
    return this.horizon.accounts().accountId(address).call();
  }

  async getTransaction(txHash: string) {
    return this.horizon.transactions().transaction(txHash).call();
  }

  async getPaymentOperations(account: string) {
    return this.horizon.payments().forAccount(account).call();
  }
}
