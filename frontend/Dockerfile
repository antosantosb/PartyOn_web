# ─── Stage 1: Build ────────────────────────────────────────────────
FROM node:20-slim AS builder
# A root do contentor pasa a ser /app (onde o monorepo vive)
WORKDIR /app

# 1. Copiar todo o código do projeto
COPY . .

# 2. Instalar as dependências na raiz
RUN rm -f package-lock.json && npm cache clean --force && npm install --include=optional

# 3. Preparar o ambiente
ARG VITE_API_URL
ARG VITE_STRIPE_PUBLIC_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STRIPE_PUBLIC_KEY=$VITE_STRIPE_PUBLIC_KEY

# 4. Fazer o build dos schemas e do frontend
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
