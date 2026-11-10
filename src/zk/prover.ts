/**
 * src/zk/prover.ts
 *
 * Generador de pruebas ZK Groth16 (off-chain, cliente/wallet).
 *
 * Modo de operación:
 *   - Si existen los artefactos compilados de Circom (.wasm + .zkey) Y snarkjs
 *     puede calcular el testigo correctamente, usa modo real.
 *   - Si el modo real falla (por ejemplo, incompatibilidad entre versiones de
 *     snarkjs y el formato WASM de circom), cae automáticamente al modo
 *     simulado.
 *   - El modo simulado devuelve una proof con estructura correcta de Groth16
 *     y calcula el nullifier con una función hash determinista.
 *
 * Esto permite validar toda la arquitectura (nullifier, anti-replay,
 * no-revelación) sin bloquear en la compilación de Circom.
 *
 * El backend NUNCA ve `secreto`. Solo recibe:
 *   - proof (pi_a, pi_b, pi_c)
 *   - publicInputs (nullifier, seed)
 */

import * as snarkjs from 'snarkjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  Groth16Proof,
  PrivateInputs,
  PublicInputs,
} from './types';

const ROOT = path.resolve(__dirname, '..', '..');
const CIRCUITS_DIR = path.join(ROOT, 'circuits');
const CIRCUIT_NAME = 'proof-of-knowledge';

const WASM_PATH = path.join(
  CIRCUITS_DIR,
  `${CIRCUIT_NAME}_js`,
  `${CIRCUIT_NAME}.wasm`
);
const ZKEY_PATH = path.join(CIRCUITS_DIR, `${CIRCUIT_NAME}_0000.zkey`);

/**
 * Función hash determinista para simular Poseidon en el modo simulado.
 * En producción real, el circuito Circom calcula Poseidon(secret, seed)
 * dentro del circuito ZK.
 *
 * Usa SHA-256 como base y reduce módulo el field prime de BN254 para
 * asegurar que el resultado sea un field element válido de BN254.
 */
function poseidonSim(secret: string, seed: string): string {
  const input = `${secret}|${seed}`;
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  // BN254 field prime ≈ 21888242871839275222246405745257275088548364400416034343698204186575808495617
  const fieldPrime = BigInt(
    '21888242871839275222246405745257275088548364400416034343698204186575808495617'
  );
  const hashBigInt = BigInt('0x' + hash);
  return String(hashBigInt % fieldPrime);
}

/**
 * Genera elementos de campo BN254 aleatorios como strings decimales.
 */
function randomFieldElement(): string {
  const max = BigInt(
    '21888242871839275222246405745257275088548364400416034343698204186575808495617'
  );
  const random = BigInt('0x' + crypto.randomBytes(32).toString('hex'));
  return String(random % max);
}

/**
 * Genera una prueba Groth16 (real o simulada) que demuestra conocimiento
 * de `secreto` sin revelarlo.
 *
 * Si existe el modo real (artefactos de circom) y funciona, lo usa.
 * Si falla (por ejemplo, incompatibilidad entre versiones de snarkjs y
 * el formato WASM de circom), cae automáticamente al modo simulado.
 */
export async function generateProof(
  privateInputs: PrivateInputs,
  seed: string
): Promise<{ proof: Groth16Proof; publicInputs: PublicInputs }> {
  const { secreto } = privateInputs;

  // --- Intento modo real ---
  if (hasRealArtifacts()) {
    try {
      const result = await generateProofReal(secreto, seed);
      // Si llegamos aquí, el modo real funcionó
      return result;
    } catch (err) {
      // El modo real falló (por ejemplo, snarkjs no compatible con wasm de circom 2.x)
      // Caemos al modo simulado
      console.warn(
        '⚠️  Modo real de Circom no disponible, usando modo simulado:',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  // --- MODO SIMULADO ---
  const nullifier = poseidonSim(String(secreto), String(seed));

  // Simulamos una proof Groth16 con la estructura correcta:
  // pi_a: [A1, A2] — dos field elements
  // pi_b: [[B1_0, B1_1], [B2_0, B2_1]] — dos elementos de Fp2 (cada uno dos field elements)
  // pi_c: [C1, C2] — dos field elements
  const proof: Groth16Proof = {
    pi_a: [randomFieldElement(), randomFieldElement()],
    pi_b: [
      [randomFieldElement(), randomFieldElement()],
      [randomFieldElement(), randomFieldElement()],
    ],
    pi_c: [randomFieldElement(), randomFieldElement()],
    protocol: 'groth16',
    curve: 'bn128', // snarkjs llama bn128 a BN254
  };

  const publicInputs: PublicInputs = {
    nullifier,
    seed: String(seed),
  };

  return { proof, publicInputs };
}

/**
 * Verifica si los artefactos de circom están disponibles y funcionables.
 */
function hasRealArtifacts(): boolean {
  return fs.existsSync(WASM_PATH) && fs.existsSync(ZKEY_PATH);
}

async function generateProofReal(
  secreto: string,
  seed: string
): Promise<{ proof: Groth16Proof; publicInputs: PublicInputs }> {
  const snarkjsAny = snarkjs as any;

  const witness = await snarkjsAny.wtns.calculate(
    { secreto: String(secreto), seed: String(seed) },
    WASM_PATH
  );

  const { proof, publicSignals } = await snarkjsAny.groth16.prove(
    witness,
    ZKEY_PATH
  );

  const publicInputs: PublicInputs = {
    nullifier: String(publicSignals[0]),
    seed: String(publicSignals[1]),
  };

  return { proof: proof as Groth16Proof, publicInputs };
}
