# ─── Stage 1: Build ────────────────────────────────────────────────
FROM node:20-slim AS builder
# A root do contentor pasa a ser /app (onde o monorepo vive)
WORKDIR /app

# 1. Copiar as definições do Monorepo PRIMEIRO (para o NPM saber que existem workspaces)
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/
COPY packages/schemas/package*.json ./packages/schemas/

# 2. Instalar as dependências na raiz (Com a vacina para o bug do Vite/Rolldown)
RUN rm -f package-lock.json && npm cache clean --force && npm install --include=optional

# 3. Copiar o resto do código do projeto
COPY . .

# 4. Preparar o ambiente
ARG VITE_API_URL
ARG VITE_STRIPE_PUBLIC_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STRIPE_PUBLIC_KEY=$VITE_STRIPE_PUBLIC_KEY

# 5. Fazer o build apenas do frontend (e dos schemas que ele precisa)
RUN npm run build -w @partyon/schemas
RUN npm run build -w frontend

# ─── Stage 2: Serve with Nginx ────────────────────────────────────────────────
FROM nginx:alpine

# Copy built files to Nginx's default serve directory
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# SPA routing: all routes fall back to index.html (needed for React Router)
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { \
    try_files $uri $uri/ /index.html; \
  } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
