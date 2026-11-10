/**
 * application/transfer/send-transfer.use-case.ts
 *
 * Caso de uso: Envío de transferencia (con idempotencia y doble entrada contable).
 *
 * Invariantes:
 *   - El destinatario NO existe hasta el reclamo (no se crea fila en users).
 *   - idempotency_key previene duplicación.
 *   - Doble asiento con suma cero en el ledger (débito = crédito).
 *   - fromUserId debe existir (usuario autenticado).
 */

import type { WalletRepository } from '../../domain/ports/wallet.repository.js';
import type { LedgerRepository } from '../../domain/ports/ledger.repository.js';
import type { TransferRepository } from '../../domain/ports/transfer.repository.js';
import type { Transfer } from '../../domain/entities/transfer.entity.js';
import type { LedgerEntry } from '../../domain/entities/ledger-entry.entity.js';

export interface SendTransferInput {
  idempotencyKey: string;
  fromUserId: string;
  toTag: string;        // Destinatario (puede no existir aún)
  amount: string;
  asset: string;
}

export class SendTransferUseCase {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly ledgerRepo: LedgerRepository,
    private readonly transferRepo: TransferRepository
  ) {}

  async execute(input: SendTransferInput): Promise<Transfer> {
    // 1. Verificar idempotency_key (no permitir duplicados)
    const existing = await this.transferRepo.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      throw new Error(`Transfer with idempotency key already exists: ${input.idempotencyKey}`);
    }

    // 2. Verificar que el emisor existe (usuario autenticado)
    const sender = await this.walletRepo.findByUserId(input.fromUserId);
    if (!sender) {
      throw new Error(`Sender not found: ${input.fromUserId}`);
    }

    // 3. Crear transferencia con estado 'pending'
    const now = Date.now();
    const transfer: Transfer = {
      id: `tx_${now}`,
      idempotencyKey: input.idempotencyKey,
      fromUserId: input.fromUserId,
      toTag: input.toTag,
      amount: input.amount,
      asset: input.asset,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    // 4. Guardar la transferencia
    await this.transferRepo.save(transfer);

    // 5. Asiento de débito (emisor)
    const debitEntry: LedgerEntry = {
      id: `entry_${now}_1`,
      transferId: transfer.id,
      type: 'debit',
      amount: input.amount,
      asset: input.asset,
      account: input.fromUserId,
      createdAt: now,
    };

    // 6. Asiento de crédito (destinatario — pendiente de reclamo)
    const creditEntry: LedgerEntry = {
      id: `entry_${now}_2`,
      transferId: transfer.id,
      type: 'credit',
      amount: input.amount,
      asset: input.asset,
      account: input.toTag,
      createdAt: now,
    };

    // 7. Guardar ambos asientos (doble entrada, suma cero)
    await this.ledgerRepo.saveEntry(debitEntry);
    await this.ledgerRepo.saveEntry(creditEntry);

    return transfer;
  }
}
