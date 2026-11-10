# LabZK - Deployment Summary & Explorer Links

## Deployed Contracts on Stellar Testnet

| Contract | Contract ID | Explorer | Status |
|----------|-------------|----------|--------|
| **ZK Verifier** | `CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT` | [View](https://stellar.expert/explorer/testnet/contract/CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT) | ✅ Verified |
| **Piilo Privacy** | `CBDQUOJRFITV4QUEQQXGARLVE6K6RENHVPMQNDKZXOJWGHONKOB7QF46` | [View](https://stellar.expert/explorer/testnet/contract/CBDQUOJRFITV4QUEQQXGARLVE6K6RENHVPMQNDKZXOJWGHONKOB7QF46) | ✅ Verified |
| **Atreus Payment** | `CDBOSNSY6SARRNMDKOB7VZDEWAYJPVFJMOQONTNRMVC6WUZ75FH3JHIT` | [View](https://stellar.expert/explorer/testnet/contract/CDBOSNSY6SARRNMDKOB7VZDEWAYJPVFJMOQONTNRMVC6WUZ75FH3JHIT) | ✅ Verified |

## Transaction Links

| Action | Transaction Hash | Explorer |
|--------|------------------|----------|
| Atreus Deploy | `d0fc8b820e6279639f1649272bc0421f5117504c48d9a37700f0bcbb0bee72d7` | [View](https://stellar.expert/explorer/testnet/tx/d0fc8b820e6279639f1649272bc0421f5117504c48d9a37700f0bcbb0bee72d7) |
| Atreus Initialize | `f41a1801179f116ab926e7f45cfe3e1b1dc909d91ba6542ed57bc623ce472e23` | [View](https://stellar.expert/explorer/testnet/tx/f41a1801179f116ab926e7f45cfe3e1b1dc909d91ba6542ed57bc623ce472e23) |

## Account & Network

| Parameter | Value |
|-----------|-------|
| **Account** | `GCFOKIPIKXDJF7XHUOWES2OBJ4EWH2FW42GADNZP3S7IRUH476Y5VI75` |
| **Network** | Stellar Testnet |
| **RPC URL** | `https://soroban-testnet.stellar.org` |
| **Passphrase** | `Test SDF Network ; September 2015` |
| **Identity** | `labzk-soroban-testnet` (in ~/.config/stellar/identity/) |

## ZK Verification Key

| Parameter | Value |
|-----------|-------|
| **Verification Key Hash** | `8611751560c7a260e245c902b3d087b68b6d40672ec1b1442fcd478dd70ed1de` |
| **Source File** | `circuits/verification_key.json` |
| **Circuit** | `proof-of-knowledge.circom` (Circom 2.x from source) |

## Test Results

```
Test Suites: 20 passed, 20 total
Tests:       80 passed, 80 total
Snapshots:   0 total
Time:        13.141 s
```

### Test Categories
- **Domain** (5): wallet.non-custodial, transfer.idempotency, ledger.invariant, claim.gate, kyc.nullifier-not-linkable
- **Application** (7): authenticate, verify-kyc, deposit, transfer-private, claim-balance, convert-assets, send-transfer
- **Infrastructure** (6): kakusho, piilo, atreus, anchor, stellar-path, zklogin adapters
- **Contract** (2): nullifier.uniqueness, schema.no-pii
- **ZK** (1): groth16 (simulated mode)

## Configuration (.env)

```bash
# Database
DATABASE_URL=postgresql://usuario:password@host.neon.tech/neondb?sslmode=require

# Soroban Contracts
SOROBAN_VERIFIER_CONTRACT_ID=CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT
SOROBAN_PILO_PRIVACY_CONTRACT_ID=CBDQUOJRFITV4QUEQQXGARLVE6K6RENHVPMQNDKZXOJWGHONKOB7QF46
SOROBAN_ATREUS_CONTRACT_ID=CDBOSNSY6SARRNMDKOB7VZDEWAYJPVFJMOQONTNRMVC6WUZ75FH3JHIT
SOROBAN_VERIFICATION_KEY_HASH=8611751560c7a260e245c902b3d087b68b6d40672ec1b1442fcd478dd70ed1de
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Other
HORIZON_URL=https://horizon-testnet.stellar.org
PIILO_NETWORK=testnet
PIILO_ASSET=USDC
ZKLOGIN_APP_NAME=LabZK
```

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Circom 2.x from source | Fixed parser bug in 0.5.x ignoring newlines after pragma |
| Soroban SDK 28.0.0 | Stable, aligned with Protocol 28 (OpenZeppelin PR #866) |
| Target: wasm32v1-none | Required for Protocol 25+ |
| Build: stellar contract build | Handles target, flags, spec shaking automatically |
| Storage API | storage().persistent().get()/set() (public in SDK 20+) |
| Contract pattern | #[contract] on unit struct (not #[contracttype] with dummy field) |
| No PII in DB | Only nullifiers, commitments, ZK proofs stored |

## Errors Encountered & Fixes

| Error | Fix |
|-------|-----|
| cargo metadata: No such file or directory | Path has spaces → copy to /tmp |
| Vec<u8> SpecShakingMarker not implemented | Use Bytes/BytesN in contract types |
| soroban-sdk requires stellar-cli v25.2.0+ | Use stellar contract build not cargo |
| Auto classifier timeout | Run commands manually in terminal |
| Container.ts TS errors | Use Python write instead of heredoc |

## Next Steps

1. **zkLogin Adapter** → Smart Wallet with social auth (Google/Apple) using @stellar-zklogin/sdk@2.0.0
2. **Anchor Platform** → Off-ramp/On-ramp SEP-6/24 (ARS↔USDC atomic path payments)
3. **End-to-end integration tests** with real contracts
