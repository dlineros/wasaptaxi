import 'dotenv/config';

const required = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Variable de entorno requerida: ${key}`);
  }
  return value;
};

const optional = (key, defaultValue) => {
  return process.env[key] || defaultValue;
};

export const config = {
  // Base de datos (fallback hardcoded para deploy inicial)
  databaseUrl: optional('DATABASE_URL', 'postgres://wasaptaxi:wasaptaxi2026@159.89.237.93:5432/wasaptaxi'),

  // Bot
  botPhoneNumber: optional('BOT_PHONE_NUMBER', '+56930268900'),

  // Google Maps
  googleMapsApiKey: optional('GOOGLE_MAPS_API_KEY', ''),

  // Servidor
  port: parseInt(optional('PORT', '3000'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),

  // Baileys
  authInfoPath: optional('AUTH_INFO_PATH', './auth_info'),

  // Configuración del bot
  bot: {
    // Delay aleatorio entre mensajes (ms) para evitar bans
    minDelay: parseInt(optional('BOT_MIN_DELAY', '1000'), 10),
    maxDelay: parseInt(optional('BOT_MAX_DELAY', '3000'), 10),
    // Radio de búsqueda de taxistas (km)
    searchRadiusKm: parseFloat(optional('SEARCH_RADIUS_KM', '5')),
  },
};
