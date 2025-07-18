#!/bin/bash

set -euo pipefail

echo "==> Seeding database with Prisma seed script..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL is not set!"
  exit 1
fi

npx ts-node prisma/seed.ts

echo "✅ Seeding complete."
