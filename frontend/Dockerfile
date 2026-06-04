# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# VITE_* vars must be injected at BUILD time (not runtime)
# They are passed as --build-arg from docker-compose
ARG VITE_API_BASE
ARG VITE_STRIPE_PUBLIC_KEY

ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_STRIPE_PUBLIC_KEY=$VITE_STRIPE_PUBLIC_KEY

RUN npm run build

# ─── Stage 2: Serve with Nginx ────────────────────────────────────────────────
FROM nginx:alpine

# Copy built files to Nginx's default serve directory
COPY --from=builder /app/dist /usr/share/nginx/html

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
