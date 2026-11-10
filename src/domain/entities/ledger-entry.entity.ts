/**
 * domain/entities/ledger-entry.entity.ts
 *
 * Entidad de dominio: Asiento de ledger (doble entrada, suma cero).
 */

export type LedgerEntryType = 'debit' | 'credit';

export interface LedgerEntry {
  id: string;
  transferId: string;
  type: LedgerEntryType;
  amount: string;
  asset: string;
  account: string;            // Dirección Stellar o tag de usuario
  createdAt: number;
}
