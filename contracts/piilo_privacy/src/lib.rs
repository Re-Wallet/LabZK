#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Commitment(BytesN<32>),
    Nullifier(BytesN<32>),
    CommitmentByOwner(Address),
    VerificationKey,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommitmentData {
    pub owner: Address,
    pub asset: BytesN<32>,
    pub amount_encrypted: BytesN<32>,
    pub blinding_factor_hash: BytesN<32>,
    pub is_spent: bool,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransferProof {
    pub nullifier: BytesN<32>,
    pub commitment_in: BytesN<32>,
    pub commitment_out: BytesN<32>,
    pub recipient: Address,
    pub amount_encrypted: BytesN<32>,
}

#[contract]
pub struct PiiloPrivacy;

#[contractimpl]
impl PiiloPrivacy {
    pub fn initialize(env: Env, vkey_hash: BytesN<32>) {
        env.storage().persistent().set(&DataKey::VerificationKey, &vkey_hash);
    }

    pub fn register_commitment(
        env: Env,
        commitment: BytesN<32>,
        owner: Address,
        asset: BytesN<32>,
        amount_encrypted: BytesN<32>,
        blinding_factor_hash: BytesN<32>,
    ) -> bool {
        let key = DataKey::Commitment(commitment.clone());
        
        if env.storage().persistent().has(&key) {
            return false;
        }

        let data = CommitmentData {
            owner: owner.clone(),
            asset,
            amount_encrypted,
            blinding_factor_hash,
            is_spent: false,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&key, &data);

        let owner_key = DataKey::CommitmentByOwner(owner);
        let mut commitments: Vec<BytesN<32>> = env.storage().persistent().get(&owner_key).unwrap_or(Vec::new(&env));
        commitments.push_back(commitment);
        env.storage().persistent().set(&owner_key, &commitments);

        true
    }

    pub fn transfer_private(
        env: Env,
        proof: TransferProof,
        vkey_hash: BytesN<32>,
    ) -> bool {
        let stored_vkey: BytesN<32> = env.storage().persistent().get(&DataKey::VerificationKey).unwrap();
        if stored_vkey != vkey_hash {
            return false;
        }

        let nullifier_key = DataKey::Nullifier(proof.nullifier.clone());
        if env.storage().persistent().has(&nullifier_key) {
            return false;
        }

        let in_key = DataKey::Commitment(proof.commitment_in.clone());
        let mut in_data: CommitmentData = match env.storage().persistent().get(&in_key) {
            Some(d) => d,
            None => return false,
        };
        if in_data.is_spent {
            return false;
        }

        let out_key = DataKey::Commitment(proof.commitment_out.clone());
        if env.storage().persistent().has(&out_key) {
            return false;
        }

        in_data.is_spent = true;
        env.storage().persistent().set(&in_key, &in_data);

        let out_data = CommitmentData {
            owner: proof.recipient.clone(),
            asset: in_data.asset,
            amount_encrypted: proof.amount_encrypted,
            blinding_factor_hash: in_data.blinding_factor_hash,
            is_spent: false,
            created_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&out_key, &out_data);

        env.storage().persistent().set(&nullifier_key, &true);

        let recipient_key = DataKey::CommitmentByOwner(proof.recipient);
        let mut commitments: Vec<BytesN<32>> = env.storage().persistent().get(&recipient_key).unwrap_or(Vec::new(&env));
        commitments.push_back(proof.commitment_out);
        env.storage().persistent().set(&recipient_key, &commitments);

        true
    }

    pub fn withdraw_private(
        env: Env,
        commitment: BytesN<32>,
        nullifier: BytesN<32>,
        _amount_encrypted: BytesN<32>,
        vkey_hash: BytesN<32>,
    ) -> bool {
        let stored_vkey: BytesN<32> = env.storage().persistent().get(&DataKey::VerificationKey).unwrap();
        if stored_vkey != vkey_hash {
            return false;
        }

        let nullifier_key = DataKey::Nullifier(nullifier);
        if env.storage().persistent().has(&nullifier_key) {
            return false;
        }

        let key = DataKey::Commitment(commitment);
        let mut data: CommitmentData = match env.storage().persistent().get(&key) {
            Some(d) => d,
            None => return false,
        };
        if data.is_spent {
            return false;
        }

        data.is_spent = true;
        env.storage().persistent().set(&key, &data);
        env.storage().persistent().set(&nullifier_key, &true);

        true
    }

    pub fn get_commitment(env: Env, commitment: BytesN<32>) -> Option<CommitmentData> {
        env.storage().persistent().get(&DataKey::Commitment(commitment))
    }

    pub fn get_commitments_by_owner(env: Env, owner: Address) -> Vec<BytesN<32>> {
        env.storage().persistent().get(&DataKey::CommitmentByOwner(owner)).unwrap_or(Vec::new(&env))
    }

    pub fn is_nullifier_used(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::Nullifier(nullifier))
    }
}
