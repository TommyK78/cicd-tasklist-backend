# syntax=docker/dockerfile:1

############################
# Étape 1 : build (compilation TypeScript + génération Prisma)
############################
FROM node:20-slim AS builder

# Prisma a besoin d'openssl
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installer TOUTES les dépendances (dev incluses, pour pouvoir compiler)
COPY package*.json ./
RUN npm ci

# Générer le client Prisma
COPY prisma ./prisma
RUN npx prisma generate

# Compiler le TypeScript (src -> dist)
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

############################
# Étape 2 : runtime (image finale, légère)
############################
FROM node:20-slim AS runtime

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# Installer UNIQUEMENT les dépendances de production
COPY package*.json ./
RUN npm ci --omit=dev

# Récupérer le client Prisma déjà généré et le code compilé depuis l'étape build
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma

# L'application écoute sur le port 3001
EXPOSE 3001

CMD ["node", "dist/server.js"]
