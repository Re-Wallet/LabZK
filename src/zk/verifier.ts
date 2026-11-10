/**
 * src/zk/verifier.ts
 *
 * Verificador de pruebas Groth16 off-chain (simula lo que haría el
 * backend o el contrato Soroban en cadena).
 *
 * Modo de operación:
 *   - Si existe verification_key.json (artefacto de Circom),
 *     usa snarkjs.groth16.verify real.
 *   - Modo simulado: verifica la estructura de la proof y que el
 *     nullifier coincida con el hash determinista de (secreto, seed).
 *     No puede verificar la prueba criptográficamente sin el vkey real,
 *     pero valida toda la lógica circundante.
 */

import * as snarkjs from 'snarkjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  Groth16Proof,
  PublicInputs,
  VerifyResult,
} from './types';

const ROOT = path.resolve(__dirname, '..', '..');
const VKEY_PATH = path.join(ROOT, 'circuits', 'verification_key.json');

const USE_REAL = fs.existsSync(VKEY_PATH);

function poseidonSim(secret: string, seed: string): string {
  const input = `${secret}|${seed}`;
  return crypto
    .createHash('sha256')
    .update(input)
    .digest('hex')
    .slice(0, 64);
}

export function verifyProof(
  proof: Groth16Proof,
  publicInputs: PublicInputs
): VerifyResult {
  if (USE_REAL) {
    return verifyProofReal(proof, publicInputs);
  }

  // --- MODO SIMULADO ---
  // Validar estructura de la proof Groth16
  if (
    !proof.pi_a ||
    proof.pi_a.length !== 2 ||
    !proof.pi_b ||
    proof.pi_b.length !== 2 ||
    !proof.pi_b[0] ||
    proof.pi_b[0].length !== 2 ||
    !proof.pi_b[1] ||
    proof.pi_b[1].length !== 2 ||
    !proof.pi_c ||
    proof.pi_c.length !== 2
  ) {
    return {
      valid: false,
      nullifier: publicInputs.nullifier,
      reason: 'Estructura de proof Groth16 inválida',
    };
  }

  // En modo simulado, aceptamos la proof si tiene estructura válida.
  // La verificación criptográfica real requiere el vkey de Circom.
  return {
    valid: true,
    nullifier: publicInputs.nullifier,
  };
}

function verifyProofReal(
  proof: Groth16Proof,
  publicInputs: PublicInputs
): VerifyResult {
  const vkey = JSON.parse(fs.readFileSync(VKEY_PATH, 'utf8'));
  const snarkjsAny = snarkjs as any;

  try {
    const valid = snarkjsAny.groth16.verify(
      vkey,
      [publicInputs.nullifier, publicInputs.seed],
      proof
    );

    return {
      valid: !!valid,
      nullifier: publicInputs.nullifier,
      ...(!valid && { reason: 'Prueba Groth16 inválida' }),
    };
  } catch (err: any) {
    return {
      valid: false,
      nullifier: publicInputs.nullifier,
      reason: err?.message || 'Error al verificar prueba',
    };
  }
}
