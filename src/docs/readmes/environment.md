# Environment Variables

This project relies on the variables defined in `.env.example`. Create a `.env` file based on that template and populate the values from your provider dashboards.

## Core App / Infra
- **NODE_ENV** – Node runtime environment (`development`, `production`, `test`). Example: `NODE_ENV=development`
- **PORT** – Port the HTTP server listens on. Example: `PORT=3000`

## Database
- **DATABASE_URL** – Postgres connection string. Use the URI from your database provider or local instance. Example: `DATABASE_URL=postgresql://saas_user:saas_pass@localhost:5432/saas_db`

## Clerk Authentication
- **CLERK_SECRET_KEY** – Secret API key from the Clerk dashboard. Example: `CLERK_SECRET_KEY=your-clerk-secret-key`
- **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY** – Public API key from Clerk. Example: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key`
- **CLERK_WEBHOOK_SECRET** – Webhook signing secret from the Clerk Webhooks page. Example: `CLERK_WEBHOOK_SECRET=your-clerk-webhook-signing-secret`


## Seed Users
- **SEED_ADMIN_EMAIL** / **SEED_ADMIN_PASSWORD** – Credentials for the seeded admin user. Example: `SEED_ADMIN_EMAIL=admin@example.com`, `SEED_ADMIN_PASSWORD=changeme`
- **SEED_WORKSPACE_ADMIN_EMAIL** / **SEED_WORKSPACE_ADMIN_PASSWORD** – Credentials for the seeded workspace admin user. Example: `SEED_WORKSPACE_ADMIN_EMAIL=workspace-admin@example.com`, `SEED_WORKSPACE_ADMIN_PASSWORD=changeme`
- **SEED_USER_EMAIL** / **SEED_USER_PASSWORD** – Credentials for the seeded regular user. Example: `SEED_USER_EMAIL=user@example.com`, `SEED_USER_PASSWORD=changeme`

- **SEED_WORKSPACE_ID** – ID for the demo workspace. Example: `SEED_WORKSPACE_ID=demo-workspace-id`

These accounts and the workspace ID are also used when running the e2e tests.
You can obtain a Clerk session token for local testing by calling `POST /auth/login`
with one of these seed email/password pairs. This helper endpoint is intended
solely for development and should not be used for real authentication.
## Email / Notifications
- **RESEND_API_KEY** – API key from Resend. Example: `RESEND_API_KEY=your-resend-api-key`
- **RESEND_FROM_EMAIL** – From address used when sending emails. Example: `RESEND_FROM_EMAIL=no-reply@example.com`
- **ENABLE_EMAIL** – Set to `true` to enable outbound email. Example: `ENABLE_EMAIL=false`

## File Storage

### Local (development)
- Files are saved under `uploads/${APP_NAME}/files/<workspaceId>/` in the project root.
- No additional variables are needed beyond `NODE_ENV=development`.

### AWS S3 (production)
- **AWS_ACCESS_KEY_ID** and **AWS_SECRET_ACCESS_KEY** – IAM credentials with S3 access. Example: `AWS_ACCESS_KEY_ID=your-aws-key`, `AWS_SECRET_ACCESS_KEY=your-aws-secret`
- **AWS_S3_BUCKET** – Name of your S3 bucket. Example: `AWS_S3_BUCKET=your-bucket-name`
- **AWS_S3_REGION** – AWS region where the bucket resides. Example: `AWS_S3_REGION=us-east-1`

## Stripe Billing
- **STRIPE_API_KEY** – Secret key from the Stripe dashboard. Example: `STRIPE_API_KEY=your-stripe-key`
- **STRIPE_WEBHOOK_SECRET** – Webhook secret from Stripe’s webhook settings. Example: `STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret`

## Logging
- **LOG_LEVEL** – Pino log level (`info`, `debug`, etc.). Example: `LOG_LEVEL=info`
- **BETTERSTACK_TOKEN** – Optional Logtail token from BetterStack. Example: `BETTERSTACK_TOKEN=`

## Misc
- **REDIS_URL** – Redis connection string if used. Example: `REDIS_URL=redis://localhost:6379`
- **APP_URL** – Publicly accessible application URL. Example: `APP_URL=http://localhost:3000`
- **APP_NAME** – Short app name used in emails and file paths. Example: `APP_NAME=My App`
- **APP_WEBSITE** – Marketing website URL. Example: `APP_WEBSITE=https://example.com`
- **APP_EMAIL** – Support email address. Example: `APP_EMAIL=support@example.com`

## Guest Access
- **GUEST_TOKEN_SECRET** – Secret used to sign guest JWTs. Example: `GUEST_TOKEN_SECRET=change-me-in-prod`
- **GUEST_TOKEN_EXPIRY_SECONDS** – Lifetime of guest tokens in seconds. Example: `GUEST_TOKEN_EXPIRY_SECONDS=3600`
- **GUEST_WORKSPACE_ID** – Workspace ID assigned to guest users. Example: `GUEST_WORKSPACE_ID=guest-demo-workspace-id`

