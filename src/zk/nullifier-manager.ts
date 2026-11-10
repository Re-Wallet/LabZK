/**
 * src/zk/nullifier-manager.ts
 *
 * Gestor de nullifiers en memoria (simula la tabla PostgreSQL zk_nullifiers
 * para el PoC). Cada nullifier solo puede usarse una vez → evita replay
 * y doble gasto.
 *
 * En producción esto sería:
 *   - Tabla `zk_nullifiers` en PostgreSQL (único, indexado).
 *   - O registro on-chain en Soroban (kyc_registry).
 */

import type { NullifierRecord } from './types.js';

const nullifiers = new Map<string, NullifierRecord>();

/**
 * Registra un nullifier si aún no ha sido usado.
 * Retorna true si se registró (primera vez), false si ya existía (replay).
 */
export function registerNullifier(
  nullifier: string,
  usedBy: string,
  integrator: string = 'kakusho-adapter'
): boolean {
  if (nullifiers.has(nullifier)) {
    return false; // Replay detectado: nullifier ya usado
  }

  nullifiers.set(nullifier, {
    nullifier,
    usedAt: Date.now(),
    usedBy,
    integrator,
    valid: true,
  });

  return true;
}

/**
 * Consulta si un nullifier ya fue usado.
 */
export function isNullifierUsed(nullifier: string): boolean {
  return nullifiers.has(nullifier);
}

/**
 * Devuelve el registro de un nullifier (o undefined).
 */
export function getNullifierRecord(nullifier: string): NullifierRecord | undefined {
  return nullifiers.get(nullifier);
}

/**
 * Limpia todos los nullifiers (útil entre tests).
 */
export function clearNullifiers(): void {
  nullifiers.clear();
}
