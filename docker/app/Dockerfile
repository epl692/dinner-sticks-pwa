# Dinner Sticks: build the static PWA, then serve it with nginx.
# The sync server address is NOT baked in: it is written to /config.json when the container starts (RELAY_URL),
# so the same image works anywhere. People can also change it inside the app.
FROM node:22-bookworm AS build
WORKDIR /src
COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY docker/app/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/app/40-write-config.sh /docker-entrypoint.d/40-write-config.sh
RUN chmod +x /docker-entrypoint.d/40-write-config.sh
COPY --from=build /src/dist /usr/share/nginx/html
ENV RELAY_URL=""
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
