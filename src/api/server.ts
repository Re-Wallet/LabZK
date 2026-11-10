/**
 * src/api/server.ts
 *
 * Servidor Fastify para LabZK PoC ZK.
 * Conecta el contenedor de dependencias (Neon + adaptadores) con las rutas API.
 *
 * Ejecutar:
 *   DATABASE_URL=... npm run dev
 *   o
 *   npm run dev   (usa DATABASE_URL por defecto de la rama pruebas-zk de Neon)
 */

import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import zkRoutes from './routes/zk.routes.js';
import { createContainerFromEnv, type Container } from '../di/container.js';

export async function buildServer(container: Container) {
  const app = fastify({
    logger: true,
    requestTimeout: 30000,
  }) as ReturnType<typeof fastify> & { container?: Container };

  // Guardar el contenedor en la instancia para acceso desde las routes
  app.container = container;

  // CORS
  await app.register(fastifyCors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Swagger documentation
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'LabZK — PoC ZK API',
        description: 'API para pruebas de conocimiento cero en wallet Stellar (ZK PoC)',
        version: '0.1.0',
      },
      servers: [{ url: `http://localhost:${container.config.port}` }],
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list' },
  });

  // Rutas ZK
  await app.register(zkRoutes, { prefix: '' });

  // Ruta raíz
  app.get('/', async (_request: any, reply: any) => {
    return reply.send({
      service: 'labzk-zk-api',
      version: '0.1.0',
      description: 'PoC ZK para wallet Stellar — Groth16/BN254 + Nullifier (Kakusho)',
      docs: '/docs',
      health: '/health',
    });
  });

  return app;
}

export async function startServer() {
  const container = createContainerFromEnv();

  // Verificar conexión a Neon antes de arrancar
  const dbHealthy = await container.pool
    .query('SELECT 1 AS healthy')
    .then(() => true)
    .catch((err) => {
      console.error('❌ No se pudo conectar a Neon (rama pruebas-zk):', err.message);
      return false;
    });

  if (!dbHealthy) {
    console.error('❌ Abortando arranque: base de datos Neon no disponible');
    process.exit(1);
  }

  console.log('✅ Conectado a Neon (rama pruebas-zk)');

  const app = await buildServer(container);

  const port = container.config.port;
  const address = await app.listen({ port, host: '0.0.0.0' });

  console.log(`🚀 LabZK API escuchando en ${address}`);
  console.log(`📚 Documentación en ${address}/docs`);
  console.log(`❤️  Health check en ${address}/health`);

  return { app, container };
}

// Arranque directo si se ejecuta este archivo
if (require.main === module) {
  startServer().catch((err) => {
    console.error('❌ Error al iniciar el servidor:', err);
    process.exit(1);
  });
}
