/**
 * domain/ports/ledger.repository.ts
 *
 * Puerto: Repositorio de asientos de ledger (doble entrada, suma cero).
 */

export interface LedgerRepository {
  saveEntry(entry: LedgerEntry): Promise<void>;
  findByTransferId(transferId: string): Promise<LedgerEntry[]>;
}

import type { LedgerEntry } from '../entities/ledger-entry.entity.js';
