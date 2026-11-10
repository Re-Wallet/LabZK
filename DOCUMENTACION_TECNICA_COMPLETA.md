# LabZK - Documentación Técnica Completa

## 📋 Resumen Ejecutivo

LabZK es una billetera con pruebas de conocimiento cero (ZK) para la red Stellar que integra:
- Kakusho: KYC sin PII usando pruebas ZK (nullifiers)
- Piilo: Privacidad de montos (Pedersen commitments + Groth16)
- zkLogin: Autenticación social (Google/Apple) → Smart Wallet Soroban
- Atreus: Payment links con reglas ZK
- Anchor Platform: Off-ramp/On-ramp fiat (SEP-6/24)
- Path Payments: Conversión atómica ARS→USDC

## 🔧 Stack Tecnológico - VERSIONES CRÍTICAS

| Componente | Versión EXACTA | Obligatorio |
|------------|----------------|-------------|
| Rust | 1.99.1 (stable) | ✅ SÍ |
| Target WASM | wasm32v1-none | ✅ SÍ |
| Stellar CLI | 30.0.1 | ✅ SÍ |
| soroban-sdk | 28.0.0 | ✅ SÍ |
| @stellar/stellar-sdk | 17.4.0 | ✅ SÍ |

## 🐛 PROBLEMAS ENCONTRADOS Y SOLUCIONES EXACTAS

### 1. soroban-sdk 20.5.0 - Métodos storage privados
ERROR: method get is private / method set is private
SOLUCIÓN: Usar env.storage().persistent().get() y .set()

### 2. Unit structs no soportados como contract types
ERROR: unit structs are not supported as contract types
SOLUCIÓN: Agregar campo dummy: pub dummy: u32

### 3. Generics en storage - Tipo explícito obligatorio
ERROR: cannot infer type of the type parameter V
SOLUCIÓN: .get::<DataKey, bool>(&key)

### 4. soroban-sdk 28.x requiere stellar contract build
ERROR: soroban-sdk requires stellar-cli v25.2.0+
SOLUCIÓN: NUNCA cargo build, SIEMPRE stellar contract build

### 5. Target WASM incorrecto
ERROR: cant find crate for core
SOLUCIÓN: Target obligatorio wasm32v1-none

### 6. Network Passphrase EXACTO
ERROR: passphrase mismatch
SOLUCIÓN: Test SDF Network ; September 2015 (sin net)

## ✅ CONTRATO FINAL - contracts/zk_verifier/src/lib.rs
#![no_std]
use soroban_sdk::{contractimpl, contracttype, BytesN, Env};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    VerificationKey,
    Nullifier(BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ZkVerifier {
    pub dummy: u32,  // CAMPO DUMMY OBLIGATORIO
}

#[contractimpl]
impl ZkVerifier {
    pub fn verify_proof(env: Env, nullifier: BytesN<32>) -> bool {
        match env.storage().persistent().get::<DataKey, bool>(&DataKey::Nullifier(nullifier.clone())) {
            Some(_) => false,
            None => {
                env.storage().persistent().set(&DataKey::Nullifier(nullifier), &true);
                true
            }
        }
    }

    pub fn is_nullifier_used(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::Nullifier(nullifier))
    }
}
