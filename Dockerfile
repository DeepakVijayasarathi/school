# ── Stage 1: Build backend ────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build
WORKDIR /src
COPY backend/src/SchoolKart.API/SchoolKart.API.csproj             src/SchoolKart.API/
COPY backend/src/SchoolKart.Application/SchoolKart.Application.csproj src/SchoolKart.Application/
COPY backend/src/SchoolKart.Domain/SchoolKart.Domain.csproj       src/SchoolKart.Domain/
COPY backend/src/SchoolKart.Infrastructure/SchoolKart.Infrastructure.csproj src/SchoolKart.Infrastructure/
RUN dotnet restore src/SchoolKart.API/SchoolKart.API.csproj
COPY backend/ .
RUN dotnet publish src/SchoolKart.API/SchoolKart.API.csproj -c Release -o /backend

# ── Stage 2: Build frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN mkdir -p public && npm run build

# ── Stage 3: Runtime (both services in one container) ─────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app

# Install Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy backend
COPY --from=backend-build /backend /backend

# Copy frontend (standalone mode)
COPY --from=frontend-build /app/.next/standalone /frontend
COPY --from=frontend-build /app/.next/static     /frontend/.next/static
COPY --from=frontend-build /app/public           /frontend/public

# Startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 3000 8080

CMD ["/start.sh"]
