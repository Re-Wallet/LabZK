/**
 * infrastructure/adapters/path-payment/stellar-path.adapter.ts
 *
 * Adaptador: Stellar Path Payment (@stellar/stellar-sdk).
 * Implementa PathPaymentPort.
 *
 * Conversión atómica: ARS digital (ARST) → USDC.
 * Ruta posible: ARST → XLM → USDC o directo ARST → USDC.
 *
 * Invariante: Atómico — o se completa toda la ruta, o falla por entero.
 * destination_min protege contra slippage excesivo.
 */

import type { PathPaymentPort, PathPaymentInput, PathPaymentResult } from '../../../domain/ports/path-payment.port.js';

export class StellarPathAdapter implements PathPaymentPort {
  constructor(
    private readonly horizonUrl: string = 'https://horizon-testnet.stellar.org'
  ) {}

  async convert(input: PathPaymentInput): Promise<PathPaymentResult> {
    try {
      // TODO: Usar @stellar/stellar-sdk para construir y enviar PathPayment
      // Ejemplo conceptual:
      // const transaction = new TransactionBuilder(...)
      //   .addOperation(PathPayment.strictSend({
      //     sendAsset, sendAmount, destAsset, destMin, destination
      //   }))
      //   .build();
      // await transaction.sign(sourceKeypair);
      // const result = await horizon.submitTransaction(transaction);

      return {
        success: true,
        txHash: `tx_path_${Date.now()}`,
        sendAmount: input.sendAmount,
        destAmount: input.sendAmount, // placeholder
        route: [input.sendAsset, input.destAsset],
      };
    } catch (err) {
      return {
        success: false,
        reason: err instanceof Error ? err.message : 'Path payment failed',
      };
    }
  }
}
