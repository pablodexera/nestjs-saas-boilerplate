#!/bin/bash

set -euo pipefail

echo "==> Starting local SaaS development stack..."

# Start dockerized infra (Postgres, Mailhog, etc) in the background
docker-compose up -d

# Wait for Postgres to be ready (simple loop)
echo "==> Waiting for database to be ready..."
until nc -z localhost 5432; do
  sleep 1
done

# Run migrations and seed scripts
./scripts/migrate.sh
./scripts/seed.sh

# Start the NestJS app in dev mode
echo "==> Launching NestJS backend (watch mode)..."
npm run start:dev
