import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  Browsers,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import { config } from '../config/env.js';

const logger = pino({ level: 'silent' }); // Silenciar logs internos de Baileys

let sock = null;
let messageHandler = null;
let currentQr = null;
let currentQrDataUrl = null;
let currentPairingCode = null;
let isConnected = false;

/**
 * Retorna el estado actual de la conexión de WhatsApp.
 */
export function getWhatsAppStatus() {
  return {
    isConnected,
    hasQr: !!currentQr,
    qrDataUrl: currentQrDataUrl,
    qrRaw: currentQr,
    pairingCode: currentPairingCode,
    botPhoneNumber: config.botPhoneNumber,
  };
}

/**
 * Inicializa la conexión de WhatsApp con Baileys.
 * @param {Function} onMessage - Handler para mensajes entrantes
 * @returns {object} El socket de WhatsApp
 */
export async function initWhatsApp(onMessage) {
  messageHandler = onMessage;

  const { state, saveCreds } = await useMultiFileAuthState(config.authInfoPath);
  
  // Obtener la última versión soportada de WhatsApp Web
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`📦 Usando WhatsApp Web v${version.join('.')}` + (isLatest ? ' (última versión)' : ''));

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    // Identificarse como navegador Chrome / macOS para evitar rechazos de WhatsApp
    browser: Browsers.macOS('Desktop'),
    logger,
    defaultQueryTimeoutMs: 60000,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    generateHighQualityLinkPreview: true,
  });

  // Guardar credenciales cuando se actualizan
  sock.ev.on('creds.update', saveCreds);

  let qrAttempt = 0;

  // Manejar cambios de conexión
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQr = qr;
      try {
        currentQrDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
      } catch (e) {
        console.error('Error generando QR DataURL:', e.message);
      }

      qrAttempt++;
      console.log(`\n📱 QR #${qrAttempt} generado. Escanea desde WhatsApp o abre en tu navegador web:`);
      qrcodeTerminal.generate(qr, { small: false });
      console.log(`\n🔗 Puedes ver el QR nítido en la web: http://localhost:${config.port}/qr\n`);
    }

    if (connection === 'close') {
      isConnected = false;
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log(`⚠️ Conexión de WhatsApp cerrada (código: ${statusCode})`);

      if (statusCode === DisconnectReason.loggedOut) {
        console.error('❌ Sesión cerrada permanentemente en WhatsApp. Es necesario volver a escanear el QR.');
        currentQr = null;
        currentQrDataUrl = null;
      }

      // Reconectar automáticamente
      console.log('🔄 Reconectando WhatsApp en 4 segundos...');
      setTimeout(() => initWhatsApp(messageHandler), 4000);
    }

    if (connection === 'open') {
      isConnected = true;
      currentQr = null;
      currentQrDataUrl = null;
      currentPairingCode = null;
      console.log('✅ ¡Bot de WhatsApp conectado exitosamente!');
      console.log(`📱 Conectado como: ${sock.user?.id || config.botPhoneNumber}`);
    }
  });

  // Manejar mensajes entrantes
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (msg.key.remoteJid?.endsWith('@g.us')) continue;
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
 * Solicita código de vinculación por número de teléfono (alternativa al QR).
 */
export async function requestPairing(phoneNumber) {
  if (!sock) throw new Error('WhatsApp no inicializado');
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  const code = await sock.requestPairingCode(cleanNumber);
  currentPairingCode = code;
  console.log(`\n🔑 CÓDIGO DE VINCULACIÓN: ${code}`);
  console.log(`   Ingresa este código en WhatsApp (Dispositivos vinculados → Vincular con número de teléfono)\n`);
  return code;
}

/**
 * Envía un mensaje de texto con delay aleatorio para evitar bans.
 */
export async function sendMessage(jid, text) {
  if (!sock) throw new Error('WhatsApp no está conectado');

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
