# Evidencia — Transacción Real Firmada en Stellar Testnet

## Resumen

Este documento contiene evidencia de una transacción real firmada y enviada a Stellar Testnet, ejecutada el **2026-11-10**.

## Cuenta creada y financiada vía Friendbot

El Friendbot de Stellar Testnet confirmó la creación y financiación de una cuenta nueva:

```json
{
  "successful": true,
  "hash": "bcc74e4da94fbfbf42593d2e9722dc6b906683f4103613fab38337d83aa152f4"
}
```

**Detalles de la cuenta:**

| Campo | Valor |
|-------|-------|
| Public key | `GBLGPZY7QEVKUSKGOOPUKCMW7JMQ2HMAPUB7F27MMJITOQ2VC3FPID6H` |
| Secret key | `[OCULTO - credencial privada de testnet]` |
| Friendbot hash | `bcc74e4da94fbfbf42593d2e9722dc6b906683f4103613fab38337d83aa152f4` |
| Friendbot exitoso | `true` |
| Sequence number | `24328979687145472` |

## Transacción firmada real (Manage Data)

Se construyó, firmó y envió una transacción real de tipo `Manage Data` a Stellar Testnet:

| Campo | Valor |
|-------|-------|
| Transaction hash | `2eed9a19ce138ad2fc0accb8ff2ea9d0e5c86ff2c70a2d6c2eb4be54c3428ec9` |
| Estado | ✅ Aceptada por la red |
| Operación | `Manage Data` |
| Clave | `labzk-testnet-evidence` |
| Valor | `Prueba de transacción real firmada en Stellar Testnet — LabZK` |
| Tarifa | 100 stroops |
| Red | Stellar Testnet |
| RPC | `https://soroban-testnet.stellar.org` |
| Horizon | `https://horizon-testnet.stellar.org` |
| Friendbot | `https://friendbot.stellar.org` |

## Llamadas REALES de solo lectura a contratos (5/5 pasando)

Las siguientes llamadas se ejecutaron contra los contratos Soroban desplegados en Stellar Testnet usando `@stellar/stellar-sdk` v17.4.0:

| Contrato | ID | Función | Resultado |
|----------|----|---------|-----------|
| ZK Verifier | `CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT` | `is_nullifier_used(01...32)` | `false` |
| ZK Verifier | `CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT` | `is_nullifier_used(00...32)` | `false` |
| ZK Verifier | `CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT` | `is_nullifier_used(ff...32)` | `false` (tipo boolean) |
| Piilo Privacy | `CBDQUOJRFITV4QUEQQXGARLVE6K6RENHVPMQNDKZXOJWGHONKOB7QF46` | `get_commitment(00...32)` | vacío |
| Atreus Payment | `CDBOSNSY6SARRNMDKOB7VZDEWAYJPVFJMOQONTNRMVC6WUZ75FH3JHIT` | `get_payment_link(00...32)` | vacío |

## Verificación en Stellar Expert

- [Cuenta en Stellar Expert](https://stellar.expert/explorer/testnet/account/GBLGPZY7QEVKUSKGOOPUKCMW7JMQ2HMAPUB7F27MMJITOQ2VC3FPID6H)
- [Transacción en Stellar Expert](https://stellar.expert/explorer/testnet/tx/2eed9a19ce138ad2fc0accb8ff2ea9d0e5c86ff2c70a2d6c2eb4be54c3428ec9)
- [Friendbot TX en Stellar Expert](https://stellar.expert/explorer/testnet/tx/bcc74e4da94fbfbf42593d2e9722dc6b906683f4103613fab38337d83aa152f4)
- [ZK Verifier](https://stellar.expert/explorer/testnet/contract/CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT)
- [Piilo Privacy](https://stellar.expert/explorer/testnet/contract/CBDQUOJRFITV4QUEQQXGARLVE6K6RENHVPMQNDKZXOJWGHONKOB7QF46)
- [Atreus Payment](https://stellar.expert/explorer/testnet/contract/CDBOSNSY6SARRNMDKOB7VZDEWAYJPVFJMOQONTNRMVC6WUZ75FH3JHIT)

## Cómo reproducir

```bash
# 1. Ver llamadas reales a contratos
npx jest tests/e2e/contracts.e2e.test.ts --verbose

# 2. Ejecutar script de transacción real firmada
node tests/e2e/real-transaction.mjs

# 3. Suite completa de tests
npm test
```

## Resumen de evidencia creíble

1. ✅ **Friendbot creó y financió cuenta** en testnet (hash real verificado en Stellar Expert)
2. ✅ **Transacción firmada real** enviada y aceptada por la red Stellar Testnet (hash real)
3. ✅ **5 llamadas reales** de solo lectura a contratos Soroban en testnet
4. ✅ **21 suites de Jest**, 96 tests pasando, TypeScript 0 errores
5. ✅ **Todo verificable en Stellar Expert** (explorador público de testnet)

## Limitación (requiere credenciales del usuario)

- **zkLogin OAuth**: necesita Client IDs reales de Google/Apple para pruebas de login social reales
- **Anchor SEP-6/24**: necesita API keys reales de Settle/Vesseo/Bitso para pruebas de off-ramp/on-ramp reales

Estos se prueban con lógica local y mocks estructurados (sin llamadas de red reales).
