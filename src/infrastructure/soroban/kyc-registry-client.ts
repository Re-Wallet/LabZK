/**
 * src/infrastructure/soroban/kyc-registry-client.ts
 *
 * Cliente para el contrato kyc_registry en Soroban.
 *
 * Este contrato valida pruebas ZK de Kakusho on-chain y registra nullifiers.
 * Cuando se despliegue el contrato, este cliente se conectará a él.
 *
 * Flujo esperado:
 *   1. Cliente genera prueba Groth16 en el navegador (Kakusho SDK)
 *   2. Backend recibe nullifier + prueba
 *   3. Backend llama a kyc_registry.verify(proof, publicInputs) on-chain
 *   4. Si es válido, se registra el nullifier (anti-replay)
 */

import type { Groth16ProofSoroban, Groth16PublicInputs } from './types.js';

export interface KycRegistryConfig {
  contractId: string;
  rpcUrl: string;
  networkPassphrase: string;
}

export class KycRegistryClient {
  private readonly config: KycRegistryConfig;
  private readonly isReady: boolean;

  constructor(config: KycRegistryConfig) {
    this.config = config;
    this.isReady = Boolean(config.contractId);
  }

  /**
   * Verifica una prueba KYC ZK on-chain (Kakusho).
   * Retorna true si la prueba es válida y el nullifier es nuevo.
   */
  async verifyKycProof(
    proof: Groth16ProofSoroban,
    publicInputs: Groth16PublicInputs
  ): Promise<{ verified: boolean; nullifier?: string; error?: string }> {
    if (!this.isReady) {
      return {
        verified: false,
        error: 'Contrato kyc_registry no desplegado en Soroban',
      };
    }

    // TODO: Conectar al contrato kyc_registry desplegado
    throw new Error('KycRegistryClient: contrato no implementado aún');
  }

  /**
   * Consulta si un nullifier ya está registrado en kyc_registry.
   */
  async isNullifierRegistered(nullifier: string): Promise<boolean> {
    if (!this.isReady) return false;
    // TODO: Consultar contrato on-chain
    return false;
  }

  isReadyToVerify(): boolean {
    return this.isReady;
  }
}
