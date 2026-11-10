/**
 * src/api/schemas/zk.schemas.ts
 *
 * Schemas de validación Zod para las rutas ZK.
 * Todos los esquemas validan entrada de API sin exponer PII ni secretos ZK.
 */

import { z } from 'zod';

// ============================================================
// Schemas de entrada (request body)
// ============================================================

/**
 * Esquema para POST /api/v1/zk/verify-kyc
 * Recibe prueba ZK + nullifier del cliente (nunca PII).
 */
export const VerifyKycRequestSchema = z.object({
  userId: z.string().uuid('userId debe ser un UUID válido'),
  proof: z.object({
    pi_a: z.array(z.string()).length(2, 'pi_a debe tener 2 elementos'),
    pi_b: z.array(z.array(z.string())).length(2, 'pi_b debe tener 2 elementos'),
    pi_c: z.array(z.string()).length(2, 'pi_c debe tener 2 elementos'),
    protocol: z.string(),
    curve: z.string(),
  }),
  publicInputs: z.object({
    nullifier: z.string().min(1, 'nullifier requerido'),
    seed: z.string().min(1, 'seed requerido'),
  }),
  seed: z.string().min(1, 'seed requerido'),
});

/**
 * Esquema para POST /api/v1/auth/login
 */
export const AuthLoginRequestSchema = z.object({
  provider: z.enum(['google', 'apple']),
});

/**
 * Esquema para POST /api/v1/privacy/deposit
 */
export const DepositRequestSchema = z.object({
  amount: z.string().transform((val) => BigInt(val)).refine((n) => n > 0n, 'amount debe ser mayor a 0'),
});

/**
 * Esquema para POST /api/v1/privacy/transfer
 */
export const TransferPrivateRequestSchema = z.object({
  to: z.string().min(1, 'dirección destino requerida'),
  amount: z.string().transform((val) => BigInt(val)).refine((n) => n > 0n, 'amount debe ser mayor a 0'),
});

/**
 * Esquema para POST /api/v1/path-payment/convert
 */
export const ConvertAssetsRequestSchema = z.object({
  sendAsset: z.string().min(1, 'sendAsset requerido (ej. ARST)'),
  sendAmount: z.string().min(1, 'sendAmount requerido'),
  destAsset: z.string().min(1, 'destAsset requerido (ej. USDC)'),
  destMin: z.string().min(1, 'destMin requerido'),
  destination: z.string().min(1, 'dirección destino requerida'),
});

/**
 * Esquema para POST /api/v1/claim/balance
 */
export const ClaimBalanceRequestSchema = z.object({
  userId: z.string().uuid('userId debe ser un UUID válido'),
  claimTokenHash: z.string().min(1, 'claimTokenHash requerido'),
  zkRuleHash: z.string().optional(),
});

// ============================================================
// Schemas de salida (response)
// ============================================================

export const VerifyKycResponseSchema = z.object({
  verified: z.boolean(),
  nullifier: z.string(),
  user: z.object({
    id: z.string(),
    tag: z.string(),
    kycApproved: z.boolean(),
    nullifier: z.string().optional(),
  }),
});

export const AuthResponseSchema = z.object({
  address: z.string(),
  session: z.object({
    accessToken: z.string(),
    expiresAt: z.number(),
    provider: z.string(),
  }),
});

export const PrivacyResultSchema = z.object({
  success: z.boolean(),
  reason: z.string().optional(),
});

export const PathPaymentResultSchema = z.object({
  success: z.boolean(),
  txHash: z.string().optional(),
  route: z.array(z.string()).optional(),
  reason: z.string().optional(),
});

export const ClaimResultSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
});

export const HealthResponseSchema = z.object({
  status: z.string(),
  database: z.boolean(),
  service: z.string(),
});

// ============================================================
// Tipos TypeScript derivados de los schemas
// ============================================================

export type VerifyKycRequest = z.infer<typeof VerifyKycRequestSchema>;
export type AuthLoginRequest = z.infer<typeof AuthLoginRequestSchema>;
export type DepositRequest = z.infer<typeof DepositRequestSchema>;
export type TransferPrivateRequest = z.infer<typeof TransferPrivateRequestSchema>;
export type ConvertAssetsRequest = z.infer<typeof ConvertAssetsRequestSchema>;
export type ClaimBalanceRequest = z.infer<typeof ClaimBalanceRequestSchema>;

export type VerifyKycResponse = z.infer<typeof VerifyKycResponseSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type PrivacyResult = z.infer<typeof PrivacyResultSchema>;
export type PathPaymentResult = z.infer<typeof PathPaymentResultSchema>;
export type ClaimResult = z.infer<typeof ClaimResultSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
