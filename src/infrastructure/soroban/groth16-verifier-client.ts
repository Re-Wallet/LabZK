/**
 * src/infrastructure/soroban/groth16-verifier-client.ts
 *
 * Cliente para verificación on-chain de pruebas Groth16 en Soroban (CAP-0074 BN254).
 *
 * ESTE ES UN PLACEHOLDER ESTRUCTURAL. Cuando circom compile y se genere el
 * verification_key.json, se desplegará el contrato verificador y este cliente
 * se conectará a él.
 *
 * Primitive on-chain disponibles (Protocol 25+, CAP-0074):
 *   - bn254_g1_add
 *   - bn254_g1_mul
 *   - bn254_multi_pairing_check
 *
 * Para usar esto en producción:
 *   1. Compilar circuito Circom → .r1cs + .wasm + .zkey
 *   2. Exportar verification_key.json
 *   3. Desplegar contrato verificador Soroban (stellar-zk)
 *   4. Conectar este cliente al contractId desplegado
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
    // isReady = true solo cuando hay un contractId desplegado y vkey disponible
    this.isReady = Boolean(config.contractId && config.verificationKeyHash);
  }

  /**
   * Verifica una prueba Groth16 on-chain a través del contrato Soroban.
   *
   * Retorna { valid: true/false, txHash } si el contrato responde.
   * Retorna { valid: false, error } si el cliente no está listo (sin contrato desplegado).
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
          'Contrato verificador Soroban no desplegado. Compila circom, despliega el contrato verificador y configura contractId.',
      };
    }

    // TODO: Cuando se disponga del contrato Soroban desplegado, usar @stellar/stellar-sdk
    // para llamar a la función verify del contrato con:
    //   - proof (serializada como bytes)
    //   - publicInputs ([nullifier, seed])
    //   - verification key (para verificar la pairing)
    //
    // Ejemplo conceptual:
    // const contract = new Contract(this.config.contractId, Groth16Verifier.abi, this.provider);
    // const result = await contract.verify(proof, publicInputs);

    throw new Error('Groth16VerifierClient: contrato Soroban no implementado aún');
  }

  /**
   * Verifica si el cliente está listo para verificar on-chain.
   */
  isReadyToVerify(): boolean {
    return this.isReady;
  }
}
