# =========================================================
# Stage 1: Build environment
# =========================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build-essential tools if required (none needed for standard npm)
# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including development dependencies for bundlers)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the frontend assets and compile/bundle the backend TypeScript server
RUN npm run build

# =========================================================
# Stage 2: Production environment
# =========================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set environmental flags
ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifests for runtime dependency resolution
COPY package*.json ./

# Install ONLY production dependencies to keep the final image ultra-slim
RUN npm ci --only=production

# Copy compiled backend and frontend bundle from the builder stage
COPY --from=builder /app/dist ./dist

# Create necessary persistent storage directories with proper permissions
RUN mkdir -p /app/uploads /app/excel_storage /app/backups && \
    chmod -R 755 /app

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.cjs"]
