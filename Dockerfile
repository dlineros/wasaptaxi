FROM node:20-alpine

# Dependencias nativas para Baileys
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar package files e instalar dependencias
COPY package*.json ./
RUN npm ci --production && npm cache clean --force

# Copiar código fuente
COPY src/ ./src/
COPY drizzle.config.js ./

# Puerto para health checks
EXPOSE 3000

# Directorio para la sesión de WhatsApp (montar como volumen)
VOLUME ["/app/auth_info"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
