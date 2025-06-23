# Multi-stage build for Node.js application
FROM node:18-alpine AS deps
WORKDIR /app

# Install corepack first for better layer caching
RUN npm install -g corepack && corepack enable

# Copy package files and yarn config
COPY package.json yarn.lock* .yarnrc.yml ./
COPY .yarn ./.yarn

# Install dependencies with optimizations
RUN yarn install --frozen-lockfile --check-cache --network-timeout 300000

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3005
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 spotify

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.yarn ./.yarn
COPY --from=deps /app/.yarnrc.yml ./
COPY --from=deps /app/package.json ./
COPY --from=deps /app/yarn.lock ./

# Copy source code
COPY . .

# Create data directory for persistence
RUN mkdir -p ./data/tokens && chown -R spotify:nodejs ./data

# Set ownership
RUN chown -R spotify:nodejs /app
USER spotify

EXPOSE 3005

CMD ["yarn", "start"]