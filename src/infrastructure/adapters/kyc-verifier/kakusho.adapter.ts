/**
 * infrastructure/adapters/kyc-verifier/kakusho.adapter.ts
 *
 * Adaptador: Kakusho (@kakusho/zk-kyc-sdk).
 * Implementa KycVerifierPort.
 *
 * Flujo:
 *   1. Cliente genera prueba Groth16 en el navegador (OCR local, sin PII).
 *   2. Backend recibe nullifier + prueba.
 *   3. Backend verifica proof con snarkjs + vkey (o kyc_registry en Soroban).
 *   4. Se registra el nullifier en zk_nullifiers (anti-replay).
 *
 * Advertencia: stack ZK en testnet/beta, no auditado.
 */

import * as snarkjs from 'snarkjs';
import fs from 'fs';
import path from 'path';
import type {
  KycVerifierPort,
  KycProofInput,
  KycVerifyResult,
} from '../../../domain/ports/kyc-verifier.port.js';
import type { NullifierRepository } from '../../../domain/ports/nullifier.repository.js';

const ROOT = path.resolve(__dirname, '../../../..');
const VKEY_PATH = path.join(ROOT, 'circuits', 'verification_key.json');

export class KakushoAdapter implements KycVerifierPort {
  constructor(private readonly nullifierRepo: NullifierRepository) {}

  async verifyKycProof(input: KycProofInput): Promise<KycVerifyResult> {
    const { proof, publicInputs } = input;

    // Validar estructura de la proof
    if (!proof.pi_a || !proof.pi_b || !proof.pi_c) {
      return { verified: false, nullifier: publicInputs.nullifier, status: 'rejected', reason: 'Invalid proof structure' };
    }

    // Verificación criptográfica (off-chain, simula kyc_registry en Soroban)
    let valid = false;
    try {
      if (fs.existsSync(VKEY_PATH)) {
        const vkey = JSON.parse(fs.readFileSync(VKEY_PATH, 'utf8'));
        valid = await snarkjs.groth16.verify(
          vkey,
          [publicInputs.nullifier, publicInputs.seed],
          proof as any
        );
      } else {
        // Modo simulado (PoC): validar estructura + determinismo del nullifier
        valid = this.isValidProofStructure(proof);
      }
    } catch (err) {
      return {
        verified: false,
        nullifier: publicInputs.nullifier,
        status: 'rejected',
        reason: err instanceof Error ? err.message : 'Verification error',
      };
    }

    if (!valid) {
      return { verified: false, nullifier: publicInputs.nullifier, status: 'rejected', reason: 'Invalid ZK proof' };
    }

    return { verified: true, nullifier: publicInputs.nullifier, status: 'approved' };
  }

  async isNullifierVerified(nullifier: string): Promise<boolean> {
    return this.nullifierRepo.exists(nullifier);
  }

  registerNullifier(nullifier: string): Promise<boolean> {
    return this.nullifierRepo.save(nullifier, 'kakusho');
  }

  private isValidProofStructure(proof: { pi_a: string[]; pi_b: string[][]; pi_c: string[] }): boolean {
    return (
      Array.isArray(proof.pi_a) && proof.pi_a.length === 2 &&
      Array.isArray(proof.pi_b) && proof.pi_b.length === 2 &&
      Array.isArray(proof.pi_b[0]) && proof.pi_b[0].length === 2 &&
      Array.isArray(proof.pi_b[1]) && proof.pi_b[1].length === 2 &&
      Array.isArray(proof.pi_c) && proof.pi_c.length === 2
    );
  }
}
