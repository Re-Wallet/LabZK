/**
 * src/zk/prover.ts
 *
 * Generador de pruebas ZK Groth16 (off-chain, cliente/wallet).
 *
 * Modo de operación:
 *   - Si existen los artefactos compilados de Circom (.wasm + .zkey),
 *     usa snarkjs para generar una prueba Groth16 real sobre BN254.
 *   - Si no existen (PoC inicial), usa un modo simulado que devuelve una
 *     proof con la estructura correcta de Groth16 y calcula el nullifier
 *     con una función hash determinista. Esto permite validar toda la
 *     arquitectura (nullifier, anti-replay, no-revelación) sin bloquear
 *     en la compilación de Circom.
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

const USE_REAL = fs.existsSync(WASM_PATH) && fs.existsSync(ZKEY_PATH);

/**
 * Función hash determinista para simular Poseidon en el modo simulado.
 * En producción real, el circuito Circom calcula Poseidon(secret, seed)
 * dentro del circuito ZK.
 */
function poseidonSim(secret: string, seed: string): string {
  const input = `${secret}|${seed}`;
  return crypto
    .createHash('sha256')
    .update(input)
    .digest('hex')
    .slice(0, 64); // 256 bits como un field element de BN254
}

/**
 * Genera elementos de campo BN254 aleatorios como strings decimales.
 */
function randomFieldElement(): string {
  // BN254 field prime ≈ 21888242871839275222246405745257275088548364400416034343698204186575808495617
  const max = BigInt(
    '21888242871839275222246405745257275088548364400416034343698204186575808495617'
  );
  const random = BigInt('0x' + crypto.randomBytes(32).toString('hex'));
  return String(random % max);
}

/**
 * Genera una prueba Groth16 (real o simulada) que demuestra conocimiento
 * de `secreto` sin revelarlo.
 */
export async function generateProof(
  privateInputs: PrivateInputs,
  seed: string
): Promise<{ proof: Groth16Proof; publicInputs: PublicInputs }> {
  const { secreto } = privateInputs;

  if (USE_REAL) {
    return generateProofReal(secreto, seed);
  }

  // --- MODO SIMULADO (PoC inicial) ---
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
