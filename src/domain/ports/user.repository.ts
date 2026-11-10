/**
 * domain/ports/user.repository.ts
 *
 * Puerto: Repositorio de usuarios (sin PII).
 */

import type { User, CreateUserInput } from '../entities/user.entity.js';

export interface UserRepository {
  save(user: User): Promise<void>;
  findByTag(tag: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByNullifier(nullifier: string): Promise<User | null>;
}

export type { User, CreateUserInput };
