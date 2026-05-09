FROM node:22-slim

# Install pnpm for build
RUN npm install -g pnpm

# Build from monorepo root context
WORKDIR /workspace

# Copy everything
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build api-server
RUN cd artifacts/api-server && pnpm run build

# Prepare runtime directory
RUN mkdir -p /runtime && \
    cp -r artifacts/api-server/dist /runtime/ && \
    cp -r artifacts/api-server/node_modules /runtime/

# Final stage - no pnpm
FROM node:22-slim

WORKDIR /app

# Copy only the built code and node_modules
COPY --from=0 /runtime/dist .
COPY --from=0 /runtime/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=2 \
  CMD node -e "require('http').get('http://localhost:8080/healthz', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

CMD ["node", "index.js"]
