/**
 * domain/ports/path-payment.port.ts
 *
 * Puerto: Conversión atómica de activos (Path Payment).
 * Ruta: ARST (peso digital) → XLM → USDC o directo ARST → USDC.
 * Invariante: atómico — o se completa toda la ruta, o falla por entero.
 */

export interface PathPaymentInput {
  sendAsset: string;      // Activo de origen (ej. 'ARST')
  sendAmount: string;     // Monto a enviar
  destAsset: string;      // Activo de destino (ej. 'USDC')
  destMin: string;        // Mínimo de destino (protección contra slippage)
  destination: string;    // Dirección Stellar del destinatario
}

export interface PathPaymentResult {
  success: boolean;
  txHash?: string;
  sendAmount?: string;
  destAmount?: string;
  route?: string[];       // Ruta de activos usada (ej. ['ARST', 'XLM', 'USDC'])
  reason?: string;
}

export interface PathPaymentPort {
  /**
   * Ejecuta conversión atómica ARS digital → USDC.
   */
  convert(input: PathPaymentInput): Promise<PathPaymentResult>;
}
