# syntax=docker/dockerfile:1

# --- Étape 1 : build TypeScript + génération du client Prisma ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Génération du client Prisma puis compilation TypeScript (=> dossier dist/)
RUN npx prisma generate
RUN npm run build

# --- Étape 2 : image finale de production (dépendances runtime uniquement) ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copie du code compilé, du schéma Prisma et du client généré
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001
CMD ["node", "dist/server.js"]
