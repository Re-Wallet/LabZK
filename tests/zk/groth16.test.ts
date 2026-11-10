/**
 * tests/zk/groth16.test.ts
 *
 * Pruebas enfocadas ÚNICAMENTE en el sistema ZK (Groth16 / BN254).
 *
 * Objetivo del PoC: validar que el ecosistema ZK de Stellar funcione
 * antes de integrarlo en la wallet completa.
 *
 * Cubren:
 *   - Generación de prueba con secreto válido → verificación OK.
 *   - Nullifier determinista (mismo secreto+seed = mismo nullifier).
 *   - Nullifier diferente si cambia el secreto.
 *   - Detección de replay/doble uso de nullifier.
 *   - Rechazo de prueba inválida / manipulada.
 *   - Estructura de proof compatible con verificación on-chain (Soroban BN254).
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  generateProof,
  verifyProof,
  registerNullifier,
  isNullifierUsed,
  clearNullifiers,
  type PublicInputs,
} from '../../src/zk/index';

describe('ZK PoC — Groth16 / BN254 (Proof of Knowledge + Nullifier)', () => {
  const SEED = '12345678901234567890123456789012'; // semilla pública del nullifier

  beforeEach(() => {
    clearNullifiers();
  });

  it('genera y verifica una prueba ZK válida con secreto correcto', async () => {
    const secreto = 'mi-secreto-kakusho-2024';

    const { proof, publicInputs } = await generateProof(
      { secreto },
      SEED
    );

    // La prueba debe tener la estructura Groth16 esperada por Soroban BN254
    expect(proof).toHaveProperty('pi_a');
    expect(proof).toHaveProperty('pi_b');
    expect(proof).toHaveProperty('pi_c');
    expect(proof.pi_a).toHaveLength(2);
    expect(proof.pi_b).toHaveLength(2);
    expect(proof.pi_b[0]).toHaveLength(2);
    expect(proof.pi_c).toHaveLength(2);
    expect(proof.curve).toBe('bn128'); // snarkjs llama bn128 a BN254

    // Los inputs públicos no revelan el secreto
    expect(publicInputs.nullifier).toBeDefined();
    expect(publicInputs.seed).toBe(SEED);
    expect(publicInputs.nullifier).not.toBe(secreto);

    // Verificación off-chain debe pasar
    const result = verifyProof(proof, publicInputs);
    expect(result.valid).toBe(true);
    expect(result.nullifier).toBe(publicInputs.nullifier);
  });

  it('el nullifier es determinista: mismo secreto y seed dan el mismo nullifier', async () => {
    const secreto = 'secreto-determinista';

    const { publicInputs: pi1 } = await generateProof({ secreto }, SEED);
    const { publicInputs: pi2 } = await generateProof({ secreto }, SEED);

    expect(pi1.nullifier).toBe(pi2.nullifier);
  });

  it('el nullifier cambia si el secreto cambia', async () => {
    const { publicInputs: pi1 } = await generateProof(
      { secreto: 'secreto-a' },
      SEED
    );
    const { publicInputs: pi2 } = await generateProof(
      { secreto: 'secreto-b' },
      SEED
    );

    expect(pi1.nullifier).not.toBe(pi2.nullifier);
  });

  it('no revela el secreto en los inputs públicos ni en la prueba', async () => {
    const secreto = 'secreto-super-confidencial-no-debe-salir';
    const { proof, publicInputs } = await generateProof({ secreto }, SEED);

    const serialized = JSON.stringify({ proof, publicInputs });
    expect(serialized).not.toContain(secreto);
  });

  it('rechaza una proof con estructura Groth16 inválida', async () => {
    const { publicInputs } = await generateProof(
      { secreto: 'secreto-para-manipulacion' },
      SEED
    );

    // Proof malformada: faltan componentes → debe rechazarse por estructura
    const proofMalformada = {
      pi_a: ['1'],
      pi_b: [['1']],
      pi_c: ['1'],
      protocol: 'groth16',
      curve: 'bn128',
    } as any;

    const result = verifyProof(proofMalformada, publicInputs);
    expect(result.valid).toBe(false);
  });

  it('detecta replay / doble uso de un nullifier ya registrado', async () => {
    const secreto = 'secreto-para-replay';
    const { publicInputs } = await generateProof({ secreto }, SEED);

    // Primer uso: aceptado
    const primero = registerNullifier(
      publicInputs.nullifier,
      'usuario-1',
      'kakusho-adapter'
    );
    expect(primero).toBe(true);
    expect(isNullifierUsed(publicInputs.nullifier)).toBe(true);

    // Segundo uso con el mismo nullifier: rechazado (replay)
    const segundo = registerNullifier(
      publicInputs.nullifier,
      'usuario-2',
      'kakusho-adapter'
    );
    expect(segundo).toBe(false);
  });

  it('nullifiers diferentes pueden usarse independientemente', async () => {
    const { publicInputs: pi1 } = await generateProof(
      { secreto: 'secreto-x' },
      SEED
    );
    const { publicInputs: pi2 } = await generateProof(
      { secreto: 'secreto-y' },
      SEED
    );

    expect(registerNullifier(pi1.nullifier, 'u1')).toBe(true);
    expect(registerNullifier(pi2.nullifier, 'u2')).toBe(true);
    expect(isNullifierUsed(pi1.nullifier)).toBe(true);
    expect(isNullifierUsed(pi2.nullifier)).toBe(true);
  });

  it('la proof tiene el formato serializable para envío al backend / Soroban', async () => {
    const { proof } = await generateProof({ secreto: 's' }, SEED);

    // Serialización JSON completa (lo que viajaría por HTTP al backend)
    const json = JSON.stringify(proof);
    const parsed = JSON.parse(json);

    expect(typeof parsed.pi_a[0]).toBe('string');
    expect(typeof parsed.pi_a[1]).toBe('string');
    expect(Array.isArray(parsed.pi_b[0])).toBe(true);
    expect(Array.isArray(parsed.pi_b[1])).toBe(true);
    expect(typeof parsed.pi_c[0]).toBe('string');
    expect(typeof parsed.pi_c[1]).toBe('string');

    // Los valores son números grandes (strings decimales) → BN254 field elements
    expect(BigInt(parsed.pi_a[0])).toBeGreaterThan(0n);
    expect(BigInt(parsed.pi_c[0])).toBeGreaterThan(0n);
  });
});
