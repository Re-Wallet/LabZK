/**
 * application/transfer/send-transfer.use-case.ts
 *
 * Caso de uso: Envío de transferencia (con idempotencia).
 *
 * Invariantes:
 *   - El destinatario NO existe hasta el reclamo (no se crea fila en users).
 *   - idempotency_key previene duplicación.
 *   - Doble asiento con suma cero en el ledger.
 */

import type { WalletRepository } from '../../domain/ports/wallet.repository.js';
import type { LedgerRepository } from '../../domain/ports/ledger.repository.js';
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
    private readonly ledgerRepo: LedgerRepository
  ) {}

  async execute(input: SendTransferInput): Promise<Transfer> {
    // TODO: Verificar idempotency_key antes de crear la transferencia
    // TODO: Crear transferencia con estado 'pending'
    // TODO: Crear asientos de ledger (débito + crédito, suma cero)
    // TODO: Si el destinatario no existe, no crear fila en users (reclamable después)

    const transfer: Transfer = {
      id: `tx_${Date.now()}`,
      idempotencyKey: input.idempotencyKey,
      fromUserId: input.fromUserId,
      toTag: input.toTag,
      amount: input.amount,
      asset: input.asset,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Asiento de débito (emisor)
    const debitEntry: LedgerEntry = {
      id: `entry_${Date.now()}_1`,
      transferId: transfer.id,
      type: 'debit',
      amount: input.amount,
      asset: input.asset,
      account: input.fromUserId,
      createdAt: Date.now(),
    };

    // Asiento de crédito (destinatario — pendiente de reclamo)
    const creditEntry: LedgerEntry = {
      id: `entry_${Date.now()}_2`,
      transferId: transfer.id,
      type: 'credit',
      amount: input.amount,
      asset: input.asset,
      account: input.toTag,
      createdAt: Date.now(),
    };

    await this.ledgerRepo.saveEntry(debitEntry);
    await this.ledgerRepo.saveEntry(creditEntry);

    return transfer;
  }
}
