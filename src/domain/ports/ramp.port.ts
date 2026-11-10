/**
 * domain/ports/ramp.port.ts
 *
 * Puerto: Off-ramp/On-ramp fiat vía anchors (Settle, Vesseo, Bitso).
 * No custodia fondos. El anchor convierte USDC → ARS y deposita en banco.
 */

export interface RampOperationInput {
  userId: string;
  anchor: string;         // 'settle' | 'vesseo' | 'bitso' | ...
  amountUsdc: string;     // Monto en USDC a retirar
  cbuCvu?: string;        // CBU/CVU para off-ramp local (ARS)
  kycNullifier?: string;  // Nullifier de Kakusho reutilizado (VCs)
}

export interface RampOperation {
  id: string;
  userId: string;
  anchor: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amountUsdc: string;
  amountArs?: string;
  cbuCvu?: string;
  createdAt: number;
  completedAt?: number;
}

export interface RampPort {
  /**
   * Solicita off-ramp fiat (USDC → ARS → banco local).
   */
  offRampFiat(input: RampOperationInput): Promise<RampOperation>;

  /**
   * Consulta el estado de una operación de rampa.
   */
  getRampStatus(operationId: string): Promise<RampOperation | null>;
}
