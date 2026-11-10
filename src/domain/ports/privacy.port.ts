/**
 * domain/ports/privacy.port.ts
 *
 * Puerto: Privacidad de montos (Piilo, fase 1).
 * Oculta montos y saldos con compromisos de Pedersen + Groth16.
 * Las direcciones permanecen públicas para compliance AML/KYC.
 */

export interface DepositInput {
  amount: bigint; // stroops del activo (ej. XLM, USDC)
}

export interface TransferPrivateInput {
  to: string;             // Dirección Stellar del destinatario (pública)
  amount: bigint;         // Monto oculto (commitment)
}

export interface PrivacyResult {
  success: boolean;
  txHash?: string;
  reason?: string;
}

export interface PrivacyPort {
  /**
   * Deposita fondos en modo confidencial (Pedersen commitment).
   * El monto es visible on-chain pero queda como commitment.
   */
  deposit(input: DepositInput): Promise<PrivacyResult>;

  /**
   * Transfiere valor privadamente. Genera Groth16 proof client-side.
   * El destinatario recibe una nota privada en el pool.
   */
  transferPrivate(input: TransferPrivateInput): Promise<PrivacyResult>;

  /**
   * Asienta transferencias pendientes (descifra y procesa notas entrantes).
   */
  settlePending(): Promise<{ received: bigint } | null>;

  /**
   * Sale del modo confidencial: revela balance y retira fondos.
   */
  withdraw(): Promise<PrivacyResult>;

  /**
   * Obtiene el balance local (plaintext, solo el dueño lo ve).
   */
  getBalance(): Promise<bigint>;
}
