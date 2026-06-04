# --- STAGE 1: BUILD (BUILDER) ---
FROM node:20-slim AS builder

# Install system dependencies for Prisma
RUN apt-get update -y && apt-get install -y openssl

# A root do contentor pasa a ser /app
WORKDIR /app

# 1. Copiar as definições do Monorepo PRIMEIRO
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/
COPY packages/schemas/package*.json ./packages/schemas/

# 2. Instalar as dependências na raiz (Com a vacina para o bug do Vite/Rolldown/Prisma)
RUN rm -f package-lock.json && npm cache clean --force && npm install --include=optional

# 3. Copiar o resto do código de todo o projeto
COPY . .

# 4. Gerar o cliente do Prisma (Apontando para o ficheiro correto)
RUN npx prisma generate --schema=./backend/prisma/schema.prisma

# 5. Compilar! Primeiro os schemas (se tiverem build), depois o backend
RUN npm run build -w @partyon/schemas --if-present
RUN npm run build -w backend

# --- STAGE 2: PRODUCTION (RUNNER) ---
FROM node:20-slim

# Install runtime dependencies
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy monorepo configuration files
COPY package*.json ./
COPY packages/schemas ./packages/schemas
COPY backend/package*.json ./backend/

# Install ONLY production dependencies
RUN npm ci --omit=dev

# Copy generated Prisma binaries, schema, and compiled code from Stage 1
COPY --from=builder /app/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./backend/node_modules/@prisma
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/packages/schemas/dist ./packages/schemas/dist

# Expose port and run using native Node.js
WORKDIR /app/backend
EXPOSE 3000
CMD ["node", "dist/index.js"]
