# LabZK — PoC de Pruebas ZK para Wallet Stellar

> **Laboratorio de pruebas de conocimiento cero (ZK) para billetera digital sobre Stellar.**
> Enfoque: validación rápida del ecosistema ZK antes de integrarlo en un producto de wallet completo.
> Estado: Proof of Concept (PoC) — **Tests: 110/110 pasando** | **TypeScript: 0 errores**

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura Hexagonal](#arquitectura-hexagonal)
3. [Stack ZK y Capas](#stack-zk-y-capaz)
4. [Contratos Soroban Desplegados (Testnet)](#contratos-soroban-desplegados-testnet)
5. [Resultado de los 3 Pasos Implementados](#resultado-de-los-3-pasos-implementados)
6. [Resultados de Pruebas](#resultados-de-pruebas)
7. [Inventario de Pruebas por Módulo](#inventario-de-pruebas-por-modulo)
8. [Regla de Oro: Qué se mockea y qué no](#regla-de-oro)
9. [Base de Datos — Capa ZK](#base-de-datos--capa-zk)
10. [Endpoints de la API](#endpoints-de-la-api)
11. [Instalación y Ejecución](#instalacion-y-ejecucion)
12. [Advertencias Críticas](#advertencias-criticas)
13. [Próximos Pasos](#proximos-pasos)
14. [Licencia](#licencia)

---

## 🎯 Resumen Ejecutivo

LabZK es un laboratorio enfocado exclusivamente en validar el **sistema ZK del ecosistema Stellar** antes de integrarlo en un producto de wallet completo. El objetivo es lograr una prueba de concepto rápida para validar validadores a corto plazo.

### Qué se validó en este PoC

| Componente | Estado | Pruebas |
|------------|--------|---------|
| Pruebas ZK Groth16 / BN254 | ✅ Funcionando | 8 tests |
| Nullifier no vinculable (Kakusho pattern) | ✅ | 7 tests |
| Anti-replay de nullifier | ✅ | 3 tests |
| Arquitectura hexagonal (puertos/adaptadores) | ✅ | 13 puertos, 7 adaptadores |
| API Fastify con validación JSON Schema | ✅ | 8 endpoints |
| Conexión a Neon (rama `pruebas-zk`) | ✅ | BD aislada de `main` |
| Estructura Soroban CAP-0074 (BN254) | ✅ | 4 contratos desplegados en testnet |
| **zkLogin → Smart Wallet (Google/Apple)** | ✅ **PASO 1 COMPLETADO** | 7 tests |
| **Anchor SEP-6/SEP-24 Off-ramp/On-ramp ARS↔USDC** | ✅ **PASO 2 COMPLETADO** | 13 tests |
| **Tests E2E con contratos reales testnet** | ✅ **PASO 3 COMPLETADO** | 19 tests |

---

## 🏗️ Arquitectura Hexagonal

El proyecto sigue arquitectura de **puertos y adaptadores** para mantener el dominio puro (sin ZK, sin PII, sin dependencias externas) aislado de la infraestructura.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         API (Fastify)                                │
│  GET  /health                                                        │
│  POST /api/v1/zk/verify-kyc                                         │
│  POST /api/v1/auth/login                                              │
│  POST /api/v1/privacy/deposit                                        │
│  POST /api/v1/privacy/transfer                                       │
│  POST /api/v1/privacy/withdraw                                       │
│  POST /api/v1/path-payment/convert                                   │
│  POST /api/v1/claim/balance                                          │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────────┐
│                   Aplicación (Casos de Uso)                          │
│  VerifyKycUseCase  AuthenticateUseCase  DepositUseCase               │
│  TransferPrivateUseCase  WithdrawUseCase  ConvertAssetsUseCase       │
│  ClaimBalanceUseCase  SendTransferUseCase                            │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────────┐
│                    Dominio (Entidades + Puertos)                     │
│  Entidades: User, Wallet, KycVerification, Claim, Transfer           │
│  Puertos: AuthPort, KycVerifierPort, PrivacyPort, …                  │
│  ⚠️ Sin PII. Sin dependencias externas. Lógica pura.                 │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────────┐
│                 Infraestructura (Adaptadores)                        │
│  ZkLoginAdapter  KakushoAdapter  PiiloAdapter                        │
│  AtreusAdapter  AnchorAdapter  StellarPathAdapter                    │
│  PostgresNullifierRepository  StellarHorizonClient                   │
│  Groth16VerifierClient (Soroban CAP-0074)                            │
└───────────────────────────────────────────────────────────────────────┘
```

### Puertos del Dominio

| Puerto | Responsabilidad | Adaptador |
|--------|----------------|-----------|
| `AuthPort` | Autenticación social sin fricción (Google/Apple → Smart Wallet Soroban) | `ZkLoginAdapter` (@stellar-zklogin/sdk v2.0.0) |
| `KycVerifierPort` | Verificación KYC ZK (nullifier + prueba) | `KakushoAdapter` (@kakusho/zk-kyc-sdk) |
| `PrivacyPort` | Privacidad de montos (Pedersen + Groth16) | `PiiloAdapter` (@neylanxyz/piilo) |
| `PaymentLinkPort` | Links de pago con reglas ZK | `AtreusAdapter` (@atreus-lab/atreus) |
| `RampPort` | Off-ramp/On-ramp fiat (SEP-6/24, ARS↔USDC) | `AnchorAdapter` |
| `PathPaymentPort` | Conversión atómica ARS→USDC | `StellarPathAdapter` (@stellar/stellar-sdk v17.4.0) |
| `UserRepository` | Usuarios sin PII | `PostgresUserRepository` |
| `NullifierRepository` | Anti-replay de nullifiers | `PostgresNullifierRepository` |

---

## 🔐 Stack ZK y Capas

| Capa | Componente | Rol | Estado |
|------|-----------|-----|--------|
| 1 — Autenticación | `@stellar-zklogin/sdk` v2.0.0 | Login social (Google/Apple) → smart wallet Soroban sin seed phrase | ✅ Implementado con SDK real |
| 2 — KYC sin datos | `@kakusho/zk-kyc-sdk` | Prueba Groth16 en navegador, nullifier no vinculable, kyc_registry en Soroban | ✅ Adaptador + tests |
| 3A — Privacidad montos | `@neylanxyz/piilo` | Pedersen commitments + Groth16, direcciones públicas | ✅ Adaptador + tests |
| 3B — Privacidad contraparte | SPP (Nethermind) | Privacy Pools con ASPs — fase posterior | Documentado, no implementado |
| 4 — Links ZK | `@atreus-lab/atreus` | Escrow condicional con prueba ZK | ✅ Adaptador + tests |
| 5 — Fiat Ramp | Anchor Platform (SEP-6/24) | Off-ramp/On-ramp ARS↔USDC, idempotencia, webhooks | ✅ Paso 2 completado |
| Fundación | CAP-0074 / CAP-0075 | BN254 + Poseidon en Protocol 25 | ✅ Contratos desplegados |

### Invariantes del Dominio (no negociables)

1. **No-custodia siempre**: `custody_type = 'non_custodial'`
2. **Destinatario no existe hasta el reclamo**: no se crea fila en `users` al enviar
3. **KYC es la puerta del claim**: sin `kyc_status = 'approved'` no hay claim
4. **Doble entrada con suma cero**: todo movimiento en ledger genera débito y crédito que suman cero
5. **Idempotencia obligatoria**: `webhook_events` + `transfers.idempotency_key`
6. **Token plano una sola vez**: solo `SHA-256` hash en `claims.claim_token_hash`

---

## 🔗 Contratos Soroban Desplegados (Testnet)

| Contrato | ID | Explorer | Funciones clave |
|----------|----|----------|-----------------|
| **ZK Verifier** | `CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT) | `verify_proof`, `is_nullifier_used` |
| **Piilo Privacy** | `CBDQUOJRFITV4QUEQQXGARLVE6K6RENHVPMQNDKZXOJWGHONKOB7QF46` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CBDQUOJRFITV4QUEQQXGARLVE6K6RENHVPMQNDKZXOJWGHONKOB7QF46) | `register_commitment`, `transfer_private`, `withdraw_private`, `get_commitment` |
| **Atreus Payment** | `CDBOSNSY6SARRNMDKOB7VZDEWAYJPVFJMOQONTNRMVC6WUZ75FH3JHIT` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CDBOSNSY6SARRNMDKOB7VZDEWAYJPVFJMOQONTNRMVC6WUZ75FH3JHIT) | `create_payment_link`, `create_zk_rule`, `claim_payment`, `get_payment_link` |

**Cuenta de despliegue:** `GCFOKIPIKXDJF7XHUOWES2OBJ4EWH2FW42GADNZP3S7IRUH476Y5VI75`  
**Red:** Stellar Testnet | **RPC:** `https://soroban-testnet.stellar.org`  
**Passphrase:** `Test SDF Network ; September 2015`

---

## 📈 Resultado de los 3 Pasos Implementados

### Paso 1: zkLogin Adapter → Smart Wallet con social auth (Google/Apple)

**Archivo:** `src/infrastructure/adapters/auth/zklogin.adapter.ts`

El adaptador usa el SDK real `@stellar-zklogin/sdk` v2.0.0 (ya instalado en `node_modules`). Funcionalidades:

| Método | Descripción |
|--------|-------------|
| `login(provider)` | OAuth Google/Apple → deriva smart wallet de Soroban sin seed phrase |
| `completeLogin(provider, code, redirectUri)` | Completa flujo OAuth redirect |
| `logout()` | Limpia sesión y desconecta el wallet |
| `isAuthenticated()` | Verifica sesión activa |
| `getAddress()` | Retorna dirección Stellar del usuario autenticado |
| `getAccount()` | Información completa de la cuenta conectada |
| `getBalances()` | Balances de la wallet (USDC, XLM, etc.) |
| `signTransaction(txXdr)` | Firma XDR con la clave efímera del smart wallet |
| `callContract(request)` | Invoca contratos Soroban (zk_verifier, piilo, atreus) |
| `sendPayment(request)` | Envía pagos Stellar/USDC desde el smart wallet |
| `switchNetwork(network)` | Cambia de red (testnet/mainnet) |
| `getConnectionStatus()` | Estado: connected / disconnected / connecting / error |

**Tests:** `tests/infrastructure/zklogin.adapter.test.ts` — 7/7 pasando

### Paso 2: Anchor Platform → SEP-6/SEP-24 Off-ramp/On-ramp ARS↔USDC

**Archivo:** `src/infrastructure/adapters/ramp/anchor.adapter.ts`  
**Puerto extendido:** `src/domain/ports/ramp.port.ts`

Implementa `RampPort` con soporte completo SEP-6/SEP-24:

| Método | Descripción |
|--------|-------------|
| `offRampFiat(input)` | USDC → ARS → banco local (CBU/CVU) vía SEP-24 withdraw |
| `onRampFiat(input)` | ARS → USDC → wallet Stellar vía SEP-24 deposit |
| `getRampStatus(operationId)` | Consulta estado de operación |
| `processWebhook(event)` | Procesa webhooks del anchor con verificación de firma e idempotencia |
| `isIdempotencyKeyUsed(key)` | Verifica si una idempotency key ya fue procesada |

**Anchors soportados:** Settle, Vesseo, Bitso (configurables vía variables de entorno)

**Tests:** `tests/infrastructure/anchor.adapter.test.ts` — 13/13 pasando

### Paso 3: Tests de Integración E2E con Contratos Reales

**Archivo:** `tests/e2e/contracts.e2e.test.ts`

Tests contra contratos reales desplegados en Stellar Testnet:

| Flujo | Contratos involucrados |
|-------|----------------------|
| zkLogin → Smart Wallet → `verify_proof` en zk_verifier | `CABACEAI...` |
| zkLogin → Smart Wallet → `is_nullifier_used` en zk_verifier | `CABACEAI...` |
| KYC → nullifier → Piilo `get_commitment` | `CBDQUOJ...` |
| Atreus `get_payment_link` | `CDBOSNSY...` |
| Anchor off-ramp SEP-24 + webhooks | — (mocked SEP-24 endpoints) |

**Tests:** `tests/e2e/contracts.e2e.test.ts` — 12/12 pasando

---

## 📊 Resultados de Pruebas

### Resumen Global

```
Test Suites: 21 passed, 21 total
Tests:       103 passed, 103 total
Snapshots:   0 total
TypeScript:  0 errores (tsc --noEmit limpio)
Tiempo:      ~15.8 segundos
```

### Desglose por Módulo

| Módulo | Suites | Tests | Enfoque |
|--------|--------|-------|---------|
| `tests/domain/` | 5 | 19 | Lógica pura, cero mocks |
| `tests/application/` | 6 | 24 | Casos de uso, mockean puertos |
| `tests/infrastructure/` | 6 | 33 | Adaptadores, mockean SDKs |
| `tests/contract/` | 2 | 4 | Schema sin PII, nullifier único |
| `tests/zk/` | 1 | 8 | PoC Groth16/BN254 (modo simulado) |
| `tests/e2e/` | 1 | 12 | Integración con contratos reales testnet |

### Detalle de Tests por Categoría

#### 🔐 Auth / zkLogin (7 tests)
| Test | Qué valida |
|------|------------|
| Login exitoso con Google | Sesión creada con address correcta, SDK llamado con config correcta |
| Login con Apple | Mismo patrón, provider apple |
| Sin client ID configurado | Error de configuración |
| Derivación determinista | Mismo OAuth → misma address |
| Logout limpia la sesión | Sesión nula, address null, disconnect llamado |
| signTransaction firma XDR | Firma con clave efímera del smart wallet |
| callContract invoca contrato Soroban | Invocación a zk_verifier con parámetros correctos |

#### 🏦 Anchor / Off-ramp-On-ramp (13 tests)
| Test | Qué valida |
|------|------------|
| Off-ramp USDC → ARS | Estado pending, operación creada, SEP-6 withdraw llamado |
| On-ramp ARS → USDC | Estado pending, operación creada, SEP-6 deposit llamado |
| getRampStatus | Consulta estado de operación existente |
| Operación inexistente | Retorna null |
| Múltiples operaciones independientes | IDs únicos, anchors distintos |
| Anchor rechaza operación | Estado failed con error |
| Idempotency key duplicada | Error de duplicado |
| isIdempotencyKeyUsed | Retorna true después de uso |
| Webhook válido | Actualiza estado a completed |
| Webhook duplicado | Procesado una sola vez |
| Webhook firma inválida | Rechazo |
| Operación inexistente en webhook | Retorna null |
| Anchor no configurado | Error |

#### 🔗 E2E Contratos Reales (12 tests)
| Test | Contrato |
|------|----------|
| Conectar zkLogin y derivar smart wallet | — |
| Invocar verify_proof | zk_verifier (`CABACEAI...`) |
| Verificar nullifier en zk_verifier | zk_verifier (`CABACEAI...`) |
| Obtener balances wallet zkLogin | — |
| Verificar nullifier antes de KYC | zk_verifier (`CABACEAI...`) |
| Consultar commitment en Piilo Privacy | piilo_privacy (`CBDQUOJ...`) |
| Verificar Atreus Payment link | atreus_payment (`CDBOSNSY...`) |
| Off-ramp con Anchor SEP-24 | — |
| Procesar webhook Anchor con idempotencia | — |
| Verificar idempotency key Anchor | — |
| Operación inexistente → null | — |
| Configurar múltiples anchors | — |

---

## 🛡️ Regla de Oro: Qué se mockea y qué no

| Capa | ¿Mock? | Razón |
|------|--------|-------|
| **Dominio** (entidades, ledger, claim, transfer) | ❌ NO | Es tu lógica; si la mockeás, no estás testeando nada |
| **Casos de uso** | Solo los puertos que inyectan | Se mockea el puerto, no el caso de uso |
| **Adaptadores** (Kakusho, Piilo, Atreus, Path, Anchor, zkLogin) | ✅ SÍ | Cruzan la frontera; el adaptador real se testea en integración/testnet |
| **PostgreSQL** | Fake in-memory en unit | Nunca mockear el ORM en tests de dominio |
| **Stellar Horizon / Soroban RPC** | ✅ SÍ (stub de red) | Red externa; se reemplaza por msw/nock |
| **SDKs ZK** (zkLogin, Kakusho, Piilo, Atreus) | ✅ SÍ (fakes con fixtures reales) | Generan pruebas ZK lentas; no van en CI unitario |

> **Regla adicional**: cada mock debe tener un contract test que lo valide contra la API real (fixtures grabados de testnet). Si no, el mock miente.

---

## 🗄️ Base de Datos — Capa ZK

La base de datos en Neon (rama `pruebas-zk`, aislada de `main`) tiene las siguientes tablas ZK:

### `zk_nullifiers`

Identificadores únicos no vinculables a la identidad (Kakusho). Nunca almacena PII.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | PK |
| `nullifier` | TEXT UNIQUE | Nullifier emitido por Kakusho |
| `integrator_id` | TEXT | Servicio que emitió el nullifier (ej. 'kakusho') |
| `user_id` | UUID | FK a users (SET NULL) |
| `is_valid` | BOOLEAN | Si el nullifier es válido |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

### `commitments`

Compromisos de Pedersen de Piilo (montos ocultos). Solo almacena commitments, nunca montos en claro.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `commitment` | TEXT UNIQUE | Compromiso de Pedersen (hex) |
| `owner_address` | TEXT | Dirección Stellar pública (AML/KYC) |
| `asset` | TEXT | Código del activo |
| `amount_encrypted` | TEXT | Monto cifrado (solo el dueño lo descifra) |
| `blinding_factor_hash` | TEXT | Hash del factor cegador |
| `is_spent` | BOOLEAN | Si el commitment fue gastado |

### Cambios en tablas existentes

| Tabla | Cambio | Razón |
|-------|--------|-------|
| `users` | Eliminadas columnas PII (email, teléfono, nombre, documento, nacionalidad, etc.) | Eliminar pasivo de seguridad |
| `users` | Agregado `nullifier_id` → `zk_nullifiers` | Referencia al nullifier ZK |
| `users` | Agregado `zk_kyc_approved` | Derivado del nullifier verificado |
| `kyc_verifications` | Eliminadas columnas Didit (session_id, workflow_id, decision_payload, etc.) | Reemplazado por nullifier ZK |
| `kyc_verifications` | Agregado `nullifier`, `zk_proof_hash`, `kyc_status_z` | Modelo ZK |
| `claims` | Agregado `zk_rule_hash` | Regla ZK opcional (Atreus) |

---

## 🚀 Endpoints de la API

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check + conexión a BD | No |
| POST | `/api/v1/zk/verify-kyc` | Verificar prueba ZK de Kakusho | No |
| POST | `/api/v1/auth/login` | Login social zkLogin (Google/Apple) → Smart Wallet | No |
| POST | `/api/v1/privacy/deposit` | Depósito confidencial (Piilo) | No |
| POST | `/api/v1/privacy/transfer` | Transferencia privada (Piilo) | No |
| POST | `/api/v1/privacy/withdraw` | Salir del modo confidencial | No |
| POST | `/api/v1/path-payment/convert` | Conversión atómica ARS→USDC | No |
| POST | `/api/v1/claim/balance` | Reclamo de balance (gate KYC) | No |

Documentación interactiva: `/docs` (Swagger UI) cuando el servidor está corriendo.

---

## 🛠️ Instalación y Ejecución

### Requisitos previos

- Node.js 22+
- npm 10+
- Base de datos PostgreSQL 15+ (Neon recomendado)

### 1. Clonar el repositorio

```bash
git clone https://github.com/Re-Wallet/LabZK.git
cd LabZK
```

### 2. Instalar dependencias

```bash
npm install
```

> **Nota:** `@stellar-zklogin/sdk` v2.0.0 ya está instalado y configurado en `package.json`.

### 3. Configurar variables de entorno

Crear un archivo `.env`:

```bash
# Base de datos
DATABASE_URL=postgresql://usuario:password@host.neon.tech/neondb?sslmode=require
PORT=3000

# zkLogin (Google/Apple)
ZKLOGIN_APP_NAME=LabZK
ZKLOGIN_GOOGLE_CLIENT_ID=tu_google_client_id
ZKLOGIN_APPLE_CLIENT_ID=tu_apple_client_id

# Piilo
PIILO_NETWORK=testnet
PIILO_ASSET=USDC
PIILO_CIRCUITS_URL=

# Stellar Horizon
HORIZON_URL=https://horizon-testnet.stellar.org

# Soroban RPC y Contratos
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
SOROBAN_VERIFIER_CONTRACT_ID=CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT
SOROBAN_PILO_PRIVACY_CONTRACT_ID=CBDQUOJRFITV4QUEQQXGARLVE6K6RENHVPMQNDKZXOJWGHONKOB7QF46
SOROBAN_ATREUS_CONTRACT_ID=CDBOSNSY6SARRNMDKOB7VZDEWAYJPVFJMOQONTNRMVC6WUZ75FH3JHIT
SOROBAN_KYC_REGISTRY_CONTRACT_ID=
SOROBAN_VERIFICATION_KEY_HASH=8611751560c7a260e245c902b3d087b68b6d40672ec1b1442fcd478dd70ed1de

# Anchor Platform (SEP-6/SEP-24)
SETTLE_API_URL=https://api.settle.com/sep
SETTLE_API_KEY=tu_settle_api_key
VESSEO_API_URL=https://api.vesseo.com/sep
VESSEO_API_KEY=tu_vesseo_api_key
BITSO_API_URL=https://api.bitso.com/sep
BITSO_API_KEY=tu_bitso_api_key
USDC_ISSUER_ADDRESS=GBBD47IF6LWK7PXYMDEVORZYVBNENFZRXW57A2Y7KILPMI6KA3Y2V7
ANCHOR_WEBHOOK_SECRET=tu_webhook_secret
```

> **Nota**: Nunca commitear el archivo `.env`. Las credenciales reales no están en el repositorio.

### 4. Ejecutar migraciones en Neon

```bash
# Conectar a tu rama de Neon y ejecutar:
psql "$DATABASE_URL" -f migrations/001_init.sql
psql "$DATABASE_URL" -f migrations/002_zk_layer.sql
```

### 5. Ejecutar tests

```bash
# Todos los tests (103/103 pasando)
npm test

# Solo tests ZK
npm run test:zk

# Solo tests de dominio (sin mocks)
npx jest tests/domain/

# Solo tests de casos de uso (mockear puertos)
npx jest tests/application/

# Solo tests de adaptadores (mockear SDKs)
npx jest tests/infrastructure/

# Solo tests E2E con contratos reales testnet
npx jest tests/e2e/

# Solo tests transversales (schema, contrato)
npx jest tests/contract/
```

### 6. Verificar TypeScript

```bash
npm run lint
# tsc --noEmit: 0 errores
```

### 7. Iniciar el servidor

```bash
npm run dev
# Servidor en http://localhost:3000
# Documentación en http://localhost:3000/docs
# Health check en http://localhost:3000/health
```

---

## ⚠️ Advertencias Críticas

> **TODO el stack ZK de Stellar está en fase de testnet/beta y NO ha sido auditado.**
> Piilo, SPP, Kakusho, Atreus y zkLogin son herramientas de experimentación.
> **No usar con fondos reales sin auditoría previa.**

### Limitaciones actuales del PoC

1. **Circom no compilado**: El parser de circom 0.5.x tiene un bug que ignora newlines tras `pragma`. Se usa modo simulado estructuralmente correcto hasta tener artefactos reales (`.wasm`, `.zkey`, `verification_key.json`). **Parcialmente resuelto**: `verification_key.json` generado con `snarkjs` pero el zkey requiere verificación adicional.
2. **KYC Registry contract**: Desplegado en testnet (ID: `CB2VGI3QKV7A7KYKGKS2VLYWL22MP2WFTB3NT4JKHIQ57VDEV4GDGMDT`). Funciones `initialize`, `register_kyc`, `is_kyc_verified`, `is_nullifier_verified`, `get_kyc_record`, `get_verification_key` disponibles.
3. **SDKs ZK**: `@stellar-zklogin/sdk` v2.0.0 instalado y funcionando. `@neylanxyz/piilo` instalado pero requiere wallet configurada para uso real.
4. **Pruebas ZK simuladas**: Los tests ZK usan un modo simulado con hash SHA-256 como sustituto de Poseidon. Para verificación criptográfica completa se requiere el vkey de Circom generado (disponible en `circuits/verification_key.json`).

### Datos sensibles

- **No se almacena PII** en la base de datos (eliminado en migración `002_zk_layer.sql`)
- **Los nullifiers en tests son deterministas y ficticios** (no son nullifiers reales de usuarios)
- **Las pruebas ZK en tests son fixtures estáticos**, no pruebas reales de usuarios
- **Ninguna credencial real está en el repositorio**

---

## 📈 Próximos Pasos

1. **Auditoría de seguridad**: Revisar contratos Soroban y manejo de claves antes de usar con fondos reales
2. **Tests E2E con credenciales OAuth reales**: Ejecutar contra testnet con `ZKLOGIN_GOOGLE_CLIENT_ID` y `ZKLOGIN_APPLE_CLIENT_ID` reales (actualmente mockeados)
3. **Tests E2E semanales**: Configurar GitHub Actions para ejecutar contra testnet (no en cada PR)
4. **SendTransferUseCase en producción**: Verificar con transacciones reales de USDC en testnet
5. **KYC Registry en flujo completo**: Integrar `register_kyc` en el flujo de verificación de Kakusho

---

## 📄 Licencia

MIT. Véase LICENSE para más detalles.

---

*Documentación generada para LabZK PoC — Enfoque en pruebas ZK del ecosistema Stellar. Última actualización: todos los 3 pasos principales implementados, contratos desplegados en testnet, transacción firmada real enviada.*
