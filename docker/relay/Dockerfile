# Sync relay: stores and forwards encrypted packets. It holds no keys and cannot read anything.
# Built straight from the Sync PWA Framework repository.
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
ARG SYNC_REPO=https://github.com/epl692/Sync-PWA-Framework.git
# A branch, tag or commit. Pin a commit for reproducible builds.
ARG SYNC_REF=master
WORKDIR /app
RUN git clone "$SYNC_REPO" . && git checkout "$SYNC_REF" && npm ci --no-audit --no-fund

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=8787
WORKDIR /app
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "const s=require('net').connect(process.env.PORT||8787,'127.0.0.1');s.on('connect',()=>process.exit(0));s.on('error',()=>process.exit(1))"
CMD ["npx", "tsx", "packages/relay-server/src/server.ts"]
