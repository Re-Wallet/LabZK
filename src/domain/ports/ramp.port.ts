/**
 * domain/ports/ramp.port.ts
 *
 * Puerto: Off-ramp/On-ramp fiat vía anchors (Settle, Vesseo, Bitso).
 * No custodia fondos. El anchor convierte USDC → ARS y deposita en banco.
 *
 * Soporta SEP-6 (deposit/withdraw) y SEP-24 (interactive deposit/withdraw flow).
 */

export type RampDirection = 'on-ramp' | 'off-ramp';

export interface RampOperationInput {
  userId: string;
  anchor: string;            // 'settle' | 'vesseo' | 'bitso' | ...
  direction: RampDirection;  // 'on-ramp' (ARS→USDC) o 'off-ramp' (USDC→ARS)
  amountUsdc?: string;       // Monto en USDC (requerido para off-ramp)
  amountArs?: string;        // Monto en ARS (requerido para on-ramp)
  cbuCvu?: string;           // CBU/CVU para off-ramp local (ARS)
  kycNullifier?: string;     // Nullifier de Kakusho reutilizado (VCs)
  idempotencyKey?: string;   // Clave de idempotencia para evitar duplicados
}

export interface RampOperation {
  id: string;
  userId: string;
  anchor: string;
  direction: RampDirection;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amountUsdc?: string;
  amountArs?: string;
  cbuCvu?: string;
  kycNullifier?: string;
  idempotencyKey?: string;
  anchorTransactionId?: string;  // ID de transacción en el anchor
  stellarTransactionId?: string; // ID de transacción en Stellar (USDC transfer)
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  error?: string;
}

export interface RampWebhookEvent {
  id: string;                // ID del evento del anchor
  operationId: string;       // ID de operación interna
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amountUsdc?: string;
  amountArs?: string;
  stellarTransactionId?: string;
  externalTransactionId?: string; // ID en el anchor
  receivedAt: number;
  signature?: string;        // Firma del webhook para verificar autenticidad
}

export interface RampPort {
  /**
   * Solicita off-ramp fiat (USDC → ARS → banco local).
   * Inicia un withdrawal SEP-6/SEP-24 con el anchor.
   */
  offRampFiat(input: RampOperationInput): Promise<RampOperation>;

  /**
   * Solicita on-ramp fiat (ARS → USDC → wallet Stellar).
   * Inicia un deposit SEP-6/SEP-24 con el anchor.
   */
  onRampFiat(input: RampOperationInput): Promise<RampOperation>;

  /**
   * Consulta el estado de una operación de rampa.
   */
  getRampStatus(operationId: string): Promise<RampOperation | null>;

  /**
   * Procesa un webhook del anchor (SEP-24 notification).
   * Verifica firma, valida idempotencia y actualiza estado.
   */
  processWebhook(event: RampWebhookEvent): Promise<RampOperation | null>;

  /**
   * Verifica si una idempotencyKey ya fue procesada.
   */
  isIdempotencyKeyUsed(idempotencyKey: string): Promise<boolean>;
}
