/**
 * scripts/deploy-soroban.ts
 *
 * Script de despliegue de contratos Soroban para LabZK.
 *
 * PRERREQUISITOS:
 *   1. stellar-cli instalado: https://developers.stellar.org/docs/tools/cli
 *   2. Credenciales Soroban configuradas en .env (SOROBAN_SECRET_KEY, etc.)
 *   3. Circom compilado para obtener verification_key.json (pendiente - requiere cmake)
 *
 * Uso:
 *   npx tsx scripts/deploy-soroban.ts
 */

import { Keypair, StrKey, Contract, Address } from '@stellar/stellar-sdk';
import * as dotenv from 'dotenv';

dotenv.config();

const SECRET_KEY = process.env.SOROBAN_SECRET_KEY;
const RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.SOROBAN_NETWORK_PASSPHRASE || 'Testnet SDF Network ; September 2015';

if (!SECRET_KEY) {
  throw new Error('SOROBAN_SECRET_KEY no configurado en .env');
}

const keypair = Keypair.fromSecret(SECRET_KEY);
console.log(`🔑 Usando cuenta Soroban: ${keypair.publicKey()}`);

// TODO: Desplegar contrato verificador Groth16 (requiere verification_key.json de Circom)
// TODO: Desplegar contrato kyc_registry
// TODO: Guardar contractIds en .env

console.log('✅ Script de despliegue listo. Ejecutar una vez se disponga de:');
console.log('   1. verification_key.json (compilar circom con cmake)');
console.log('   2. Contratos WASM compilados');
console.log('   3. Credenciales Soroban en .env');
