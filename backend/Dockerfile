# --- STAGE 1: BUILD (BUILDER) ---
FROM node:20-slim AS builder

# Install system dependencies for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy monorepo configurations and workspace package files
COPY package*.json ./
COPY packages/schemas ./packages/schemas
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/

# Install ALL dependencies (including devDependencies for compilation)
RUN npm ci

# Copy backend source code
COPY backend ./backend

# Generate Prisma client and compile TypeScript to JavaScript
WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

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

# Expose port and run using native Node.js
WORKDIR /app/backend
EXPOSE 3000
CMD ["node", "dist/index.js"]
