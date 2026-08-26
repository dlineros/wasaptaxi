import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { config } from '../config/env.js';

const logger = pino({ level: 'silent' }); // Silenciar logs internos de Baileys

let sock = null;
let messageHandler = null;

/**
 * Inicializa la conexión de WhatsApp con Baileys.
 * Muestra QR en consola para vincular el teléfono.
 * @param {Function} onMessage - Handler para mensajes entrantes
 * @returns {object} El socket de WhatsApp
 */
export async function initWhatsApp(onMessage) {
  messageHandler = onMessage;

  const { state, saveCreds } = await useMultiFileAuthState(config.authInfoPath);

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    defaultQueryTimeoutMs: undefined,
  });

  // Guardar credenciales cuando se actualizan
  sock.ev.on('creds.update', saveCreds);

  let qrAttempt = 0;

  // Manejar cambios de conexión
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrAttempt++;
      console.log(`\n📱 QR #${qrAttempt} — Escanea RÁPIDO (expira en ~20s):`);
      console.log('   WhatsApp → ⋮ → Dispositivos vinculados → Vincular dispositivo\n');
      qrcode.generate(qr, { small: false });
      console.log(`\n🔗 QR raw (si no se ve arriba): ${qr}\n`);
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

      if (reason === DisconnectReason.loggedOut) {
        console.error('❌ Sesión cerrada. Elimina auth_info/ y vuelve a escanear el QR.');
        process.exit(1);
      }

      // Reconectar automáticamente
      console.log('🔄 Reconectando...');
      setTimeout(() => initWhatsApp(messageHandler), 3000);
    }

    if (connection === 'open') {
      console.log('✅ Bot de WhatsApp conectado exitosamente!');
      console.log(`📱 Número: ${config.botPhoneNumber}`);
    }
  });

  // Manejar mensajes entrantes
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      // Ignorar mensajes propios, de grupos, y sin contenido
      if (msg.key.fromMe) continue;
      if (msg.key.remoteJid.endsWith('@g.us')) continue;
      if (!msg.message) continue;

      try {
        await messageHandler(msg);
      } catch (error) {
        console.error('Error procesando mensaje:', error);
      }
    }
  });

  return sock;
}

/**
 * Envía un mensaje de texto con delay aleatorio para evitar bans.
 */
export async function sendMessage(jid, text) {
  if (!sock) throw new Error('WhatsApp no está conectado');

  // Delay aleatorio entre mensajes
  const delay = config.bot.minDelay +
    Math.random() * (config.bot.maxDelay - config.bot.minDelay);
  await new Promise((resolve) => setTimeout(resolve, delay));

  await sock.sendMessage(jid, { text });
}

/**
 * Envía ubicación.
 */
export async function sendLocation(jid, latitude, longitude, name) {
  if (!sock) throw new Error('WhatsApp no está conectado');
  await sock.sendMessage(jid, {
    location: {
      degreesLatitude: latitude,
      degreesLongitude: longitude,
      name: name || undefined,
    },
  });
}

/**
 * Obtiene el socket actual.
 */
export function getSocket() {
  return sock;
}
