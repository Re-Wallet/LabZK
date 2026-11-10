/**
 * application/path-payment/convert-assets.use-case.ts
 *
 * Caso de uso: Conversión atómica ARS digital → USDC (Path Payment).
 *
 * Invariante: Atómico — o se completa toda la ruta, o falla por entero.
 * Ruta posible: ARST → XLM → USDC o directo ARST → USDC.
 */

import type { PathPaymentPort } from '../../domain/ports/path-payment.port.js';

export interface ConvertAssetsInput {
  sendAsset: string;   // 'ARST'
  sendAmount: string;
  destAsset: string;   // 'USDC'
  destMin: string;     // Protección contra slippage
  destination: string; // Dirección Stellar del destinatario
}

export class ConvertAssetsUseCase {
  constructor(private readonly pathPaymentPort: PathPaymentPort) {}

  async execute(input: ConvertAssetsInput) {
    return this.pathPaymentPort.convert(input);
  }
}
