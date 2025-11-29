# Multi-stage build for Frontend Admin/Manager/Staff (React/Vite)
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build arguments for environment variables (must be set at build time)
# Note: Code uses import.meta.env.API_BASE_URL, but Vite requires VITE_ prefix
# So we need both: VITE_API_BASE_URL and VITE_AI_SERVICE_URL
ARG VITE_API_BASE_URL=http://localhost:8000
ARG VITE_AI_SERVICE_URL=http://localhost:8005

# Set environment variables for build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_AI_SERVICE_URL=$VITE_AI_SERVICE_URL
# Also set without VITE_ prefix for backward compatibility (if code uses it)
ENV API_BASE_URL=$VITE_API_BASE_URL
ENV AI_SERVICE_URL=$VITE_AI_SERVICE_URL

# Build the application
RUN npm run build

# Stage 2: Runtime - Nginx to serve static files
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

