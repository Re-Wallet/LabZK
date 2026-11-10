#![no_std]  // ← OBLIGATORIO al principio
use soroban_sdk::{contract, contractimpl, contracttype, BytesN, Env};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    VerificationKey,
    Nullifier(BytesN<32>),
}

// El struct del contrato usa #[contract] y NO necesita campos ni derives
#[contract]
pub struct ZkVerifier;

#[contractimpl]
impl ZkVerifier {
    pub fn verify_proof(env: Env, nullifier: BytesN<32>) -> bool {
        // Tipamos el .get() para que Rust sepa que espera un booleano
        match env.storage().persistent().get::<DataKey, bool>(&DataKey::Nullifier(nullifier.clone())) {
            Some(_) => false, // El nullifier ya fue usado
            None => {
                env.storage().persistent().set(&DataKey::Nullifier(nullifier), &true);
                true // Nullifier registrado exitosamente
            }
        }
    }

    pub fn is_nullifier_used(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::Nullifier(nullifier))
    }
}
