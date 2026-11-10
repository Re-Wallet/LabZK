#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    KycVerified(Address),
    NullifierVerified(BytesN<32>),
    VerificationKey,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct KycRecord {
    pub user: Address,
    pub nullifier: BytesN<32>,
    pub verified: bool,
    pub verified_at: u64,
}

#[contract]
pub struct KycRegistry;

#[contractimpl]
impl KycRegistry {
    /// Inicializa el contrato con el hash de la verification key
    pub fn initialize(env: Env, vkey_hash: BytesN<32>) {
        env.storage().persistent().set(&DataKey::VerificationKey, &vkey_hash);
    }

    /// Registra un usuario como KYC verificado (llamado después de verificar prueba ZK)
    pub fn register_kyc(
        env: Env,
        user: Address,
        nullifier: BytesN<32>,
    ) -> bool {
        // Verificar que el nullifier no esté ya registrado
        let nullifier_key = DataKey::NullifierVerified(nullifier.clone());
        if env.storage().persistent().has(&nullifier_key) {
            return false; // Ya existe
        }

        // Registrar el nullifier como verificado
        env.storage().persistent().set(&nullifier_key, &true);

        // Registrar el usuario como KYC verificado
        let kyc_record = KycRecord {
            user: user.clone(),
            nullifier: nullifier.clone(),
            verified: true,
            verified_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&DataKey::KycVerified(user.clone()), &kyc_record);

        true
    }

    /// Consulta si un usuario tiene KYC verificado
    pub fn is_kyc_verified(env: Env, user: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::KycVerified(user))
    }

    /// Consulta si un nullifier está verificado (anti-replay KYC)
    pub fn is_nullifier_verified(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::NullifierVerified(nullifier))
    }

    /// Obtiene el registro KYC de un usuario
    pub fn get_kyc_record(env: Env, user: Address) -> Option<KycRecord> {
        env.storage().persistent().get(&DataKey::KycVerified(user))
    }

    /// Obtiene el hash de la verification key
    pub fn get_verification_key(env: Env) -> Option<BytesN<32>> {
        env.storage().persistent().get(&DataKey::VerificationKey)
    }
}
