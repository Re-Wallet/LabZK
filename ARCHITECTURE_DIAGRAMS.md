# LabZK - Architecture Diagrams

## System Overview

FRONTEND <-> API GATEWAY <-> USE CASES <-> ADAPTERS
       |               |               |                   |
       v               v               v                   v
┌──────────────────────────────────────────────────────────────────────┐
│                        HEXAGONAL DOMAIN LAYER                         │
│  Entities: User, Wallet, Transfer, Claim, KYCVerification, Ledger    │
│  Ports: KYCVerifier, Privacy, PaymentLink, Ramp, PathPayment, Auth   │
└──────────────────────────────────────────────────────────────────────┘
                                    |
        ┌───────────────────────────┼───────────────────────────┐
        v                           v                           v
┌───────────┐              ┌─────────────┐             ┌─────────────┐
│  NEON DB  │              │  STELLAR    │             │   ZK CIRCUITS│
│ (PostgreSQL)            │  SOROBAN    │             │   (Circom 2.x)│
└───────────┘              └─────────────┘             └─────────────┘

## Soroban Contracts on Testnet

### 1. ZK VERIFIER (Groth16)
- ID: CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT
- Explorer: https://stellar.expert/explorer/testnet/contract/CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT
- Functions: verify_proof, is_nullifier_used (anti-replay)

### 2. PIILO PRIVACY
- ID: CBDQUOJRFITV4QUEQQXGARLVE6K6RENHVPMQNDKZXOJWGHONKOB7QF46
- Explorer: https://stellar.expert/explorer/testnet/contract/CBDQUOJRFITV4QUEQQXGARLVE6K6RENHVPMQNDKZXOJWGHONKOB7QF46
- Functions: initialize, register_commitment, transfer_private, withdraw_private, get_commitment, get_commitments_by_owner, is_nullifier_used

### 3. ATREUS PAYMENT LINKS
- ID: CDBOSNSY6SARRNMDKOB7VZDEWAYJPVFJMOQONTNRMVC6WUZ75FH3JHIT
- Explorer: https://stellar.expert/explorer/testnet/contract/CDBOSNSY6SARRNMDKOB7VZDEWAYJPVFJMOQONTNRMVC6WUZ75FH3JHIT
- Deploy TX: https://stellar.expert/explorer/testnet/tx/d0fc8b820e6279639f1649272bc0421f5117504c48d9a37700f0bcbb0bee72d7
- Init TX: https://stellar.expert/explorer/testnet/tx/f41a1801179f116ab926e7f45cfe3e1b1dc909d91ba6542ed57bc623ce472e23
- Functions: initialize, create_payment_link, create_zk_rule, claim_payment, get_payment_link, get_zk_rule

## Key Lessons Learned
- NO spaces in paths -> copy to /tmp for builds
- Use stellar contract build NOT cargo directly
- SDK 28.0.0 (Protocol 28), target wasm32v1-none
- Use Bytes/BytesN not Vec<u8> in contract types
- Exact passphrase: Test SDF Network ; September 2015
- All credentials from env vars, no PII in DB
