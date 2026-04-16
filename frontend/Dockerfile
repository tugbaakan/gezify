# Build Vite → dist, then serve with Caddy (SPA fallback). Railway sets PORT.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2-alpine
ENV PORT=8080
EXPOSE 8080
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
