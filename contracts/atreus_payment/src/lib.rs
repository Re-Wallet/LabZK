#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Bytes, BytesN, Env, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    PaymentLink(BytesN<32>),
    ZkRule(BytesN<32>),
    PaymentLinkByOwner(Address),
    ZkRuleByOwner(Address),
    VerificationKey,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentLinkData {
    pub owner: Address,
    pub amount: i128,
    pub asset: BytesN<32>,
    pub recipient: Address,
    pub zk_rule_id: BytesN<32>,
    pub is_claimed: bool,
    pub expires_at: u64,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ZkRuleData {
    pub owner: Address,
    pub rule_type: u32,
    pub condition_hash: BytesN<32>,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ClaimProof {
    pub link_id: BytesN<32>,
    pub claimant: Address,
    pub zk_proof: Bytes,
    pub public_inputs: Bytes,
}

#[contract]
pub struct AtreusPayment;

#[contractimpl]
impl AtreusPayment {
    pub fn initialize(env: Env, vkey_hash: BytesN<32>) {
        env.storage().persistent().set(&DataKey::VerificationKey, &vkey_hash);
    }

    pub fn create_payment_link(
        env: Env,
        owner: Address,
        amount: i128,
        asset: BytesN<32>,
        recipient: Address,
        zk_rule_id: BytesN<32>,
        expires_at: u64,
    ) -> BytesN<32> {
        let link_id = BytesN::from_array(&env, &env.prng().gen::<[u8; 32]>());
        let data = PaymentLinkData {
            owner: owner.clone(),
            amount,
            asset,
            recipient,
            zk_rule_id,
            is_claimed: false,
            expires_at,
            created_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&DataKey::PaymentLink(link_id.clone()), &data);
        let mut links: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::PaymentLinkByOwner(owner.clone()))
            .unwrap_or(Vec::new(&env));
        links.push_back(link_id.clone());
        env.storage().persistent().set(&DataKey::PaymentLinkByOwner(owner), &links);
        link_id
    }

    pub fn create_zk_rule(
        env: Env,
        owner: Address,
        rule_type: u32,
        condition_hash: BytesN<32>,
    ) -> BytesN<32> {
        let rule_id = BytesN::from_array(&env, &env.prng().gen::<[u8; 32]>());
        let data = ZkRuleData {
            owner: owner.clone(),
            rule_type,
            condition_hash,
            created_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&DataKey::ZkRule(rule_id.clone()), &data);
        let mut rules: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::ZkRuleByOwner(owner.clone()))
            .unwrap_or(Vec::new(&env));
        rules.push_back(rule_id.clone());
        env.storage().persistent().set(&DataKey::ZkRuleByOwner(owner), &rules);
        rule_id
    }

    pub fn claim_payment(env: Env, proof: ClaimProof, vkey_hash: BytesN<32>) -> bool {
        let stored_vkey: BytesN<32> = env
            .storage()
            .persistent()
            .get(&DataKey::VerificationKey)
            .unwrap();
        if stored_vkey != vkey_hash {
            return false;
        }
        let link_key = DataKey::PaymentLink(proof.link_id.clone());
        let mut data: PaymentLinkData = match env.storage().persistent().get(&link_key) {
            Some(d) => d,
            None => return false,
        };
        if data.is_claimed {
            return false;
        }
        if env.ledger().timestamp() > data.expires_at {
            return false;
        }
        data.is_claimed = true;
        env.storage().persistent().set(&link_key, &data);
        true
    }

    pub fn get_payment_link(env: Env, link_id: BytesN<32>) -> Option<PaymentLinkData> {
        env.storage().persistent().get(&DataKey::PaymentLink(link_id))
    }

    pub fn get_zk_rule(env: Env, rule_id: BytesN<32>) -> Option<ZkRuleData> {
        env.storage().persistent().get(&DataKey::ZkRule(rule_id))
    }
}