# Project Guidelines

This project is a SaaS boilerplate built with NestJS, Prisma, and Clerk. Ensure **Node.js v20 or later** is used.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Install dependencies:
   ```bash
   npx prisma generate
   ```
3. Run linters:
   ```bash
   npm run lint
   ```
4. Build the app:
   ```bash
   npm run build
   ```
5. Execute unit tests **only when `RUN_TESTS=true`**:
   ```bash
   npm run test
   ```

- End-to-end tests run only when `RUN_TESTS=true` using `npm run test:e2e`.
- Copy `.env.example` to `.env` and adjust values as needed.

## Database & Prisma
Data for the hosted environment is already seeded on Supabase. If you need to run migrations or seed locally:
```bash
./scripts/migrate.sh    # or: npx prisma migrate deploy
./scripts/seed.sh       # or: npm run seed
```
These commands use the connection string in your `.env` file.
