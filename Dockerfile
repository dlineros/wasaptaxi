FROM node:20-alpine

# Dependencias del sistema, compilación y utilidades para healthcheck
RUN apk add --no-cache python3 make g++ curl wget

WORKDIR /app

# Copiar package files e instalar dependencias
COPY package*.json ./
RUN npm ci --production && npm cache clean --force

# Copiar código fuente
COPY src/ ./src/
COPY drizzle.config.js ./

# Puerto para health checks y panel QR
EXPOSE 3000

# Directorio para la sesión de WhatsApp (montar como volumen)
VOLUME ["/app/auth_info"]

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/health || exit 1

CMD ["node", "src/index.js"]
