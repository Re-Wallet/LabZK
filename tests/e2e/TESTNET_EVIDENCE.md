# Evidencia Real — Pruebas contra Stellar Testnet

## Resumen

Este documento contiene evidencia real de llamadas de solo lectura contra los contratos Soroban desplegados en **Stellar Testnet**, ejecutadas el **2026-11-10**.

## Contratos verificados

| Contrato | ID | Estado | Función probada | Resultado |
|----------|----|--------|-----------------|-----------|
| ZK Verifier | `CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT` | ✅ Desplegado | `is_nullifier_used(01...32)` | `false` (nullifier no registrado) |
| ZK Verifier | `CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT` | ✅ Desplegado | `is_nullifier_used(00...32)` | `false` (nullifier no registrado) |
| Piilo Privacy | `CBDQUOJRFITV4QUEQQXGARLVE6K6RENHVPMQNDKZXOJWGHONKOB7QF46` | ✅ Desplegado | `get_commitment(00...32)` | vacío (commitment no existe) |
| Atreus Payment | `CDBOSNSY6SARRNMDKOB7VZDEWAYJPVFJMOQONTNRMVC6WUZ75FH3JHIT` | ✅ Desplegado | `get_payment_link(00...32)` | vacío (link no existe) |

## Detalle de ejecución

```
========================================
EVIDENCIA REAL — Stellar Testnet
Fecha: 2026-11-10T21:05:00.377Z
RPC: https://soroban-testnet.stellar.org
Source account (temporal): GBEOGT3CS2FN5DF7JQUH2BWCWUZZZVLQEWUENKHBGKCI24BD3VTMGU33
========================================

✅ zk_verifier.is_nullifier_used(01...32) = false
   → false = nullifier no registrado (correcto)
✅ zk_verifier.is_nullifier_used(00...32) = false
✅ piilo_privacy.get_commitment(00...32) = vacío (commitment no existe)
✅ atreus_payment.get_payment_link(00...32) = vacío (link no existe)
========================================
Evidencia recopilada contra Testnet real
========================================
```

## Método

Las llamadas se realizaron usando `@stellar/stellar-sdk` v17.4.0 contra `https://soroban-testnet.stellar.org` mediante `server.simulateTransaction()` con operaciones de solo lectura (`view functions`) de los contratos Soroban. No se requirió firmar transacciones ni fondos, ya que solo se consultó estado de los contratos.

## Explorer

Los contratos pueden verificarse en Stellar Expert:
- [ZK Verifier](https://stellar.expert/explorer/testnet/contract/CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT)
- [Piilo Privacy](https://stellar.expert/explorer/testnet/contract/CBDQUOJRFITV4QUEQQXGARLVE6K6RENHVPMQNDKZXOJWGHONKOB7QF46)
- [Atreus Payment](https://stellar.expert/explorer/testnet/contract/CDBOSNSY6SARRNMDKOB7VZDEWAYJPVFJMOQONTNRMVC6WUZ75FH3JHIT)
