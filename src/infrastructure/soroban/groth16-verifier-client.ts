/**
 * src/infrastructure/soroban/groth16-verifier-client.ts
 *
 * Cliente para verificación on-chain de pruebas Groth16 en Soroban (CAP-0074 BN254).
 *
 * Primitive on-chain disponibles (Protocol 25+, CAP-0074):
 *   - bn254_g1_add
 *   - bn254_g1_mul
 *   - bn254_multi_pairing_check
 *
 * Para usar en producción:
 *   1. Compilar circuito Circom → .r1cs + .wasm + .zkey (requiere cmake, pendiente)
 *   2. Exportar verification_key.json
 *   3. Desplegar contrato verificador Soroban (stellar-zk)
 *   4. Configurar contractId, rpcUrl, networkPassphrase y verificationKeyHash
 *
 * Cuando se disponga de las credenciales y el contrato desplegado, descomentar
 * la implementación con @stellar/stellar-sdk.
 */

import type {
  Groth16ProofSoroban,
  Groth16PublicInputs,
  Groth16VerifyResult,
  SorobanVerifierConfig,
} from './types.js';

export class Groth16VerifierClient {
  private readonly config: SorobanVerifierConfig;
  private readonly isReady: boolean;

  constructor(config: SorobanVerifierConfig) {
    this.config = config;
    // isReady = true solo cuando hay contractId y verificationKeyHash configurados
    this.isReady = Boolean(
      config.contractId &&
        config.verificationKeyHash &&
        config.rpcUrl &&
        config.networkPassphrase
    );
  }

  /**
   * Verifica una prueba Groth16 on-chain a través del contrato Soroban.
   *
   * Cuando el contrato esté desplegado y configurado, esta implementación
   * usará @stellar/stellar-sdk para llamar a la función verify del contrato.
   *
   * @returns { valid: true/false, txHash } si el contrato responde
   * @returns { valid: false, error } si el cliente no está listo
   */
  async verify(
    proof: Groth16ProofSoroban,
    publicInputs: Groth16PublicInputs
  ): Promise<Groth16VerifyResult> {
    if (!this.isReady) {
      return {
        valid: false,
        nullifier: publicInputs.nullifier,
        error:
          'Contrato verificador Soroban no desplegado. Requiere: contractId, verificationKeyHash, rpcUrl, networkPassphrase. Compila circom, despliega el contrato verificador y configura estas variables.',
      };
    }

    // TODO: Implementar con @stellar/stellar-sdk cuando se disponga del contrato desplegado
    // Ejemplo conceptual:
    // import { Contract, Networks, StrKey } from '@stellar/stellar-sdk'
    // const contract = new Contract(this.config.contractId, Groth16Verifier.abi, this.provider)
    // const result = await contract.verify(proof, publicInputs)

    throw new Error('Groth16VerifierClient: contrato Soroban no implementado aún');
  }

  /**
   * Verifica si el cliente está listo para verificar on-chain.
   */
  isReadyToVerify(): boolean {
    return this.isReady;
  }

  /**
   * Obtiene la configuración actual (para debugging).
   */
  getConfig(): SorobanVerifierConfig {
    return { ...this.config };
  }
}
