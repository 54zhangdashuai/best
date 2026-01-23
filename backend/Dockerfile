# Stage 1: Install dependencies (with build tools for native modules like sqlite3)
FROM node:18-bullseye-slim AS deps
WORKDIR /app

# Install build tools required for sqlite3 compilation fallback
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# Install only production dependencies
RUN npm install --omit=dev

# Stage 2: Build TypeScript
FROM node:18-bullseye-slim AS builder
WORKDIR /app
COPY package*.json ./
# Install all dependencies (including dev) for building
RUN npm install
COPY . .
RUN npm run build

# Stage 3: Runtime
FROM node:18-bullseye-slim
WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy compiled code from builder stage
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Ensure data directory exists
RUN mkdir -p data

EXPOSE 3000

CMD ["node", "dist/server.js"]
