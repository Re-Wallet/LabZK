/**
 * src/api/routes/zk.routes.ts
 *
 * Rutas Fastify para exponer los casos de uso ZK.
 * Validación de entrada con JSON Schema (compatible con Fastify) + Zod para tipado.
 *
 * Endpoints:
 *   GET  /health                          — Health check + conexión a Neon
 *   POST /api/v1/zk/verify-kyc            — Verificar prueba ZK de Kakusho
 *   POST /api/v1/auth/login               — Login social (zkLogin)
 *   POST /api/v1/privacy/deposit          — Depósito confidencial (Piilo)
 *   POST /api/v1/privacy/transfer         — Transferencia privada (Piilo)
 *   POST /api/v1/privacy/withdraw         — Salir del modo confidencial (Piilo)
 *   POST /api/v1/path-payment/convert     — Conversión atómica ARS→USDC
 *   POST /api/v1/claim/balance            — Reclamo de balance (gate KYC)
 */

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  VerifyKycRequestSchema,
  AuthLoginRequestSchema,
  DepositRequestSchema,
  TransferPrivateRequestSchema,
  ConvertAssetsRequestSchema,
  ClaimBalanceRequestSchema,
  type VerifyKycRequest,
  type AuthLoginRequest,
  type DepositRequest,
  type TransferPrivateRequest,
  type ConvertAssetsRequest,
  type ClaimBalanceRequest,
} from '../schemas/zk.schemas.js';
import type { Container } from '../../di/container.js';

/**
 * Valida un objeto contra un schema Zod y lanza si es inválido.
 * Se usa en cada handler para mantener tipado estricto sin depender
 * de ZodTypeProvider (incompatible con zod 4 + fastify-swagger).
 */
function validateZod<T>(schema: any, data: any): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const err = new Error(
      `Validación fallida: ${result.error.issues
        .map((i: any) => `${i.path.join('.')}: ${i.message}`)
        .join(', ')}`
    );
    (err as any).statusCode = 400;
    throw err;
  }
  return result.data as T;
}

const zkRoutes: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  const app = fastify;

  // --- Health check ---
  app.get(
    '/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              database: { type: 'boolean' },
              service: { type: 'string' },
            },
            required: ['status', 'database', 'service'],
          },
        },
      },
    },
    async (_request: any, reply: any) => {
      const container = (fastify as any).container as Container;
      const dbHealthy = await container.pool.query('SELECT 1 AS healthy').then(() => true).catch(() => false);
      return reply.send({
        status: 'ok',
        database: dbHealthy,
        service: 'labzk-zk-api',
      });
    }
  );

  // --- KYC ZK Verification (Kakusho) ---
  app.post(
    '/api/v1/zk/verify-kyc',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId', 'proof', 'publicInputs', 'seed'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            proof: {
              type: 'object',
              required: ['pi_a', 'pi_b', 'pi_c', 'protocol', 'curve'],
              properties: {
                pi_a: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2 },
                pi_b: { type: 'array', items: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2 }, minItems: 2, maxItems: 2 },
                pi_c: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2 },
                protocol: { type: 'string' },
                curve: { type: 'string' },
              },
            },
            publicInputs: {
              type: 'object',
              required: ['nullifier', 'seed'],
              properties: {
                nullifier: { type: 'string' },
                seed: { type: 'string' },
              },
            },
            seed: { type: 'string' },
          },
        },
      },
    },
    async (request: any, reply: any) => {
      const container = (fastify as any).container as Container;
      let input: VerifyKycRequest;
      try {
        input = validateZod(VerifyKycRequestSchema, request.body);
      } catch (err) {
        return reply.status((err as any).statusCode ?? 400).send({
          error: err instanceof Error ? err.message : 'Validación fallida',
        });
      }

      try {
        const result = await container.verifyKycUseCase.execute({
          userId: input.userId,
          proof: input.proof as any,
          publicInputs: input.publicInputs as any,
          seed: input.seed,
        });

        return reply.send({
          verified: result.verified,
          nullifier: result.nullifier,
          user: {
            id: result.user.id,
            tag: result.user.tag,
            kycApproved: result.user.kycApproved,
            nullifier: result.user.nullifier,
          },
        });
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'KYC verification failed',
        });
      }
    }
  );

  // --- Authenticate (zkLogin) ---
  app.post(
    '/api/v1/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['provider'],
          properties: {
            provider: { type: 'string', enum: ['google', 'apple'] },
          },
        },
      },
    },
    async (request: any, reply: any) => {
      const container = (fastify as any).container as Container;
      let input: AuthLoginRequest;
      try {
        input = validateZod(AuthLoginRequestSchema, request.body);
      } catch (err) {
        return reply.status((err as any).statusCode ?? 400).send({
          error: err instanceof Error ? err.message : 'Validación fallida',
        });
      }

      try {
        const result = await container.authenticateUseCase.execute({
          provider: input.provider,
        });
        return reply.send(result);
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Authentication failed',
        });
      }
    }
  );

  // --- Deposit confidential (Piilo) ---
  app.post(
    '/api/v1/privacy/deposit',
    {
      schema: {
        body: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: { type: 'string' },
          },
        },
      },
    },
    async (request: any, reply: any) => {
      const container = (fastify as any).container as Container;
      let input: DepositRequest;
      try {
        input = validateZod(DepositRequestSchema, request.body);
      } catch (err) {
        return reply.status((err as any).statusCode ?? 400).send({
          error: err instanceof Error ? err.message : 'Validación fallida',
        });
      }

      try {
        const result = await container.depositUseCase.execute(input);
        return reply.send(result);
      } catch (err) {
        return reply.status(400).send({
          success: false,
          error: err instanceof Error ? err.message : 'Deposit failed',
        });
      }
    }
  );

  // --- Transfer private (Piilo) ---
  app.post(
    '/api/v1/privacy/transfer',
    {
      schema: {
        body: {
          type: 'object',
          required: ['to', 'amount'],
          properties: {
            to: { type: 'string' },
            amount: { type: 'string' },
          },
        },
      },
    },
    async (request: any, reply: any) => {
      const container = (fastify as any).container as Container;
      let input: TransferPrivateRequest;
      try {
        input = validateZod(TransferPrivateRequestSchema, request.body);
      } catch (err) {
        return reply.status((err as any).statusCode ?? 400).send({
          error: err instanceof Error ? err.message : 'Validación fallida',
        });
      }

      try {
        const result = await container.transferPrivateUseCase.execute(input);
        return reply.send(result);
      } catch (err) {
        return reply.status(400).send({
          success: false,
          error: err instanceof Error ? err.message : 'Private transfer failed',
        });
      }
    }
  );

  // --- Withdraw from confidential mode (Piilo) ---
  app.post(
    '/api/v1/privacy/withdraw',
    {
      schema: {},
    },
    async (_request: any, reply: any) => {
      const container = (fastify as any).container as Container;
      try {
        const result = await container.withdrawUseCase.execute();
        return reply.send(result);
      } catch (err) {
        return reply.status(400).send({
          success: false,
          error: err instanceof Error ? err.message : 'Withdraw failed',
        });
      }
    }
  );

  // --- Convert assets (Path Payment ARS→USDC) ---
  app.post(
    '/api/v1/path-payment/convert',
    {
      schema: {
        body: {
          type: 'object',
          required: ['sendAsset', 'sendAmount', 'destAsset', 'destMin', 'destination'],
          properties: {
            sendAsset: { type: 'string' },
            sendAmount: { type: 'string' },
            destAsset: { type: 'string' },
            destMin: { type: 'string' },
            destination: { type: 'string' },
          },
        },
      },
    },
    async (request: any, reply: any) => {
      const container = (fastify as any).container as Container;
      let input: ConvertAssetsRequest;
      try {
        input = validateZod(ConvertAssetsRequestSchema, request.body);
      } catch (err) {
        return reply.status((err as any).statusCode ?? 400).send({
          error: err instanceof Error ? err.message : 'Validación fallida',
        });
      }

      try {
        const result = await container.convertAssetsUseCase.execute(input);
        return reply.send(result);
      } catch (err) {
        return reply.status(400).send({
          success: false,
          reason: err instanceof Error ? err.message : 'Path payment failed',
        });
      }
    }
  );

  // --- Claim balance (gate KYC) ---
  app.post(
    '/api/v1/claim/balance',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId', 'claimTokenHash'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            claimTokenHash: { type: 'string' },
            zkRuleHash: { type: 'string' },
          },
        },
      },
    },
    async (request: any, reply: any) => {
      const container = (fastify as any).container as Container;
      let input: ClaimBalanceRequest;
      try {
        input = validateZod(ClaimBalanceRequestSchema, request.body);
      } catch (err) {
        return reply.status((err as any).statusCode ?? 400).send({
          error: err instanceof Error ? err.message : 'Validación fallida',
        });
      }

      try {
        const result = await container.claimBalanceUseCase.execute({
          claimTokenHash: input.claimTokenHash,
          userId: input.userId,
          zkRuleHash: input.zkRuleHash,
        });
        return reply.send(result);
      } catch (err) {
        return reply.status(400).send({
          allowed: false,
          reason: err instanceof Error ? err.message : 'Claim failed',
        });
      }
    }
  );
};

export default zkRoutes;
