/**
 * src/di/container.ts
 *
 * Contenedor de inversiones de control (DI).
 * Ensambla: pool de Neon → repositorios → adaptadores → casos de uso.
 *
 * Conecta KakushoAdapter → PostgresNullifierRepository (tabla zk_nullifiers en Neon).
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

/**
 * Configuración cargada desde variables de entorno.
 */
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
    wallet?: any; // Se inyecta cuando se instale @neylanxyz/piilo con un wallet real
    circuitsUrl?: string;
  };
  horizonUrl: string;
}

/**
 * Contenedor de dependencias ensamblado.
 */
export interface Container {
  config: AppConfig;
  pool: ReturnType<typeof createPool>;
  // Repositorios
  nullifierRepo: PostgresNullifierRepository;
  commitmentRepo: PostgresCommitmentRepository;
  userRepo: PostgresUserRepository;
  // Adaptadores
  kakushoAdapter: KakushoAdapter;
  piiloAdapter: PiiloAdapter;
  atreusAdapter: AtreusAdapter;
  anchorAdapter: AnchorAdapter;
  stellarPathAdapter: StellarPathAdapter;
  zkloginAdapter: ZkLoginAdapter;
  horizonClient: StellarHorizonClient;
  // Casos de uso
  verifyKycUseCase: VerifyKycUseCase;
  authenticateUseCase: AuthenticateUseCase;
  depositUseCase: DepositUseCase;
  transferPrivateUseCase: TransferPrivateUseCase;
  withdrawUseCase: WithdrawUseCase;
  sendTransferUseCase: SendTransferUseCase;
  convertAssetsUseCase: ConvertAssetsUseCase;
  claimBalanceUseCase: ClaimBalanceUseCase;
}

/**
 * Crea y ensambla el contenedor completo.
 * Conecta KakushoAdapter → PostgresNullifierRepository → zk_nullifiers en Neon.
 */
export function createContainer(config: AppConfig): Container {
  // --- Pool de Neon (rama pruebas-zk, aislada de main) ---
  const pool = createPool(config.database);

  // --- Repositorios ---
  const nullifierRepo = new PostgresNullifierRepository(pool);
  const commitmentRepo = new PostgresCommitmentRepository(pool);
  const userRepo = new PostgresUserRepository(pool);

  // --- Adaptadores ---
  // KakushoAdapter recibe el nullifierRepo real (PostgresNullifierRepository)
  // para verificar y registrar nullifiers en la tabla zk_nullifiers de Neon.
  const kakushoAdapter = new KakushoAdapter(nullifierRepo);

  const piiloAdapter = new PiiloAdapter(config.piilo);

  const atreusAdapter = new AtreusAdapter();
  const anchorAdapter = new AnchorAdapter();
  const stellarPathAdapter = new StellarPathAdapter(config.horizonUrl);
  const zkloginAdapter = new ZkLoginAdapter(
    config.zklogin.appName,
    config.zklogin.oauthClients
  );
  const horizonClient = new StellarHorizonClient(config.horizonUrl);

  // --- Casos de uso ---
  const verifyKycUseCase = new VerifyKycUseCase(kakushoAdapter, nullifierRepo, userRepo);
  const authenticateUseCase = new AuthenticateUseCase(zkloginAdapter);
  const depositUseCase = new DepositUseCase(piiloAdapter);
  const transferPrivateUseCase = new TransferPrivateUseCase(piiloAdapter);
  const withdrawUseCase = new WithdrawUseCase(piiloAdapter);
  // TODO: Implementar WalletRepository y LedgerRepository para wiring completo
  const sendTransferUseCase = null as unknown as SendTransferUseCase;
  const convertAssetsUseCase = new ConvertAssetsUseCase(stellarPathAdapter);
  const claimBalanceUseCase = new ClaimBalanceUseCase(userRepo);

  return {
    config,
    pool,
    nullifierRepo,
    commitmentRepo,
    userRepo,
    kakushoAdapter,
    piiloAdapter,
    atreusAdapter,
    anchorAdapter,
    stellarPathAdapter,
    zkloginAdapter,
    horizonClient,
    verifyKycUseCase,
    authenticateUseCase,
    depositUseCase,
    transferPrivateUseCase,
    withdrawUseCase,
    sendTransferUseCase,
    convertAssetsUseCase,
    claimBalanceUseCase,
  };
}

/**
 * Crea el contenedor desde variables de entorno.
 * REQUIRED: DATABASE_URL (Neon rama pruebas-zk)
 */
export function createContainerFromEnv(): Container {
  const connectionString =
    process.env.DATABASE_URL ??
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
  };

  return createContainer(config);
}
