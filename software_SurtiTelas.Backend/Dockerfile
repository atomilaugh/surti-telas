FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# `--include=dev` es obligatorio: `prisma` (CLI) y `tsx` viven en devDependencies.
# Si Render define NODE_ENV=production como variable disponible durante el build,
# `npm ci` omitiria devDependencies y la CMD fallaria al no encontrar el CLI de Prisma.
RUN npm config set registry https://registry.npmjs.org/ && npm config set fetch-timeout 600000 && npm config set fetch-retry-maxtimeout 600000 && npm ci --include=dev

COPY tsconfig.json ./
COPY prisma ./prisma

RUN npx prisma generate

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json ./
# Se copia la configuracion de Prisma para que `migrate deploy` se comporte
# exactamente igual que en local (misma deteccion de schema y avisos).
COPY prisma.config.ts ./
COPY src ./src

RUN mkdir -p /app/uploads

EXPOSE 3000

# Aplica las migraciones pendientes antes de arrancar el servidor.
# `&&` garantiza que el proceso no continue si la migracion falla,
# evitando levantar la API contra un esquema desalineado.
# `exec` deja al servidor como PID 1 para que Render le envie SIGTERM
# y el apagado sea limpio.
CMD ["sh", "-c", "npx prisma migrate deploy && exec npx tsx src/server.ts"]
