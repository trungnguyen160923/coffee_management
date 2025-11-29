# Multi-stage build for Frontend Customer (React/CRA)
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables (must be set at build time)
# CRA uses REACT_APP_ prefix for environment variables
ARG REACT_APP_API_GATEWAY=http://localhost:8000/api

# Set environment variables for build
ENV REACT_APP_API_GATEWAY=$REACT_APP_API_GATEWAY

# Build the application
RUN npm run build

# Stage 2: Runtime - Nginx to serve static files
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

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

