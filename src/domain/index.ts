/**
 * src/domain/index.ts
 *
 * Export central del dominio (entidades y puertos).
 */

export type {
  User, UserId, UserTag, Nullifier,
  CreateUserInput,
} from './entities/user.entity.js';
export type {
  Wallet, WalletId, StellarPublicKey, WalletStatus,
} from './entities/wallet.entity.js';
export type {
  KycVerification, KycStatus,
} from './entities/kyc-verification.entity.js';
export type {
  Claim, ClaimStatus,
} from './entities/claim.entity.js';
export type {
  Transfer, TransferStatus,
} from './entities/transfer.entity.js';
export type {
  LedgerEntry, LedgerEntryType,
} from './entities/ledger-entry.entity.js';

export type {
  AuthPort, AuthSession, AuthProvider,
} from './ports/auth.port.js';
export type {
  KycVerifierPort, KycProofInput, KycVerifyResult,
} from './ports/kyc-verifier.port.js';
export type {
  PrivacyPort, DepositInput, PrivacyResult,
} from './ports/privacy.port.js';
export type {
  PaymentLinkPort, PaymentLink, CreateLinkInput,
} from './ports/payment-link.port.js';
export type {
  RampPort, RampOperation, RampOperationInput,
} from './ports/ramp.port.js';
export type {
  PathPaymentPort, PathPaymentInput, PathPaymentResult,
} from './ports/path-payment.port.js';
export type {
  UserRepository,
} from './ports/user.repository.js';
export type {
  NullifierRepository,
} from './ports/nullifier.repository.js';
export type {
  WalletRepository,
} from './ports/wallet.repository.js';
export type {
  LedgerRepository,
} from './ports/ledger.repository.js';
