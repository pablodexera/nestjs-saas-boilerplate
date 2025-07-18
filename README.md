# SaaS NestJS Boilerplate

A production‑grade, opinionated starter for building scalable SaaS applications with **NestJS, Clerk, Postgres, Prisma, Pino, AWS S3, Resend, Stripe**, and modern DevOps.

---

## 1  Requirements

* **Node.js 20** or newer

---

## 2  ✨ Key Features

1. **Full Clerk authentication** (SSO, social, email)
2. **Multi‑tenancy** (workspaces & user memberships)
3. **Subscription management** (Stripe‑ready)
4. **Secure file uploads** (local ↔ S3 switch)
5. **Transactional email** notifications (Resend)
6. **Centralised audit/event logging**
7. **API docs** with Swagger/ReDoc (custom‑branded)
8. **Modular, feature‑driven** code structure
9. **E2E & unit tests** pre‑configured
10. **Dev/Prod parity** via Docker & Compose
11. **GitHub Actions CI/CD** ready‑to‑use

---

## 3  📦 Pre‑built Modules & Usage Examples

| Module            | Quick snippet                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Auth**          | `@UseGuards(AuthGuard('clerk'))`<br>`@Get('profile')`<br>`getProfile(@Req() req) { return req.user; }`             |
| **Workspaces**    | `const ws = await workspacesService.create({ name: 'Acme' }, userId);`                                             |
| **Subscriptions** | `await subscriptionsService.createDefaultSubscriptionForWorkspace(ws.id);`                                         |
| **File Uploads**  | `await filesService.uploadFile({ file, userId, workspaceId });`                                                    |
| **Notifications** | `await notificationsService.sendEmail('user@example.com', 'welcome', { name });`                                   |
| **Audit Events**  | `await auditEventUtil.logEvent({ eventType: 'user.created', actorId: userId, workspaceId, details: { email }, });` |

### 3.1  Audit Event Logging

Use `AuditEventUtil.logEvent` **only** for actions that require a permanent audit trail. The util writes to the `audit_events` table **and** emits a structured Pino log (shipped to BetterStack when `BETTERSTACK_TOKEN` is set).

```ts
await auditEventUtil.logEvent({
  eventType: 'workspace.deleted',
  actorId: adminId,
  workspaceId,
  details: { reason: 'user request' },
});
```

> For routine insights/debugging use the standard NestJS Pino logger (see § 15).

### 3.2  Notification Templates

**CANONICAL RULE:** Handlebars template filenames must be lowercase, alphanumeric, and only hyphens are permitted. Example: `welcome-email-template.hbs`.

`NotificationsService.sendEmail` renders Handlebars templates in `src/notifications/email-templates`.

Available templates:

* `welcome.hbs`
* `workspace-invite.hbs`
* `subscription-expiring.hbs`

```ts
await notificationsService.sendEmail('user@example.com', 'welcome', {
  fullName: 'Test User',
});
```

Detailed docs: [`src/docs/readmes/notifications.md`](src/docs/readmes/notifications.md).

### 3.3  Guest or Member POC Module (Free Trial Feature Example)

The `guest-or-member-poc` module demonstrates how to build endpoints that support both guest and authenticated user access for the purpose of free trialing features of the platform. It provides a single endpoint:

* `GET /workspaces/:workspaceId/trial-feature`

This endpoint is protected by the `@GuestOrWorkspaceMember()` guard, allowing both guest tokens and workspace members to access it. The response includes key fields about the caller (guest or user), the workspace, and mock subscription information. This module is a good starting point for implementing endpoints that allow users to experience SaaS features before full registration or payment.

---

## 4  Workspace Management

### 4.1  Roles

| Role     | Description                                    |
| -------- | ---------------------------------------------- |
| `OWNER`  | Creator with full control (settings & billing) |
| `ADMIN`  | Manage settings & members                      |
| `MEMBER` | Standard access                                |

Routes decorated with `@WorkspaceAdmin` require `OWNER` **or** `ADMIN`.

### 4.2  Workspace CRUD Endpoints

| # | Method   | Path               | Description                                                        |
| - | -------- | ------------------ | ------------------------------------------------------------------ |
| 1 | `POST`   | `/workspaces/user` | Create a workspace                                                 |
| 2 | `GET`    | `/workspaces/user` | List your workspaces (`is_primary` flag; excludes deleted/removed) |
| 3 | `PATCH`  | `/workspaces/:id`  | Update workspace                                                   |
| 4 | `DELETE` | `/workspaces/:id`  | Soft‑delete workspace                                              |

### 4.3  Member Endpoints

| # | Method   | Path                                   | Description                |
| - | -------- | -------------------------------------- | -------------------------- |
| 1 | `GET`    | `/workspaces/:id/members`              | List members (admin only)  |
| 2 | `POST`   | `/workspaces/:id/members`              | Invite a user (admin only) |
| 3 | `POST`   | `/workspaces/:id/members/accept`       | Accept invite              |
| 4 | `DELETE` | `/workspaces/:id/members/:userId`      | Remove member (admin only) |
| 5 | `DELETE` | `/workspaces/:id/members/leave`        | Leave workspace            |
| 6 | `POST`   | `/workspaces/:id/members/decline`      | Decline invite             |
| 7 | `PATCH`  | `/workspaces/:id/members/:userId/role` | Change role (admin only)   |

#### 4.3.1  Typical Workflow

1. **Create a workspace**

   ```http
   POST /workspaces/user
   { "name": "Acme Inc", "slug": "acme-inc" }
   ```
2. **Invite a member**

   ```http
   POST /workspaces/{workspaceId}/members
   { "email": "teammate@example.com" }
   ```
3. **Accept the invite**

   ```http
   POST /workspaces/{workspaceId}/members/accept
   ```
4. **Change the member role**

   ```http
   PATCH /workspaces/{workspaceId}/members/{userId}/role
   { "role": "ADMIN" }
   ```

### 4.4  User Endpoint

| Method  | Path                                       | Description           |
| ------- | ------------------------------------------ | --------------------- |
| `PATCH` | `/users/me/primary-workspace/:workspaceId` | Set primary workspace |

---

## 5  Subscriptions

* New workspaces start on the **Free** plan; `createDefaultSubscriptionForWorkspace()` inserts the record automatically.

### 5.1  Retrieve Subscription

```http
GET /subscriptions/workspace/{workspaceId}
```

### 5.2  Upgrade Plan

```http
PATCH /subscriptions/workspace/{workspaceId}/upgrade
{
  "plan": "pro",
  "billingPeriod": "annual",
  "seats": 5,
  "stripeId": "sub_123",     // Stripe checkout ID
  "trialEnd": "2025-01-01T00:00:00Z"
}
```

Invoke after payment (e.g. via `checkout.session.completed` webhook).

### 5.3  Update Subscription Status

```http
PATCH /subscriptions/workspace/{workspaceId}/status
{
  "status": "past_due"
}
```

Triggered by Stripe `customer.subscription.updated` or similar webhooks.

---

## 6  File Storage

* Endpoint: `/workspaces/{workspaceId}/files/upload`
* Development ⇒ local `uploads/${APP_NAME}/files/<workspaceId>/`
* Production with `NODE_ENV=production` **and** AWS variables ⇒ S3

### 6.1  Upload Example

```bash
curl -X POST http://localhost:3000/workspaces/{workspaceId}/files/upload \
  -H "Authorization: Bearer <token>" \
  -F file=@/path/to/myfile.pdf
```

### 6.2  Download Example

```bash
curl -L -H "Authorization: Bearer <token>" \
  http://localhost:3000/workspaces/{workspaceId}/files/{fileId}/download \
  -o myfile.pdf
```

`StorageFactory` auto‑selects S3 when `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` are present; otherwise defaults to local storage.

---

## 7  🚀 Getting Started

1. **Clone the repo**

   ```bash
   ```

```

git clone [https://github.com/your-org/your-saas-boilerplate.git](https://github.com/your-org/your-saas-boilerplate.git)
cd your-saas-boilerplate

```

````
2. **Install dependencies**

   ```bash
npm install
````

3. **Configure environment**

   ```bash
   ```

```

cp .env.example .env   # edit credentials

```

````
4. **Run migrations**

   ```bash
./scripts/migrate.sh
````

5. **(Optional) Seed data** (set vars first—see § 8)

   ```bash
   ```

```

./scripts/seed.sh   # or npm run seed

```

````
6. **Start the app**

   ```bash
./scripts/start-local.sh   # or npm run start:dev
````

7. **View API Docs**

   * Swagger → [http://localhost:3000/docs](http://localhost:3000/docs)
   * ReDoc  → [http://localhost:3000/redoc](http://localhost:3000/redoc)

---

## 8  🛠️ Environment Variables

Create `.env` from `.env.example` **before** running migrations.

| Variable                                                      | Purpose                                                |
| ------------------------------------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`                                                | Postgres connection string                             |
| `CLERK_SECRET_KEY` & friends                                  | Clerk auth                                             |
| `RESEND_API_KEY`, `ENABLE_EMAIL`                              | Resend email sending                                   |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` | S3 storage                                             |
| `STRIPE_API_KEY`                                              | Stripe billing                                         |
| `GUEST_TOKEN_*`                                               | Guest access                                           |
| `SEED_*` vars                                                 | Seed script credentials (admin, workspace admin, user) |
| `SEED_WORKSPACE_ID`                                           | ID for demo workspace                                  |

> CI/CD expects these services reachable according to `.env`; use `docker-compose.yml` or your infra to provide them. Full explanations: [`src/docs/readmes/environment.md`](src/docs/readmes/environment.md).

---

## 9  🐳 Docker / Compose

```bash
docker-compose up --build
```

Runs Postgres + app in one command.

---

## 10  📚 Folder Structure

<details>
<summary>Expand</summary>

```
/src
  /auth          # Clerk auth, strategies, webhooks
  /users         # User CRUD, DTOs, entity, tests
  /workspaces    # Workspace CRUD, membership, tests
  /subscriptions # Subscriptions, Stripe hooks
  /files         # Uploads, S3/local, signed URLs
  /notifications # Email templates, notifications
  /audit-events  # Audit/event logging
  ...
/prisma          # Prisma schema, migrations, seed
/scripts         # Migrate, seed, start-local scripts
...
```

</details>

---

## 11  🏗️ Scaffolding Modules (NestJS CLI)

```bash
nest g module files
nest g controller files --flat
nest g service files --flat
nest g class files files/dto/create-file.dto --no-spec
nest g class files files/dto/update-file.dto --no-spec
mkdir -p src/files/tests && touch src/files/tests/files.e2e-spec.ts
```

Adjust names as needed.

---

## 12  Working with Prisma

1. Define models in `prisma/schema.prisma`.
2. Run dev migration & regenerate client:

   ```bash
   npx prisma migrate dev
   ```
3. To only regenerate client:

   ```bash
   npx prisma generate
   ```
4. Seed data:

   ```bash
   ./scripts/seed.sh
   ```
5. Inject Prisma via `PrismaService`:

   ```ts
   @Injectable()
   export class UsersService {
     constructor(private readonly prisma: PrismaService) {}
   }
   ```

---

## 13  🧪 Testing

### 13.1  Setup

* Migrate & seed DB:

  ```bash
  ./scripts/migrate.sh
  ./scripts/seed.sh
  ```
* Install deps:

  ```bash
  npm install
  ```

### 13.2  Commands

* **Unit tests** → `npm run test:unit`
* **E2E tests**  → `npm run test:e2e`

> All E2E specs are still stubs (`TODO`). Helpers: only `getTestUserByEmail(email)` remains.

### 13.3  Get Test Tokens (seed users)

```bash
npm run get:test:tokens
```

Prints Clerk JWTs for admin, workspace admin & user defined in `.env`.

---

## 14  Accessing User / Workspace / Subscription in Code

Guards (AdminGuard, CurrentUserGuard, WorkspaceGuard, etc.) harmonise the `request` object.

```ts
@Get('some-protected-endpoint')
@UseGuards(WorkspaceGuard)
getProtected(@Req() req) {
  const userId = req.user.id;
  const isGuest = req.user.isGuest;
  const workspace = req.workspace;
  const subscription = req.subscription;
}
```

* `req.user.isGuest` → restrict guest actions when necessary.
* `req.subscription` → first active subscription (throws if none).

### Guard Request Object Enrichment Matrix

| Guard                       | Sets `request.user` | Sets `request.workspace` | Sets `request.subscription` | Sets `request.user.workspaceMembership` |
| --------------------------- | :-----------------: | :----------------------: | :-------------------------: | :-------------------------------------: |
| GuestOrWorkspaceMemberGuard |          ✅          |             ✅            |              ✅              |              ✅ (for users)              |
| WorkspaceGuard              |          ✅          |             ✅            |              ✅              |                    ✅                    |
| WorkspaceAdminGuard         |          ✅          |             ✅            |              ✅              |                    ✅                    |
| AdminGuard                  |          ✅          |             ❌            |              ❌              |                    ❌                    |
| CurrentUserGuard            |          ✅          |             ❌            |              ❌              |                    ❌                    |

---

## 15  Logging Best Practices (Pino)

**Canonical pattern** → *message first*, colon, placeholder, object/value(s):

```ts
this.logger.info('Message: %o', { key: value });
this.logger.warn('Warning: %o', { key: value });
this.logger.error('Error: %o', { key: value });
this.logger.debug('Debug: %o', { key: value });
```

* **Single value**: `this.logger.error('Missing template: %s', templatePath);`
* **Multiple values**: `this.logger.info('UserId=%s, Email=%s, Error=%s', userId, email, error);`

Avoid:

* `this.logger.info({ ... }, 'Message')`
* `console.log()` in prod code.

---

## 16  🛡️ Security & Compliance

* Clerk JWT + role guards on every endpoint
* API rate limiting, secure file access, immutable audit trail
* Production‑grade logging (Pino → Logtail)

---

## 17  🔗 Integrations

* [Clerk](https://clerk.dev/)
* [Prisma](https://www.prisma.io/)
* [Pino](https://getpino.io/)
* [AWS S3](https://aws.amazon.com/s3/)
* [Resend](https://resend.com/)
* [Stripe](https://stripe.com/)

---

## 18  CI/CD Notes

* Tests run in CI only when `RUN_TESTS=true`.
* Workflows migrate & seed DB automatically.

---

## 19  🙌 License

MIT – see [`LICENSE`](./LICENSE).
