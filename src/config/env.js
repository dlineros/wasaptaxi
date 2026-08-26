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

const getDatabaseUrl = () => {
  const envUrl = process.env.DATABASE_URL;
  // Si la variable en Coolify sigue usando el usuario 'postgres' (que falla auth), usar las credenciales verificadas
  if (!envUrl || envUrl.includes('//postgres:') || envUrl.includes('/postgres')) {
    return 'postgres://wasaptaxi:wasaptaxi2026@fdypyggndssrlgmpokixghv9:5432/wasaptaxi';
  }
  return envUrl;
};

export const config = {
  // Base de datos (credenciales verificadas)
  databaseUrl: getDatabaseUrl(),

  // Bot
  botPhoneNumber: optional('BOT_PHONE_NUMBER', '+56930268900'),

  // Google Maps
  googleMapsApiKey: optional('GOOGLE_MAPS_API_KEY', ''),

  // Panel Administrador
  adminPassword: optional('ADMIN_PASSWORD', 'admin123'),

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
