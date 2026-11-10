/**
 * src/di/container.ts
 *
 * Contenedor de inversiones de control (DI).
 * Ensambla: pool de Neon -> repositorios -> adaptadores -> casos de uso.
 *
 * Conecta KakushoAdapter -> PostgresNullifierRepository (tabla zk_nullifiers en Neon).
 * Todas las credenciales vienen de variables de entorno (nunca hardcodeadas).
 */

import { createPool, type DatabaseConfig } from '../infrastructure/persistence/postgresql/pool.js';
import { PostgresNullifierRepository } from '../infrastructure/persistence/postgresql/nullifier.repository.js';
import { PostgresCommitmentRepository } from '../infrastructure/persistence/postgresql/commitment.repository.js';
import { PostgresUserRepository } from '../infrastructure/persistence/postgresql/user.repository.js';
import { KakushoAdapter } from '../infrastructure/adapters/kyc-verifier/kakusho.adapter.js';
import { PiiloAdapter } from '../infrastructure/adapters/privacy/piilo.adapter.js';
import { AtreusAdapter } from '../infrastructure/adapters/payment-link/atreus.adapter.js';
import { AnchorAdapter } from '../infrastructure/adapters/ramp/anchor.adapter.js';
import { StellarPathAdapter } from '../infrastructure/adapters/path-payment/stellar-path.adapter.js';
import { ZkLoginAdapter } from '../infrastructure/adapters/auth/zklogin.adapter.js';
import { StellarHorizonClient } from '../infrastructure/persistence/stellar/horizon.client.js';
import { Groth16VerifierClient } from '../infrastructure/soroban/groth16-verifier-client.js';
import { KycRegistryClient } from '../infrastructure/soroban/kyc-registry-client.js';
import type { SorobanVerifierConfig, KycRegistryConfig } from '../infrastructure/soroban/types.js';
import {
  VerifyKycUseCase,
  type VerifyKycInput,
} from '../application/kyc/verify-kyc.use-case.js';
import { AuthenticateUseCase, type AuthenticateInput } from '../application/auth/authenticate.use-case.js';
import { DepositUseCase, type DepositUseCaseInput } from '../application/privacy/deposit.use-case.js';
import { TransferPrivateUseCase, type TransferPrivateInput } from '../application/privacy/transfer.use-case.js';
import { WithdrawUseCase } from '../application/privacy/withdraw.use-case.js';
import { SendTransferUseCase, type SendTransferInput } from '../application/transfer/send-transfer.use-case.js';
import { ConvertAssetsUseCase, type ConvertAssetsInput } from '../application/path-payment/convert-assets.use-case.js';
import { ClaimBalanceUseCase, type ClaimBalanceInput } from '../application/claim/claim-balance.use-case.js';

export interface AppConfig {
  database: DatabaseConfig;
  port: number;
  zklogin: {
    appName: string;
    oauthClients: { google?: string; apple?: string };
  };
  piilo: {
    network: 'testnet' | 'mainnet';
    asset: string;
    wallet?: any;
    circuitsUrl?: string;
  };
  horizonUrl: string;
  anchor: {
    anchors: Record<string, {
      name: string;
      baseUrl: string;
      sep6Enabled: boolean;
      sep24Enabled: boolean;
      kycRequired: boolean;
      supportedAssets: string[];
      apiKey?: string;
    }>;
    usdcIssuer?: string;
    usdcDistributionPublicKey?: string;
    webhookSecret?: string;
  };
  soroban: {
    rpcUrl: string;
    networkPassphrase: string;
    verifierContractId: string;
    kycRegistryContractId: string;
    verificationKeyHash: string;
    piiloPrivacyContractId: string;
    atreusContractId: string;
  };
}

export interface Container {
  config: AppConfig;
  pool: ReturnType<typeof createPool>;
  nullifierRepo: PostgresNullifierRepository;
  commitmentRepo: PostgresCommitmentRepository;
  userRepo: PostgresUserRepository;
  kakushoAdapter: KakushoAdapter;
  piiloAdapter: PiiloAdapter;
  atreusAdapter: AtreusAdapter;
  anchorAdapter: AnchorAdapter;
  stellarPathAdapter: StellarPathAdapter;
  zkloginAdapter: ZkLoginAdapter;
  horizonClient: StellarHorizonClient;
  groth16VerifierClient: Groth16VerifierClient;
  kycRegistryClient: KycRegistryClient;
  verifyKycUseCase: VerifyKycUseCase;
  authenticateUseCase: AuthenticateUseCase;
  depositUseCase: DepositUseCase;
  transferPrivateUseCase: TransferPrivateUseCase;
  withdrawUseCase: WithdrawUseCase;
  sendTransferUseCase: SendTransferUseCase;
  convertAssetsUseCase: ConvertAssetsUseCase;
  claimBalanceUseCase: ClaimBalanceUseCase;
}

export function createContainer(config: AppConfig): Container {
  const pool = createPool(config.database);
  const nullifierRepo = new PostgresNullifierRepository(pool);
  const commitmentRepo = new PostgresCommitmentRepository(pool);
  const userRepo = new PostgresUserRepository(pool);

  const kakushoAdapter = new KakushoAdapter(nullifierRepo);
  const piiloAdapter = new PiiloAdapter(config.piilo);
  const atreusAdapter = new AtreusAdapter();
  const anchorAdapter = new AnchorAdapter({
    anchors: config.anchor.anchors,
    horizonUrl: config.horizonUrl,
    usdcIssuer: config.anchor.usdcIssuer,
    usdcDistributionPublicKey: config.anchor.usdcDistributionPublicKey,
    webhookSecret: config.anchor.webhookSecret,
  });
  const stellarPathAdapter = new StellarPathAdapter(config.horizonUrl);
  const zkloginAdapter = new ZkLoginAdapter({
    appName: config.zklogin.appName,
    oauthClients: config.zklogin.oauthClients,
    network: (config.soroban.networkPassphrase.includes('Testnet') || config.soroban.networkPassphrase.includes('testnet')) ? 'testnet' : 'mainnet',
    rpcUrl: config.soroban.rpcUrl,
    sessionDurationSeconds: 86400,
    persistSessions: true,
  });
  const horizonClient = new StellarHorizonClient(config.horizonUrl);

  const verifierConfig: SorobanVerifierConfig = {
    contractId: config.soroban.verifierContractId,
    rpcUrl: config.soroban.rpcUrl,
    networkPassphrase: config.soroban.networkPassphrase,
    verificationKeyHash: config.soroban.verificationKeyHash,
  };
  const kycConfig: KycRegistryConfig = {
    contractId: config.soroban.kycRegistryContractId,
    rpcUrl: config.soroban.rpcUrl,
    networkPassphrase: config.soroban.networkPassphrase,
  };
  const groth16VerifierClient = new Groth16VerifierClient(verifierConfig);
  const kycRegistryClient = new KycRegistryClient(kycConfig);

  const verifyKycUseCase = new VerifyKycUseCase(kakushoAdapter, nullifierRepo, userRepo);
  const authenticateUseCase = new AuthenticateUseCase(zkloginAdapter);
  const depositUseCase = new DepositUseCase(piiloAdapter);
  const transferPrivateUseCase = new TransferPrivateUseCase(piiloAdapter);
  const withdrawUseCase = new WithdrawUseCase(piiloAdapter);
  const sendTransferUseCase = null as unknown as SendTransferUseCase;
  const convertAssetsUseCase = new ConvertAssetsUseCase(stellarPathAdapter);
  const claimBalanceUseCase = new ClaimBalanceUseCase(userRepo);

  return {
    config, pool, nullifierRepo, commitmentRepo, userRepo,
    kakushoAdapter, piiloAdapter, atreusAdapter, anchorAdapter,
    stellarPathAdapter, zkloginAdapter, horizonClient,
    groth16VerifierClient, kycRegistryClient,
    verifyKycUseCase, authenticateUseCase, depositUseCase,
    transferPrivateUseCase, withdrawUseCase, sendTransferUseCase,
    convertAssetsUseCase, claimBalanceUseCase,
  };
}

export function createContainerFromEnv(): Container {
  const connectionString = process.env.DATABASE_URL ??
    'postgresql://usuario:password@localhost:5432/labzk?sslmode=require';

  const config: AppConfig = {
    database: { connectionString },
    port: Number(process.env.PORT ?? 3000),
    zklogin: {
      appName: process.env.ZKLOGIN_APP_NAME ?? 'LabZK',
      oauthClients: {
        google: process.env.ZKLOGIN_GOOGLE_CLIENT_ID,
        apple: process.env.ZKLOGIN_APPLE_CLIENT_ID,
      },
    },
    piilo: {
      network: (process.env.PIILO_NETWORK as 'testnet' | 'mainnet') ?? 'testnet',
      asset: process.env.PIILO_ASSET ?? 'USDC',
      circuitsUrl: process.env.PIILO_CIRCUITS_URL,
    },
    horizonUrl: process.env.HORIZON_URL ?? 'https://horizon-testnet.stellar.org',
    anchor: {
      anchors: {
        settle: {
          name: 'Settle',
          baseUrl: process.env.SETTLE_API_URL ?? 'https://api.settle.com/sep',
          sep6Enabled: true,
          sep24Enabled: true,
          kycRequired: true,
          supportedAssets: ['USDC', 'ARS'],
          apiKey: process.env.SETTLE_API_KEY,
        },
        vesseo: {
          name: 'Vesseo',
          baseUrl: process.env.VESSEO_API_URL ?? 'https://api.vesseo.com/sep',
          sep6Enabled: true,
          sep24Enabled: true,
          kycRequired: true,
          supportedAssets: ['USDC', 'ARS'],
          apiKey: process.env.VESSEO_API_KEY,
        },
        bitso: {
          name: 'Bitso',
          baseUrl: process.env.BITSO_API_URL ?? 'https://api.bitso.com/sep',
          sep6Enabled: true,
          sep24Enabled: false,
          kycRequired: true,
          supportedAssets: ['USDC', 'ARS'],
          apiKey: process.env.BITSO_API_KEY,
        },
      },
      usdcIssuer: process.env.USDC_ISSUER_ADDRESS,
      usdcDistributionPublicKey: process.env.USDC_DISTRIBUTION_PUBLIC_KEY,
      webhookSecret: process.env.ANCHOR_WEBHOOK_SECRET,
    },
    soroban: {
      rpcUrl: process.env.SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org',
      networkPassphrase: process.env.SOROBAN_NETWORK_PASSPHRASE ?? 'Test SDF Network ; September 2015',
      verifierContractId: process.env.SOROBAN_VERIFIER_CONTRACT_ID ?? 'CABACEAI5MCCUCZ3ZEMK5EHFA7PICANWRXFNDJHQ73UCC34JN4E6K5HT',
      kycRegistryContractId: process.env.SOROBAN_KYC_REGISTRY_CONTRACT_ID ?? '',
      verificationKeyHash: process.env.SOROBAN_VERIFICATION_KEY_HASH ?? '',
      piiloPrivacyContractId: process.env.SOROBAN_PILO_PRIVACY_CONTRACT_ID ?? 'CBDQUOJRFITV4QUEQQXGARLVE6K6RENHVPMQNDKZXOJWGHONKOB7QF46',
      atreusContractId: process.env.SOROBAN_ATREUS_CONTRACT_ID ?? '',
    },
  };
  return createContainer(config);
}
