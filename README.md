# 🚕 WasapTaxi

Servicio de solicitud de taxis por WhatsApp para Chile. Los pasajeros piden taxi por WhatsApp, los taxistas reciben notificaciones y aceptan carreras.

## Stack

- **Node.js 20** + Baileys (WhatsApp)
- **PostgreSQL** + Drizzle ORM
- **Fastify** (health checks)
- **Google Maps** (geocoding)
- **Docker** → Coolify

## Inicio Rápido (Local)

```bash
# 1. Copiar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 2. Levantar con Docker Compose
docker compose up -d

# 3. Ejecutar migraciones
npm run db:push

# 4. Escanear QR
docker logs -f wasaptaxi
# Escanea el QR que aparece con tu WhatsApp
```

## Registrar Taxistas

Los taxistas se registran manualmente en la base de datos:

```sql
INSERT INTO drivers (phone, name, car_model, car_plate, is_active)
VALUES ('+56912345678', 'Juan Pérez', 'Toyota Corolla', 'ABCD-12', true);
```

## Uso

### Pasajero
1. Envía cualquier mensaje al número del bot
2. Comparte tu ubicación 📍
3. Escribe tu destino
4. Espera la confirmación

### Taxista
| Comando | Acción |
|---------|--------|
| **SI** | Aceptar carrera |
| **NO** | Rechazar carrera |
| **COMPLETAR** | Finalizar carrera |
| **CANCELAR** | Cancelar carrera |
| **ACTIVO** | Activarse |
| **INACTIVO** | Desactivarse |
| **ESTADO** | Ver carrera actual |
| 📍 Ubicación | Actualizar posición |

## Deploy (Coolify)

1. Conectar este repo privado a Coolify
2. Configurar variables de entorno
3. Montar volumen persistente en `/app/auth_info`
4. Deploy → escanear QR en los logs
