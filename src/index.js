import Fastify from 'fastify';
import { config } from './config/env.js';
import { getDb, closeDb } from './db/connection.js';
import { initDb } from './db/init.js';
import { initWhatsApp, getWhatsAppStatus, requestPairing } from './bot/whatsapp.js';
import { handleMessage } from './bot/handlers.js';

// ============================================================
// Entry Point — WasapTaxi
// ============================================================

async function main() {
  console.log('🚕 WasapTaxi — Iniciando...\n');

  // 1. Conectar a la base de datos e inicializar tablas
  console.log('📦 Conectando a PostgreSQL...');
  try {
    getDb();
    console.log('✅ PostgreSQL conectado.');
    await initDb();
    console.log('✅ Base de datos lista.\n');
  } catch (error) {
    console.error('❌ Error conectando/inicializando PostgreSQL:', error.message);
    process.exit(1);
  }

  // 2. Iniciar servidor HTTP (health checks y panel web de vinculación)
  const fastify = Fastify({ logger: false });

  fastify.get('/health', async () => {
    const status = getWhatsAppStatus();
    return {
      status: 'ok',
      service: 'wasaptaxi',
      whatsapp: status.isConnected ? 'connected' : 'waiting_qr',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/api/status', async () => {
    return getWhatsAppStatus();
  });

  fastify.post('/api/pair', async (request, reply) => {
    const { phone } = request.body || {};
    const phoneNumber = phone || config.botPhoneNumber;
    try {
      const code = await requestPairing(phoneNumber);
      return { success: true, code, phone: phoneNumber };
    } catch (e) {
      reply.status(500);
      return { success: false, error: e.message };
    }
  });

  // Página web para escanear QR o ver estado
  fastify.get('/', async (request, reply) => {
    reply.type('text/html');
    const status = getWhatsAppStatus();

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WasapTaxi — Estado y Vinculación</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: #1e293b; border-radius: 16px; padding: 32px; max-width: 460px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; border: 1px solid #334155; }
    h1 { font-size: 24px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; }
    p.subtitle { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
    .status-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: 999px; font-weight: 600; font-size: 14px; margin-bottom: 20px; }
    .connected { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid #22c55e; }
    .waiting { background: rgba(234, 179, 8, 0.2); color: #facc15; border: 1px solid #eab308; }
    .qr-box { background: white; padding: 16px; border-radius: 12px; display: inline-block; margin: 12px 0 20px; }
    .qr-box img { display: block; width: 260px; height: 260px; }
    .instructions { text-align: left; background: #0f172a; border-radius: 8px; padding: 14px 18px; font-size: 13px; line-height: 1.6; color: #cbd5e1; margin-top: 16px; }
    .instructions ol { margin-left: 20px; }
    .footer { margin-top: 20px; font-size: 12px; color: #64748b; }
    .btn { background: #2563eb; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 12px; width: 100%; font-size: 14px; }
    .btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🚕 WasapTaxi</h1>
    <p class="subtitle">Servicio de Taxis por WhatsApp — Chile</p>

    ${status.isConnected ? `
      <div class="status-badge connected">
        <span>●</span> Bot Conectado y Operativo
      </div>
      <p style="color: #cbd5e1; margin: 16px 0;">El bot está escuchando mensajes y listo para asignar viajes.</p>
    ` : `
      <div class="status-badge waiting">
        <span>⏳</span> Esperando vinculación de WhatsApp
      </div>

      ${status.qrDataUrl ? `
        <div class="qr-box">
          <img src="${status.qrDataUrl}" alt="WhatsApp QR">
        </div>
        <p style="font-size: 13px; color: #94a3b8;">El código QR se actualiza automáticamente.</p>
      ` : `
        <p style="padding: 40px 0; color: #94a3b8;">Generando nuevo código QR...</p>
      `}

      <div class="instructions">
        <strong>Cómo vincular:</strong>
        <ol>
          <li>Abre <strong>WhatsApp</strong> en tu teléfono</li>
          <li>Toca <strong>⋮ Menú</strong> o <strong>Configuración</strong></li>
          <li>Selecciona <strong>Dispositivos vinculados</strong></li>
          <li>Toca <strong>Vincular un dispositivo</strong> y escanea el código</li>
        </ol>
      </div>
    `}

    <div class="footer">
      Esta página se actualiza automáticamente cada 5 segundos.
    </div>
  </div>

  <script>
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  </script>
</body>
</html>`;
  });

  fastify.get('/qr', async (request, reply) => {
    reply.redirect('/');
  });

  await fastify.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`🌐 Panel web disponible en http://0.0.0.0:${config.port}/\n`);

  // 3. Iniciar bot de WhatsApp
  console.log('📱 Iniciando bot de WhatsApp...');
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
