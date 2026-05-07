FROM node:22-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory - use monorepo root for install
WORKDIR /app

# Copy workspace files from root context
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY package.json ./
COPY lib ./lib
COPY artifacts/api-server ./artifacts/api-server

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Build the API server
WORKDIR /app/artifacts/api-server
RUN pnpm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Copy dist from builder
COPY --from=builder /app/artifacts/api-server/dist ./dist

# Copy node_modules for production dependencies only
COPY --from=builder /app/artifacts/api-server/node_modules ./node_modules

# Set Node environment to production
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/healthz', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the app
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
