import Fastify from 'fastify';
import { config } from './config/env.js';
import { getDb, closeDb } from './db/connection.js';
import { initWhatsApp } from './bot/whatsapp.js';
import { handleMessage } from './bot/handlers.js';

// ============================================================
// Entry Point — WasapTaxi
// ============================================================

async function main() {
  console.log('🚕 WasapTaxi — Iniciando...\n');

  // 1. Conectar a la base de datos
  console.log('📦 Conectando a PostgreSQL...');
  try {
    const db = getDb();
    console.log('✅ PostgreSQL conectado.\n');
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    process.exit(1);
  }

  // 2. Iniciar servidor HTTP (health checks)
  const fastify = Fastify({ logger: false });

  fastify.get('/health', async () => {
    return { status: 'ok', service: 'wasaptaxi', timestamp: new Date().toISOString() };
  });

  await fastify.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`🌐 Health check disponible en http://0.0.0.0:${config.port}/health\n`);

  // 3. Iniciar bot de WhatsApp
  console.log('📱 Iniciando bot de WhatsApp...');
  console.log('   (Si es la primera vez, aparecerá un código QR para escanear)\n');
  await initWhatsApp(handleMessage);

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n🛑 Señal ${signal} recibida. Cerrando...`);
    await fastify.close();
    await closeDb();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
