# --- STAGE 1: BUILD (BUILDER) ---
FROM node:20-slim AS builder

# Install system dependencies for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for compilation)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client and compile TypeScript to JavaScript
RUN npx prisma generate
RUN npm run build

# --- STAGE 2: PRODUCTION (RUNNER) ---
FROM node:20-slim

# Install runtime dependencies
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev

# Copy generated Prisma binaries, schema, and compiled code from Stage 1
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Run using native Node.js
CMD ["node", "dist/index.js"]
