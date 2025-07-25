# Multi-stage build for Node.js application
FROM node:18-alpine AS deps
WORKDIR /app

# Ensure we have a compatible Yarn version (Node 18 Alpine should have Yarn 1.x)
RUN yarn --version

# Copy package files and registry config
COPY package.json yarn.lock* .npmrc .yarnrc ./

# Install dependencies with optimizations
RUN yarn install --frozen-lockfile --network-timeout 300000

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3005
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 spotify

# Ensure we have a compatible Yarn version (Node 18 Alpine should have Yarn 1.x)
RUN yarn --version

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./
COPY --from=deps /app/yarn.lock ./
COPY --from=deps /app/.npmrc ./
COPY --from=deps /app/.yarnrc ./

# Copy source code
COPY . .

# Build the application (frontend + backend)
RUN yarn build

# Set ownership
RUN chown -R spotify:nodejs /app
USER spotify

EXPOSE 3005

CMD ["yarn", "start"]