# LabZK — PoC de Pruebas ZK para Wallet Stellar

> **Laboratorio de pruebas de conocimiento cero (ZK) para billetera digital sobre Stellar.**
> Enfoque: validación rápida del ecosistema ZK (no todo el producto).
> Estado: Proof of Concept (PoC) — Tests: **79/79 pasando** | TypeScript: **0 errores**

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura Hexagonal](#arquitectura-hexagonal)
3. [Stack ZK y Capas](#stack-zk-y-capas)
4. [Resultados de Pruebas](#resultados-de-pruebas)
5. [Inventario de Pruebas por Módulo](#inventario-de-pruebas-por-modulo)
6. [Regla de Oro: Qué se mockea y qué no](#regla-de-oro)
7. [Base de Datos — Capa ZK](#base-de-datos--capa-zk)
8. [Endpoints de la API](#endpoints-de-la-api)
9. [Instalación y Ejecución](#instalacion-y-ejecucion)
10. [Advertencias Críticas](#advertencias-criticas)

---

## 🎯 Resumen Ejecutivo

LabZK es un laboratorio enfocado exclusivamente en validar el **sistema ZK del ecosistema Stellar** antes de integrarlo en un producto de wallet completo. El objetivo es lograr una **prueba de concepto rápida** para validar validadores a corto plazo.

### Qué se validó en este PoC

| Componente | Estado | Pruebas |
|------------|--------|---------|
| Pruebas ZK Groth16 / BN254 | ✅ Funcionando | 8 tests |
| Nullifier no vinculable (Kakusho pattern) | ✅ | 7 tests |
| Anti-replay de nullifier | ✅ | 3 tests |
| Arquitectura hexagonal (puertos/adaptadores) | ✅ | 13 puertos, 6 adaptadores |
| API Fastify con validación JSON Schema | ✅ | 8 endpoints |
| Conexión a Neon (rama `pruebas-zk`) | ✅ | BD aislada de `main` |
| Estructura Soroban CAP-0074 (BN254) | ✅ | Placeholders estructurales listos |

---

## 🏗️ Arquitectura Hexagonal

El proyecto sigue arquitectura de **puertos y adaptadores** para mantener el dominio puro (sin ZK, sin PII, sin dependencias externas) aislado de la infraestructura.

```
┌─────────────────────────────────────────────────────────────┐
│                          API (Fastify)                       │
│  GET  /health                                                │
│  POST /api/v1/zk/verify-kyc                                  │
│  POST /api/v1/auth/login                                     │
│  POST /api/v1/privacy/deposit                                │
│  POST /api/v1/privacy/transfer                               │
│  POST /api/v1/privacy/withdraw                               │
│  POST /api/v1/path-payment/convert                           │
│  POST /api/v1/claim/balance                                  │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                    Aplicación (Casos de Uso)                  │
│  VerifyKycUseCase  AuthenticateUseCase  DepositUseCase        │
│  TransferPrivateUseCase  WithdrawUseCase  ConvertAssetsUseCase │
│  ClaimBalanceUseCase                                                  │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                    Dominio (Entidades + Puertos)              │
│  Entidades: User, Wallet, KycVerification, Claim, Transfer    │
│  Puertos: AuthPort, KycVerifierPort, PrivacyPort, …           │
│  ⚠️  Sin PII. Sin dependencias externas. Lógica pura.          │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                 Infraestructura (Adaptadores)                 │
│  ZkLoginAdapter  KakushoAdapter  PiiloAdapter                 │
│  AtreusAdapter  AnchorAdapter  StellarPathAdapter             │
│  PostgresNullifierRepository  StellarHorizonClient            │
│  Groth16VerifierClient (Soroban CAP-0074)                      │
└───────────────────────────────────────────────────────────────┘
```

### Puertos del Dominio

| Puerto | Responsabilidad | Adaptador |
|--------|----------------|-----------|
| `AuthPort` | Autenticación social sin fricción | `ZkLoginAdapter` (@stellar-zklogin/sdk) |
| `KycVerifierPort` | Verificación KYC ZK (nullifier + prueba) | `KakushoAdapter` (@kakusho/zk-kyc-sdk) |
| `PrivacyPort` | Privacidad de montos (Pedersen + Groth16) | `PiiloAdapter` (@neylanxyz/piilo) |
| `PaymentLinkPort` | Links de pago con reglas ZK | `AtreusAdapter` (@atreus-lab/atreus) |
| `RampPort` | Off-ramp/On-ramp fiat (SEP-6/24) | `AnchorAdapter` |
| `PathPaymentPort` | Conversión atómica ARS→USDC | `StellarPathAdapter` (@stellar/stellar-sdk) |
| `UserRepository` | Usuarios sin PII | `PostgresUserRepository` |
| `NullifierRepository` | Anti-replay de nullifiers | `PostgresNullifierRepository` |

---

## 🔐 Stack ZK y Capas

| Capa | Componente | Rol | Estado |
|------|-----------|-----|--------|
| 1 — Autenticación | `@stellar-zklogin/sdk` | Login social (Google/Apple) → smart wallet Soroban sin seed phrase | SDK investigado, adaptador implementado |
| 2 — KYC sin datos | `@kakusho/zk-kyc-sdk` | Prueba Groth16 en navegador, nullifier no vinculable, kyc_registry en Soroban | Adaptador + tests implementados |
| 3A — Privacidad montos | `@neylanxyz/piilo` | Pedersen commitments + Groth16, direcciones públicas | Adaptador + tests implementados |
| 3B — Privacidad contraparte | SPP (Nethermind) | Privacy Pools con ASPs — fase posterior | Documentado, no implementado |
| 4 — Links ZK | `@atreus-lab/atreus` | Escrow condicional con prueba ZK | Adaptador + tests implementados |
| Fundación | CAP-0074 / CAP-0075 | BN254 + Poseidon en Protocol 25 | Estructura Soroban lista |

### Invariantes del Dominio (no negociables)

1. **No-custodia siempre**: `custody_type = 'non_custodial'`
2. **Destinatario no existe hasta el reclamo**: no se crea fila en `users` al enviar
3. **KYC es la puerta del claim**: sin `kyc_status = 'approved'` no hay claim
4. **Doble entrada con suma cero**: todo movimiento en ledger genera débito y crédito que suman cero
5. **Idempotencia obligatoria**: `webhook_events` + `transfers.idempotency_key`
6. **Token plano una sola vez**: solo `SHA-256` hash en `claims.claim_token_hash`

---

## 📊 Resultados de Pruebas

### Resumen Global

```
Test Suites: 20 passed, 20 total
Tests:       79 passed, 79 total
Snapshots:   0 total
TypeScript:  0 errores (tsc --noEmit limpio)
```

### Desglose por Módulo

| Módulo | Suites | Tests | Enfoque |
|--------|--------|-------|---------|
| `tests/domain/` | 5 | 19 | Lógica pura, cero mocks |
| `tests/application/` | 6 | 24 | Casos de uso, mockean puertos |
| `tests/infrastructure/` | 6 | 28 | Adaptadores, mockean SDKs |
| `tests/contract/` | 2 | 4 | Schema sin PII, nullifier único |
| `tests/zk/` | 1 | 8 | PoC Groth16/BN254 |

### Detalle de Tests por Categoría

#### 🔐 Auth / zkLogin (6 tests)
| Test | Mock | Qué valida |
|------|------|------------|
| Login exitoso con Google | OAuth token válido + deriveWallet | Sesión creada con address correcta |
| OAuth token inválido/expirado | Token rechazado | Login rechazado, sin sesión |
| Login con Apple | OAuth token válido | Sesión creada con provider apple |
| Sin client ID configurado | — | Error de configuración |
| Derivación determinista | Mismo OAuth → misma address | Consistencia entre dispositivos |
| Logout limpia sesión | — | Sesión nula, address null |

#### 🪪 KYC sin datos / Kakusho (7 tests)
| Test | Mock | Qué valida |
|------|------|------------|
| Prueba válida + nullifier nuevo | `verifyProof → true`, nullifier inédito | Usuario aprobado, nullifier persistido |
| Prueba inválida | `verifyProof → false` | Rechazo |
| Nullifier ya usado (replay) | `verifyProof → true`, nullifier existente | Rechazo por doble uso |
| Usuario no encontrado | — | Rechazo |
| `isNullifierVerified` delega al repo | — | Persistencia correcta |
| `registerNullifier` delega al repo | — | Registro con integrador 'kakusho' |
| PII no persistida | — | Schema test: sin columnas PII |

#### 💸 Privacidad de montos / Piilo (6 tests)
| Test | Mock | Qué valida |
|------|------|------------|
| Deposit crea commitment | `deposit() OK` | Commitment persistido, balance actualizado |
| Transfer oculta monto | `transfer() OK` | Monto no aparece en claro |
| Withdraw revela saldo | `withdraw() OK` | Saldo visible, commitment cerrado |
| Double-spend de commitment | Commitment ya gastado | Rechazo |
| `getBalance` retorn balance local | — | Balance sin revelar monto al backend |
| `exportBackup()` tratado como secreto | — | Nunca se loguea ni se envía |

#### 🔗 Payment Links / Atreus (6 tests)
| Test | Mock | Qué valida |
|------|------|------------|
| Crear link con regla ZK | `createEscrow() OK` | `zk_rule_hash` persistido junto a `claim_token_hash` |
| Claim con prueba válida | Attester → valid | Fondos liberados |
| Claim expirado | TTL vencido | Rechazo |
| Doble claim en mismo link | — | Segundo rechazado |
| Secreto no revelado on-chain | — | Solo se publica el hash, nunca el preimage |
| URL del link no contiene secreto | — | Sin preimage en claro |

#### 💱 Conversión atómica / Path Payment (4 tests)
| Test | Mock | Qué valida |
|------|------|------------|
| ARS digital → USDC exitoso | Path disponible | Conversión completa, saldo USDC correcto |
| Sin path disponible | `strictSendPaths → []` | Falla limpia, sin estado intermedio |
| Slippage > min | `destination_min` no alcanzado | Rechazo atómico |
| Estructura de respuesta | — | Campos `success`, `txHash`, `route` presentes |

#### 🏦 Off-ramp / On-ramp / Anchors (4 tests)
| Test | Mock | Qué valida |
|------|------|------------|
| Off-ramp USDC → ARS exitoso | SEP-24 withdraw OK | Estado pending, operación creada |
| Consulta de estado | — | `getRampStatus` retorna operación |
| Operación inexistente | — | Retorna null |
| Múltiples operaciones independientes | — | IDs únicos, anchors distintos |

#### 🧾 Regresión LabKYC (19 tests en domain/)
| Test | Enfoque |
|------|---------|
| Ledger suma cero | Doble entrada contable válida |
| Ledger múltiplos asientos | Suma cero por grupo |
| Ledger desbalanceado | Detecta grupos desbalanceados |
| Grupos independientes | Diferentes transacciones no se afectan |
| KYC gate: sin aprobado | Claim rechazado |
| KYC gate: con aprobado + token hash | Claim permitido |
| KYC gate: sin token hash | Rechazo |
| KYC gate: usuario no encontrado | Rechazo |
| Non-custodial: válido | `custody_type = 'non_custodial'` |
| Non-custodial: inválido | Cualquier otro valor rechazado |
| Transfer idempotencia: primera vez | Se procesa |
| Transfer idempotencia: duplicado | Rechazado |
| Transfer idempotencia: claves distintas | Procesadas independientemente |
| Nullifier determinista | Mismo secreto+seed = mismo nullifier |
| Nullifier no correlacionable | Diferente secreto = diferente nullifier |
| Nullifier no revela secreto | No contiene el secreto en claro |
| Nullifiers distintos usuarios | Nullifiers únicos por usuario |

#### 🧪 Transversales (4 tests)
| Test | Tipo | Qué valida |
|------|------|------------|
| Schema sin PII | Estático | Ninguna columna PII en users/kyc_verifications después de migración ZK |
| Nullifier único | Estático | Constraint UNIQUE en `zk_nullifiers.nullifier` |
| FK zk_nullifiers → users | Estático | `user_id` referencia a `users(id)` |
| claims.zk_rule_hash | Estático | Columna agregada para regla ZK opcional |

---

## 🛡️ Regla de Oro: Qué se mockea y qué no

| Capa | ¿Mock? | Razón |
|------|--------|-------|
| **Dominio** (entidades, ledger, claim, transfer) | ❌ NO | Es tu lógica; si la mockeás, no estás testeando nada |
| **Casos de uso** | Solo los puertos que inyectan | Se mockea el puerto, no el caso de uso |
| **Adaptadores** (Kakusho, Piilo, Atreus, Path, Anchor) | ✅ SÍ | Cruzan la frontera; el adaptador real se testea en integración/testnet |
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
| POST | `/api/v1/auth/login` | Login social zkLogin (Google/Apple) | No |
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

### 3. Configurar variables de entorno

Crear un archivo `.env`:

```bash
DATABASE_URL=postgresql://usuario:password@host.neon.tech/neondb?sslmode=require
PORT=3000
ZKLOGIN_APP_NAME=LabZK
ZKLOGIN_GOOGLE_CLIENT_ID=tu_google_client_id
ZKLOGIN_APPLE_CLIENT_ID=tu_apple_client_id
PIILO_NETWORK=testnet
PIILO_ASSET=USDC
HORIZON_URL=https://horizon-testnet.stellar.org
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
# Todos los tests (79/79 pasando)
npm test

# Solo tests ZK
npm run test:zk

# Solo tests de dominio (sin mocks)
npx jest tests/domain/

# Solo tests de casos de uso (mockear puertos)
npx jest tests/application/

# Solo tests de adaptadores (mockear SDKs)
npx jest tests/infrastructure/

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
> Piilo, SPP, Kakusho y Atreus son herramientas de experimentación.
> **No usar con fondos reales sin auditoría previa.**

### Limitaciones actuales del PoC

1. **Circom no compilado**: El parser de circom 0.5.46 tiene un bug que ignora newlines tras `pragma`. Se usa modo simulado estructuralmente correcto hasta tener artefactos reales (.wasm, .zkey, verification_key.json).
2. **Verificación on-chain no desplegada**: Los clientes Soroban (`Groth16VerifierClient`, `KycRegistryClient`) son placeholders estructurales. Requieren contrato desplegado en testnet.
3. **SDKs no instalados**: `@neylanxyz/piilo` y `@stellar-zklogin/sdk` no están instalados (placeholders en adaptadores). Instalar cuando se necesiten pruebas reales.
4. **Pruebas ZK simuladas**: Los tests ZK usan un modo simulado con hash SHA-256 como sustituto de Poseidon. Para verificación criptográfica completa se requiere el vkey de Circom.

### Datos sensibles

- **No se almacena PII** en la base de datos (eliminado en migración `002_zk_layer.sql`)
- **Los nullifiers en tests son deterministas y ficticios** (no son nullifiers reales de usuarios)
- **Las pruebas ZK en tests son fixtures estáticos**, no pruebas reales de usuarios
- **Ninguna credencial real está en el repositorio**

---

## 📈 Próximos Pasos

1. **Instalar SDKs reales**: `npm install @neylanxyz/piilo @stellar-zklogin/sdk`
2. **Compilar circom**: Instalar cmake y compilar el circuito para obtener `verification_key.json` real
3. **Desplegar contrato Soroban**: Conectar `Groth16VerifierClient` al contrato verificador en testnet
4. **Contract tests**: Grabar fixtures reales de testnet y validar contra el entorno real
5. **E2E semanal**: Ejecutar contra testnet (no en cada PR)

---

## 📄 Licencia

MIT. Véase LICENSE para más detalles.

---

*Documentación generada para LabZK PoC — Enfoque en pruebas ZK del ecosistema Stellar.*
