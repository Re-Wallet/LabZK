/**
 * scripts/setup-circuits.js
 *
 * Prepara los artefactos ZK necesarios para las pruebas de Groth16:
 *   1. Compila el circuito Circom → .r1cs + .wasm + .sym
 *   2. Trusted setup (fase 2 específica del circuito) → .zkey
 *   3. Exporta la verification key → verification_key.json
 *
 * Ejecutar UNA VEZ antes de correr los tests ZK:
 *   npm run setup:circuits
 *
 * Nota: El trusted setup aquí es local y solo para el PoC.
 * En producción se usaría una ceremonia de trusted setup real (multi-partida).
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CIRCUITS_DIR = path.join(ROOT, 'circuits');
const CIRCUIT_NAME = 'proof-of-knowledge';
const CIRCUIT_FILE = path.join(CIRCUITS_DIR, `${CIRCUIT_NAME}.circom`);
const PTAU_FILE = path.join(CIRCUITS_DIR, 'powersOfTau28_hez_final_12.ptau');

function sh(cmd, args) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { stdio: 'inherit', cwd: ROOT });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  ensureDir(CIRCUITS_DIR);

  // 1. Compilar circuito Circom
  console.log('\n▶ Compilando circuito Circom...');
  sh('npx', ['circom', CIRCUIT_FILE, '--r1cs', '--wasm', '--sym', '-o', CIRCUITS_DIR]);

  const r1cs = path.join(CIRCUITS_DIR, `${CIRCUIT_NAME}.r1cs`);
  const wasm = path.join(CIRCUITS_DIR, `${CIRCUIT_NAME}_js`, `${CIRCUIT_NAME}.wasm`);

  // 2. Descargar powersOfTau si no existe (ceremonia de fase 1 preexistente)
  if (!fs.existsSync(PTAU_FILE)) {
    console.log('\n▶ Descargando powersOfTau (fase 1 de trusted setup)...');
    sh('snarkjs', ['powersoftau', 'download', 'powersOfTau28_hez_final_12', PTAU_FILE]);
  }

  // 3. Trusted setup fase 2 (específico del circuito)
  const zkey = path.join(CIRCUITS_DIR, `${CIRCUIT_NAME}_0000.zkey`);
  console.log('\n▶ Ejecutando trusted setup fase 2 (groth16 setup)...');
  sh('snarkjs', ['groth16', 'setup', r1cs, PTAU_FILE, zkey]);

  // 4. Exportar verification key (JSON, para verificación off-chain y Soroban)
  const vkey = path.join(CIRCUITS_DIR, 'verification_key.json');
  console.log('\n▶ Exportando verification key...');
  sh('snarkjs', ['zkey', 'export', 'verificationkey', zkey, vkey]);

  console.log('\n✅ Setup completo. Artefactos en circuits/:');
  console.log(`   - ${CIRCUIT_NAME}.r1cs`);
  console.log(`   - ${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm`);
  console.log(`   - ${CIRCUIT_NAME}_0000.zkey`);
  console.log(`   - verification_key.json`);
  console.log('\n🔐 Ahora puedes ejecutar: npm run test:zk');
}

main();
