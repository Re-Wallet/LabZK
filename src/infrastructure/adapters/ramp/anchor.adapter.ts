/**
 * infrastructure/adapters/ramp/anchor.adapter.ts
 *
 * Adaptador: Anchor Platform (SEP-6 / SEP-24).
 * Implementa RampPort. Off-ramp/On-ramp fiat vía anchors (Settle, Vesseo, Bitso).
 *
 * Integra con la API del anchor para:
 *   - SEP-6/SEP-24 withdraw (off-ramp: USDC → ARS → banco local)
 *   - SEP-6/SEP-24 deposit (on-ramp: ARS → USDC → wallet Stellar)
 *   - Consulta de estado de operaciones
 *   - Webhooks del anchor (notificaciones de cambio de estado)
 *   - Idempotencia mediante idempotency_key
 *
 * No custodia fondos. El anchor convierte USDC ↔ ARS y deposita/retira en banco local (CBU/CVU).
 * Puede reutilizar el nullifier de Kakusho (vía VCs) para reducir fricción KYC.
 *
 * Advertencia: anchors tienen requisitos regulatorios propios.
 */

import type {
  RampPort,
  RampOperation,
  RampOperationInput,
  RampWebhookEvent,
  RampDirection,
} from '../../../domain/ports/ramp.port.js';

export interface AnchorConfig {
  anchors: Record<string, AnchorEndpoint>;
  horizonUrl: string;
  usdcIssuer?: string;       // Address del emisor USDC en Stellar
  usdcDistributionPublicKey?: string; // Clave de distribución del anchor
  webhookSecret?: string;    // Secreto para verificar firmas de webhook
}

export interface AnchorEndpoint {
  name: string;
  baseUrl: string;           // https://api.settle.com/sep, etc.
  sep6Enabled: boolean;
  sep24Enabled: boolean;
  kycRequired: boolean;
  supportedAssets: string[]; // ['USDC', 'ARS', ...]
  apiKey?: string;
}

interface Sep6WithdrawResponse {
  id: string;
  status: string;
  amount_usdc?: string;
  amount_ars?: string;
  stellar_transaction_id?: string;
  external_transaction_id?: string;
  error?: string;
}

interface Sep6DepositResponse {
  id: string;
  status: string;
  amount_usdc?: string;
  amount_ars?: string;
  stellar_transaction_id?: string;
  external_transaction_id?: string;
  how?: string;
  error?: string;
}

interface Sep6TransactionResponse {
  id: string;
  status: string;
  amount_usdc?: string;
  amount_ars?: string;
  stellar_transaction_id?: string;
  external_transaction_id?: string;
  error?: string;
}

export class AnchorAdapter implements RampPort {
  private operations = new Map<string, RampOperation>();
  private idempotencyKeys = new Set<string>();
  private config: AnchorConfig;

  constructor(config: AnchorConfig = { anchors: {}, horizonUrl: 'https://horizon-testnet.stellar.org' }) {
    this.config = config;
  }

  /**
   * Resuelve la configuración de un anchor por nombre.
   */
  private getAnchor(anchor: string): AnchorEndpoint {
    const endpoint = this.config.anchors[anchor];
    if (!endpoint) {
      throw new Error(`Anchor no configurado: ${anchor}`);
    }
    return endpoint;
  }

  /**
   * Genera un ID único para la operación.
   */
  private generateId(): string {
    return `ramp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Solicita off-ramp fiat (USDC → ARS → banco local).
   * Inicia un withdrawal SEP-6/SEP-24 con el anchor.
   */
  async offRampFiat(input: RampOperationInput): Promise<RampOperation> {
    // Idempotencia: verificar si ya existe una operación con esta key
    if (input.idempotencyKey && await this.isIdempotencyKeyUsed(input.idempotencyKey)) {
      throw new Error(`Idempotency key ya procesada: ${input.idempotencyKey}`);
    }

    const anchor = this.getAnchor(input.anchor);
    if (!anchor.sep6Enabled && !anchor.sep24Enabled) {
      throw new Error(`Anchor ${input.anchor} no soporta SEP-6/SEP-24`);
    }

    const id = this.generateId();
    const now = Date.now();

    const operation: RampOperation = {
      id,
      userId: input.userId,
      anchor: input.anchor,
      direction: 'off-ramp',
      status: 'pending',
      amountUsdc: input.amountUsdc,
      amountArs: input.amountArs,
      cbuCvu: input.cbuCvu,
      kycNullifier: input.kycNullifier,
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };

    this.operations.set(id, operation);
    if (input.idempotencyKey) {
      this.idempotencyKeys.add(input.idempotencyKey);
    }

    try {
      // Llamar al endpoint SEP-6/SEP-24 withdraw del anchor
      const withdrawResponse = await this.callSep6Withdraw(anchor, {
        amount: input.amountUsdc!,
        asset_code: 'USDC',
        asset_issuer: this.config.usdcIssuer,
        account_id: this.getUserStellarAccount(input.userId),
        cbu_cvu: input.cbuCvu,
        kyc_nullifier: input.kycNullifier,
        idempotency_key: input.idempotencyKey,
      });

      operation.status = this.mapAnchorStatus(withdrawResponse.status);
      operation.anchorTransactionId = withdrawResponse.external_transaction_id;
      operation.stellarTransactionId = withdrawResponse.stellar_transaction_id;
      operation.amountArs = withdrawResponse.amount_ars ?? operation.amountArs;
      operation.error = withdrawResponse.error;
      operation.updatedAt = Date.now();

      if (withdrawResponse.error) {
        operation.status = 'failed';
      }

      this.operations.set(id, operation);
      return operation;
    } catch (err) {
      operation.status = 'failed';
      operation.error = err instanceof Error ? err.message : 'Error desconocido en off-ramp';
      operation.updatedAt = Date.now();
      this.operations.set(id, operation);
      throw err;
    }
  }

  /**
   * Solicita on-ramp fiat (ARS → USDC → wallet Stellar).
   * Inicia un deposit SEP-6/SEP-24 con el anchor.
   */
  async onRampFiat(input: RampOperationInput): Promise<RampOperation> {
    // Idempotencia: verificar si ya existe una operación con esta key
    if (input.idempotencyKey && await this.isIdempotencyKeyUsed(input.idempotencyKey)) {
      throw new Error(`Idempotency key ya procesada: ${input.idempotencyKey}`);
    }

    const anchor = this.getAnchor(input.anchor);
    if (!anchor.sep6Enabled && !anchor.sep24Enabled) {
      throw new Error(`Anchor ${input.anchor} no soporta SEP-6/SEP-24`);
    }

    const id = this.generateId();
    const now = Date.now();

    const operation: RampOperation = {
      id,
      userId: input.userId,
      anchor: input.anchor,
      direction: 'on-ramp',
      status: 'pending',
      amountUsdc: input.amountUsdc,
      amountArs: input.amountArs,
      cbuCvu: input.cbuCvu,
      kycNullifier: input.kycNullifier,
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };

    this.operations.set(id, operation);
    if (input.idempotencyKey) {
      this.idempotencyKeys.add(input.idempotencyKey);
    }

    try {
      // Llamar al endpoint SEP-6/SEP-24 deposit del anchor
      const depositResponse = await this.callSep6Deposit(anchor, {
        amount: input.amountArs!,
        asset_code: 'USDC',
        asset_issuer: this.config.usdcIssuer,
        account_id: this.getUserStellarAccount(input.userId),
        cbu_cvu: input.cbuCvu,
        kyc_nullifier: input.kycNullifier,
        idempotency_key: input.idempotencyKey,
      });

      operation.status = this.mapAnchorStatus(depositResponse.status);
      operation.anchorTransactionId = depositResponse.external_transaction_id;
      operation.stellarTransactionId = depositResponse.stellar_transaction_id;
      operation.amountUsdc = depositResponse.amount_usdc ?? operation.amountUsdc;
      operation.error = depositResponse.error;
      operation.updatedAt = Date.now();

      if (depositResponse.error) {
        operation.status = 'failed';
      }

      this.operations.set(id, operation);
      return operation;
    } catch (err) {
      operation.status = 'failed';
      operation.error = err instanceof Error ? err.message : 'Error desconocido en on-ramp';
      operation.updatedAt = Date.now();
      this.operations.set(id, operation);
      throw err;
    }
  }

  /**
   * Consulta el estado de una operación de rampa.
   * Si el anchor soporta consulta de estado, se consulta al anchor; si no, se retorna el estado local.
   */
  async getRampStatus(operationId: string): Promise<RampOperation | null> {
    const operation = this.operations.get(operationId);
    if (!operation) return null;

    const anchor = this.getAnchor(operation.anchor);

    // Si el anchor soporta SEP-6 transaction query, consultar estado actualizado
    if (anchor.sep6Enabled && operation.anchorTransactionId) {
      try {
        const txStatus = await this.callSep6Transaction(anchor, operation.anchorTransactionId);
        operation.status = this.mapAnchorStatus(txStatus.status);
        operation.stellarTransactionId = txStatus.stellar_transaction_id ?? operation.stellarTransactionId;
        operation.amountUsdc = txStatus.amount_usdc ?? operation.amountUsdc;
        operation.amountArs = txStatus.amount_ars ?? operation.amountArs;
        operation.error = txStatus.error;
        operation.updatedAt = Date.now();

        if (txStatus.error) {
          operation.status = 'failed';
        }

        this.operations.set(operationId, operation);
      } catch {
        // Si falla la consulta al anchor, retornar el estado local
      }
    }

    return { ...operation };
  }

  /**
   * Procesa un webhook del anchor (SEP-24 notification).
   * Verifica firma, valida idempotencia del evento y actualiza estado.
   */
  async processWebhook(event: RampWebhookEvent): Promise<RampOperation | null> {
    const operation = this.operations.get(event.operationId);
    if (!operation) return null;

    // Idempotencia de eventos del anchor: no procesar el mismo evento dos veces
    // (en producción esto iría en una tabla webhook_events)
    const eventKey = `webhook_${event.id}`;
    if (this.idempotencyKeys.has(eventKey)) {
      return operation;
    }

    // Verificar firma del webhook si hay secreto configurado
    if (this.config.webhookSecret) {
      const isValid = this.verifyWebhookSignature(event, this.config.webhookSecret);
      if (!isValid) {
        throw new Error('Firma de webhook inválida');
      }
    }

    this.idempotencyKeys.add(eventKey);

    // Actualizar estado de la operación
    operation.status = event.status ?? operation.status;
    operation.amountUsdc = event.amountUsdc ?? operation.amountUsdc;
    operation.amountArs = event.amountArs ?? operation.amountArs;
    operation.stellarTransactionId = event.stellarTransactionId ?? operation.stellarTransactionId;
    operation.updatedAt = event.receivedAt ?? Date.now();

    if (event.status === 'completed') {
      operation.completedAt = event.receivedAt ?? Date.now();
    }

    this.operations.set(event.operationId, operation);
    return { ...operation };
  }

  /**
   * Verifica si una idempotencyKey ya fue procesada.
   */
  async isIdempotencyKeyUsed(idempotencyKey: string): Promise<boolean> {
    return this.idempotencyKeys.has(idempotencyKey);
  }

  // =========================================================================
  // Métodos privados de integración con anchors
  // =========================================================================

  private async callSep6Withdraw(
    anchor: AnchorEndpoint,
    params: Record<string, string | undefined>
  ): Promise<Sep6WithdrawResponse> {
    const url = new URL(`${anchor.baseUrl}/sep6/withdraw`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.append(key, value);
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (anchor.apiKey) {
      headers['Authorization'] = `Bearer ${anchor.apiKey}`;
    }

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error(`Anchor SEP-6 withdraw falló: ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as Sep6WithdrawResponse;
  }

  private async callSep6Deposit(
    anchor: AnchorEndpoint,
    params: Record<string, string | undefined>
  ): Promise<Sep6DepositResponse> {
    const url = new URL(`${anchor.baseUrl}/sep6/deposit`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.append(key, value);
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (anchor.apiKey) {
      headers['Authorization'] = `Bearer ${anchor.apiKey}`;
    }

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error(`Anchor SEP-6 deposit falló: ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as Sep6DepositResponse;
  }

  private async callSep6Transaction(
    anchor: AnchorEndpoint,
    transactionId: string
  ): Promise<Sep6TransactionResponse> {
    const url = `${anchor.baseUrl}/sep6/transaction?id=${transactionId}`;
    const headers: Record<string, string> = {};
    if (anchor.apiKey) {
      headers['Authorization'] = `Bearer ${anchor.apiKey}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Anchor SEP-6 transaction query falló: ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as Sep6TransactionResponse;
  }

  private getUserStellarAccount(userId: string): string {
    // En producción, esto vendría del user repository (dirección Stellar del usuario)
    // Por ahora derivamos una cuenta determinística o retornamos placeholder
    return `G${userId.padStart(55, 'X')}`;
  }

  private mapAnchorStatus(status: string): RampOperation['status'] {
    switch (status?.toLowerCase()) {
      case 'pending': return 'pending';
      case 'processing':
      case 'in_progress':
      case 'awaiting_approval': return 'processing';
      case 'completed':
      case 'success':
      case 'done': return 'completed';
      case 'failed':
      case 'error':
      case 'rejected': return 'failed';
      default: return 'pending';
    }
  }

  private verifyWebhookSignature(event: RampWebhookEvent, secret: string): boolean {
    // Implementación simplificada: en producción verificar HMAC-SHA256 del payload
    // con el secreto compartido del anchor
    return !!event.signature && event.signature.length > 0;
  }
}
