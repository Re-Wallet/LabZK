/**
 * domain/entities/user.entity.ts
 *
 * Entidad de dominio: Usuario.
 * Sin PII. Solo tag público y referencia a nullifier ZK.
 */

export type UserId = string;
export type UserTag = string;
export type Nullifier = string;

export interface User {
  id: UserId;
  tag: UserTag;               // Identificador público único (username)
  tagChangeCount: number;     // Cambios de tag (máx 2)
  custodyType: 'non_custodial'; // Invariante: siempre non_custodial
  kycApproved: boolean;       // Derivado del nullifier en zk_registry
  nullifier?: Nullifier;      // Referencia al nullifier de Kakusho (no PII)
  createdAt: number;
  updatedAt: number;
}

export interface CreateUserInput {
  tag: UserTag;
  nullifier?: Nullifier;
}
