# Resultados de Pruebas — LabZK PoC ZK

**Fecha**: 2026-11-10
**Repositorio**: https://github.com/Re-Wallet/LabZK
**Rama**: main
**Commit**: ae27724

---

## 📊 Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **Test Suites** | 20 / 20 pasando |
| **Tests Totales** | 79 / 79 pasando |
| **TypeScript** | 0 errores (`tsc --noEmit` limpio) |
| **Enfoque** | Pruebas ZK del ecosistema Stellar |
| **Regla de oro** | Mockear frontera, nunca dominio |

---

## 🧪 Desglose por Módulo

### tests/domain/ — Lógica Pura (Cero Mocks)

| Archivo | Suites | Tests | Enfoque |
|---------|--------|-------|---------|
| `ledger.invariant.test.ts` | 1 | 4 | Doble entrada contable, suma cero |
| `claim.gate.test.ts` | 1 | 3 | KYC como puerta del claim |
| `wallet.non-custodial.test.ts` | 1 | 3 | custody_type constante 'non_custodial' |
| `transfer.idempotency.test.ts` | 1 | 3 | idempotency_key previene duplicación |
| `kyc.nullifier-not-linkable.test.ts` | 1 | 6 | Nullifier no vinculable a identidad |
| **Total** | **5** | **19** | |

### tests/application/ — Casos de Uso (Mockean Puertos)

| Archivo | Suites | Tests | Puertos mockeados |
|---------|--------|-------|-------------------|
| `verify-kyc.use-case.test.ts` | 1 | 4 | KycVerifierPort, NullifierRepository, UserRepository |
| `authenticate.use-case.test.ts` | 1 | 3 | AuthPort |
| `deposit.use-case.test.ts` | 1 | 2 | PrivacyPort |
| `transfer-private.use-case.test.ts` | 1 | 2 | PrivacyPort |
| `convert-assets.use-case.test.ts` | 1 | 3 | PathPaymentPort |
| `claim-balance.use-case.test.ts` | 1 | 4 | UserRepository |
| **Total** | **6** | **18** | |

### tests/infrastructure/ — Adaptadores (Mockean SDKs Externos)

| Archivo | Suites | Tests | SDK mockeado |
|---------|--------|-------|--------------|
| `kakusho.adapter.test.ts` | 1 | 4 | @kakusho/zk-kyc-sdk + snarkjs |
| `piilo.adapter.test.ts` | 1 | 5 | @neylanxyz/piilo |
| `atreus.adapter.test.ts` | 1 | 5 | @atreus-lab/atreus |
| `stellar-path.adapter.test.ts` | 1 | 3 | @stellar/stellar-sdk (Horizon) |
| `zklogin.adapter.test.ts` | 1 | 5 | @stellar-zklogin/sdk |
| `anchor.adapter.test.ts` | 1 | 4 | Anchor Platform (SEP-6/24) |
| **Total** | **6** | **26** | |

### tests/contract/ — Transversales

| Archivo | Suites | Tests | Qué valida |
|---------|--------|-------|------------|
| `schema.no-pii.test.ts` | 1 | 7 | Sin columnas PII en BD después de migración ZK |
| `nullifier.uniqueness.test.ts` | 1 | 2 | Constraint UNIQUE en zk_nullifiers.nullifier |
| **Total** | **2** | **9** | |

### tests/zk/ — PoC ZK

| Archivo | Suites | Tests | Qué valida |
|---------|--------|-------|------------|
| `groth16.test.ts` | 1 | 8 | Groth16/BN254, nullifier determinista, anti-replay, no-revelación |
| **Total** | **1** | **8** | |

---

## 📈 Gran Totales

| Categoría | Suites | Tests | Porcentaje |
|-----------|--------|-------|------------|
| Dominio (sin mocks) | 5 | 19 | 24% |
| Casos de uso (mock puertos) | 6 | 18 | 23% |
| Adaptadores (mock SDKs) | 6 | 26 | 33% |
| Transversales | 2 | 9 | 11% |
| PoC ZK | 1 | 8 | 10% |
| **Total** | **20** | **79** | **100%** |

---

## ✅ Casos de Éxito Clave

### Dominio (Lógica Real, Sin Mocks)

1. **Ledger suma cero**: Un transfer válido tiene débito y crédito iguales. Un transfer desbalanceado es detectado.
2. **Claim gate KYC**: Sin `kycApproved = true`, el claim es rechazado. Con KYC aprobado y token hash, se permite.
3. **Non-custodial**: Solo `custody_type = 'non_custodial'` es válido.
4. **Transfer idempotencia**: La misma `idempotency_key` se rechaza como duplicado. Claves diferentes se procesan independientemente.
5. **Nullifier no vinculable**: Mismo secreto+seed = mismo nullifier (determinista). Diferente secreto = diferente nullifier (no correlacionable). El nullifier no revela el secreto.

### Transversales (Schema y Contrato)

1. **Sin PII**: Ninguna columna de PII (nombre, documento, email, teléfono, fecha de nacimiento, nacionalidad) existe en el DDL ZK después de la migración.
2. **Nullifier único**: `zk_nullifiers.nullifier` tiene constraint UNIQUE.
3. **FK válida**: `zk_nullifiers.user_id` referencia a `users(id)`.
4. **Claims ZK**: `claims.zk_rule_hash` existe para reglas ZK opcionales (Atreus).

### Casos de Uso (Mockean Puertos)

1. **VerifyKyc**: Prueba válida → aprobado. Prueba inválida → rechazado. Nullifier replay → rechazado por doble uso. Usuario no encontrado → rechazado.
2. **Authenticate**: Login Google/Apple exitoso → sesión con address. OAuth inválido → rechazado.
3. **Deposit**: Depósito confidencial exitoso → commitment persistido.
4. **TransferPrivate**: Transferencia oculta exitosa. Double-spend → rechazado.
5. **ConvertAssets**: Path payment exitoso → conversión completa. Sin path → falla limpia. Slippage > min → rechazo atómico.
6. **ClaimBalance**: Sin KYC aprobado → rechazado. Con KYC + token hash → permitido.

### Adaptadores (Mockean SDKs)

1. **Kakusho**: Prueba válida → aprobado. Prueba inválida → rechazado. `isNullifierVerified` y `registerNullifier` delegan al repositorio.
2. **Piilo**: Deposit/transfer/withdraw exitosos. `getBalance` retorna balance local. `exportBackup` tratado como secreto.
3. **Atreus**: Link con regla ZK creado. Claim válido → fondos liberados. Link expirado → rechazado. Doble claim → segundo rechazado. Secreto no revelado on-chain.
4. **StellarPath**: Conversión ARS→USDC exitosa. Ruta definida.
5. **ZkLogin**: Login Google/Apple exitoso. Sin client ID → error. Derivación determinista. Logout limpia sesión.
6. **Anchor**: Off-ramp creado con estado pending. Consulta de estado funciona. Operación inexistente → null.

---

## 🚫 Qué NO se testeó (por diseño)

| Elemento | Razón |
|----------|-------|
| Lógica de dominio mockeada | Nunca se mockea el dominio; se testa con lógica real |
| SDKs ZK reales en CI | Pruebas Groth16 en navegador son lentas; se usan fakes con fixtures |
| Verificación on-chain Soroban | Requiere contrato desplegado y Circom compilado (pendiente) |
| Conexión real a Neon en tests unitarios | Se usa fake in-memory para unit; Testcontainers para integración |
| Red externa (Horizon, anchors) | Se mockea con stubs de red |

---

## 🔒 Credibilidad sin Datos Sensibles

- **No se expone PII**: Ninguna columna de nombre, documento, email, teléfono, fecha de nacimiento o nacionalidad en la BD.
- **Nullifiers de prueba son ficticios**: Valores deterministas generados para tests, no nullifiers reales de usuarios.
- **Pruebas ZK son fixtures estáticos**: No se generan pruebas reales en cada test (es lento).
- **No hay credenciales en el repo**: Las variables de entorno (DATABASE_URL, OAuth IDs) no están commiteadas.
- **SHA-256 como sustituto de Poseidon**: En tests de dominio, se usa SHA-256 en lugar de Poseidon para evitar dependencia de Circom.

---

## 📦 Cómo Reproducir

```bash
# Clonar
git clone https://github.com/Re-Wallet/LabZK.git
cd LabZK

# Instalar
npm install

# Ejecutar todos los tests
npm test

# Verificar TypeScript
npm run lint

# Ejecutar solo tests ZK (PoC)
npm run test:zk
```

**Resultado esperado**: 79/79 tests pasando, 0 errores de TypeScript.

---
