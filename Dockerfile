FROM oven/bun:1.3.9-slim AS builder

WORKDIR /app

# Build arg for private Cloudsmith registry
ARG CLOUDSMITH_TOKEN

COPY .npmrc package.json tsconfig.json ./
COPY src ./src

# Substitute token at build time, install, build, then restore placeholder
RUN CLOUDSMITH_TOKEN_LITERAL="${CLOUDSMITH_TOKEN}" && \
    sed -i "s|\${CLOUDSMITH_TOKEN}|${CLOUDSMITH_TOKEN_LITERAL}|g" .npmrc && \
    bun install && \
    bun run build && \
    sed -i "s|${CLOUDSMITH_TOKEN_LITERAL}|\${CLOUDSMITH_TOKEN}|g" .npmrc

FROM oven/bun:1.3.9-slim

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY src/public ./public

EXPOSE 8090

CMD ["bun", "dist/index.js"]
