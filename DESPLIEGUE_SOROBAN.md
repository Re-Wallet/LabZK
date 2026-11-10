# 🚀 DESPLIEGUE DE CONTRATOS SOROBAN - LABZK

Este documento contiene todo lo necesario para desplegar los contratos ZK en Stellar testnet y conectar el backend.

---

## 1. Cuenta Soroban Testnet (YA CREADA)

| Campo | Valor |
|-------|-------|
| **Alias** | `labzk-soroban-testnet` |
| **Dirección pública** | `GCFOKIPIKXDJF7XHUOWES2OBJ4EWH2FW42GADNZP3S7IRUH476Y5VI75` |
| **Clave secreta** | `SATGKBTRQTMSK4UVSFC6DRWV253ACFRDTIKUVAZ53YUTRX2TZNMPQF7T` |
| **RPC URL** | `https://soroban-testnet.stellar.org` |
| **Passphrase** | `Testnet SDF Network ; September 2015` |
| **Estado** | ✅ Financiada con friendbot |

---

## 2. Artefactos ZK Listos (YA CREADOS)

| Archivo | Ruta | Descripción |
|---------|------|-------------|
| Circuito compilado | `circuits/proof-of-knowledge.r1cs` | R1CS del circuito ZK |
| WebAssembly | `circuits/proof-of-knowledge_js/proof-of-knowledge.wasm` | WASM para generar pruebas |
| Clave de verificación | `circuits/verification_key.json` | VK para verificar pruebas on-chain |
| Clave de prueba | `circuits/proof-of-knowledge_0000.zkey` | ZKey para generar pruebas |
| Símbolos | `circuits/proof-of-knowledge.sym` | Símbolos del circuito |

---

## 3. Desplegar Contrato Soroban

### Opción A: Usar stellar-cli (recomendado)

```bash
# 1. Configurar la cuenta en stellar-cli
export PATH="$HOME/.local/bin:$PATH"
stellar keys import labzk-soroban-testnet --secret-key "SATGKBTRQTMSK4UVSFC6DRWV253ACFRDTIKUVAZ53YUTRX2TZNMPQF7T"
stellar keys use labzk-soroban-testnet

# 2. Verificar saldo
stellar keys balance labzk-soroban-testnet

# 3. Desplegar el contrato
stellar contract deploy \
  --wasm contracts/zk_verifier/target/wasm32-unknown-unknown/release/zk_verifier.wasm \
  --source-account labzk-soroban-testnet \
  --network testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Testnet SDF Network ; September 2015"
```

### Opción B: Si necesitas compilar el contrato primero

```bash
export PATH="$HOME/.cargo/bin:$PATH"
cd "/datos/lordbitcoin/Projects/Projects Web3/ReWallet/LabZK/contracts/zk_verifier"
cargo build --target wasm32-unknown-unknown --release
```

El Wasm se generará en: `target/wasm32-unknown-unknown/release/zk_verifier.wasm`

---

## 4. Conectar Contratos en el Código

Una vez tengas los `contractId` del despliegue, añade al `.env`:

```bash
# Añadir al final de .env
SOROBAN_VERIFIER_CONTRACT_ID=CA... (del despliegue)
SOROBAN_KYC_REGISTRY_CONTRACT_ID=CA... (del despliegue)
SOROBAN_VERIFICATION_KEY_HASH=$(sha256sum circuits/verification_key.json | cut -d' ' -f1)
```

Luego actualiza `src/di/container.ts` para conectar `KakushoAdapter` y `Groth16VerifierClient` con los contractIds.

---

## 5. Comandos de Verificación

```bash
# Verificar cuenta
stellar keys balance labzk-soroban-testnet

# Verificar despliegue
stellar contract read <CONTRACT_ID> --network testnet --rpc-url https://soroban-testnet.stellar.org

# Ejecutar tests
cd /datos/lordbitcoin/Projects/Projects Web3/ReWallet/LabZK
npm test

# Ejecutar servidor
DATABASE_URL="..." npm run dev
```

---

## 6. Estado del Proyecto (COMPLETO)

| Componente | Estado |
|------------|--------|
| Arquitectura hexagonal | ✅ Completo |
| 80 tests pasando | ✅ |
| Stack ZK (Circom 2.x) | ✅ Circuitos compilados |
| SDKs reales (@kakusho, @neylanxyz/piilo, @stellar-zklogin) | ✅ Instalados |
| Base de datos Neon (rama pruebas-zk) | ✅ Conectada |
| API Fastify (8 endpoints) | ✅ Funcionando |
| Cuenta Soroban testnet | ✅ Creada y financiada |
| Contratos Soroban | ⏳ Listos para desplegar |
| Repositorio GitHub | ✅ https://github.com/Re-Wallet/LabZK |

---

## Comandos Rápidos

```bash
# Ir al proyecto
cd "/datos/lordbitcoin/Projects/Projects Web3/ReWallet/LabZK"

# Ejecutar tests
npm test

# Ejecutar servidor
DATABASE_URL="..." npm run dev

# Desplegar contrato Soroban
stellar contract deploy --wasm contracts/zk_verifier/target/wasm32-unknown-unknown/release/zk_verifier.wasm --source-account labzk-soroban-testnet --network testnet --rpc-url https://soroban-testnet.stellar.org --network-passphrase "Testnet SDF Network ; September 2015"

# Verificar cuenta
stellar keys balance labzk-soroban-testnet
```

---

## Créditos

Laboratorio LABZK - Billetera con Pruebas de Conocimiento Cero para Stellar
Arquitectura: Hexagonal (Puertos y Adaptadores)
Ecosistema ZK: Kakusho + Piilo + zkLogin + Stellar Protocol 25 (BN254 + Poseidon)
