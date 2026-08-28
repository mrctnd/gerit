FROM node:24-bookworm-slim AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3030 \
    DATABASE_PATH=/app/data/tasks.sqlite3

RUN apt-get update \
    && apt-get install --yes --no-install-recommends sqlite3 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 10001 gerit \
    && useradd --system --uid 10001 --gid gerit --home-dir /app --shell /usr/sbin/nologin gerit

WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --chown=gerit:gerit package.json package-lock.json ./
COPY --chown=gerit:gerit bin ./bin
COPY --chown=gerit:gerit public ./public
COPY --chown=gerit:gerit scripts ./scripts
COPY --chown=gerit:gerit src ./src
COPY --chown=gerit:gerit views ./views
RUN mkdir -p /app/data && chown gerit:gerit /app/data

USER gerit
EXPOSE 3030
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3030/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
