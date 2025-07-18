/* eslint-disable no-console */
import { PrismaClient, WorkspaceRole } from '@prisma/client';
import { createClerkClient, type User as ClerkUser } from '@clerk/backend';

const DEFAULT_DEMO_WORKSPACE_ID = 'demo-workspace-id';

const prisma = new PrismaClient();

// ───────────────────── Clerk client ─────────────────────
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!, // e.g. sk_test_...
});

// Typed helper to find-or-create a Clerk user
interface EnsureClerkUserParams {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  isAdmin?: boolean;
}

async function ensureClerkUser({
  email,
  firstName,
  lastName,
  password,
  isAdmin = false,
}: EnsureClerkUserParams): Promise<ClerkUser> {
  const { data: users } = await clerk.users.getUserList({     // ← .data ✅
    emailAddress: [email],
  });

  if (users.length > 0) {
    return users[0];                                          // ← [0] ✅
  }

  return clerk.users.createUser({
    emailAddress: [email],
    firstName,
    lastName,
    password,
    publicMetadata: isAdmin ? { is_global_admin: true } : {},
  });
}
async function main() {
  // ───────── 1. create / fetch Clerk users ─────────
  const adminClerk = await ensureClerkUser({
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'changeme',
    isAdmin: true,
  });

  const memberClerk = await ensureClerkUser({
    email: process.env.SEED_USER_EMAIL ?? 'user@example.com',
    firstName: 'Regular',
    lastName: 'User',
    password: process.env.SEED_USER_PASSWORD ?? 'changeme',
  });

  const workspaceAdminClerk = await ensureClerkUser({
    email: process.env.SEED_WORKSPACE_ADMIN_EMAIL ?? 'workspace-admin@example.com',
    firstName: 'Workspace',
    lastName: 'Admin',
    password: process.env.SEED_WORKSPACE_ADMIN_PASSWORD ?? 'changeme',
  });

  if (!adminClerk.id) throw new Error('Admin Clerk ID is required');
  if (!workspaceAdminClerk.id) throw new Error('Workspace Admin Clerk ID is required');
  if (!memberClerk.id) throw new Error('Member Clerk ID is required');

  // ───────── 2. upsert app-side users (UUID PK from Clerk) ─────────
  const [admin, workspaceAdmin, member] = await prisma.$transaction([
    prisma.user.upsert({
      where: { email: adminClerk.emailAddresses[0].emailAddress },
      update: {
        email: adminClerk.emailAddresses[0].emailAddress,
        full_name: `${adminClerk.firstName} ${adminClerk.lastName}`.trim(),
        avatar_url: adminClerk.imageUrl,
        is_global_admin: true,
      },
      create: {
        id: adminClerk.id,
        email: adminClerk.emailAddresses[0].emailAddress,
        full_name: `${adminClerk.firstName} ${adminClerk.lastName}`.trim(),
        avatar_url: adminClerk.imageUrl,
        is_global_admin: true,
      },
    }),
    prisma.user.upsert({
      where: { email: workspaceAdminClerk.emailAddresses[0].emailAddress },
      update: {
        email: workspaceAdminClerk.emailAddresses[0].emailAddress,
        full_name: `${workspaceAdminClerk.firstName} ${workspaceAdminClerk.lastName}`.trim(),
        avatar_url: workspaceAdminClerk.imageUrl,
      },
      create: {
        id: workspaceAdminClerk.id,
        email: workspaceAdminClerk.emailAddresses[0].emailAddress,
        full_name: `${workspaceAdminClerk.firstName} ${workspaceAdminClerk.lastName}`.trim(),
        avatar_url: workspaceAdminClerk.imageUrl,
        is_global_admin: false,
      },
    }),
    prisma.user.upsert({
      where: { email: memberClerk.emailAddresses[0].emailAddress },
      update: {
        email: memberClerk.emailAddresses[0].emailAddress,
        full_name: `${memberClerk.firstName} ${memberClerk.lastName}`.trim(),
        avatar_url: memberClerk.imageUrl,
      },
      create: {
        id: memberClerk.id,
        email: memberClerk.emailAddresses[0].emailAddress,
        full_name: `${memberClerk.firstName} ${memberClerk.lastName}`.trim(),
        avatar_url: memberClerk.imageUrl,
      },
    }),
  ]);

  // ───────── 3a. Ensure guest workspace exists (realistic) ─────────
  const guestWorkspaceId = process.env.GUEST_WORKSPACE_ID || 'guest-demo-workspace-id';
  if (!guestWorkspaceId) throw new Error('Guest Workspace ID is required');
  await prisma.workspace.upsert({
    where: { id: guestWorkspaceId },
    update: {},
    create: {
      id: guestWorkspaceId,
      slug: 'guest-workspace',
      name: 'Guest Workspace',
      owner_id: admin.id,
      created_at: new Date(),
      updated_at: new Date(),
      // settings_json: {},
    },
  });

  // ───────── 3a. Seed a free subscription for the guest workspace ─────────
  await prisma.subscription.upsert({
    where: { workspace_id: guestWorkspaceId },
    update: {},
    create: {
      workspace_id: guestWorkspaceId,
      plan: 'free',
      billing_period: 'monthly',
      status: 'active',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + (10 * 365 * 86_400_000)), // 10 years from today
      seats: 1,
    },
  });

  // ───────── 3b. workspace + memberships + subscription ─────────
  const workspaceId = process.env.SEED_WORKSPACE_ID ?? DEFAULT_DEMO_WORKSPACE_ID;
  if (!workspaceId) throw new Error('Seed Workspace ID is required');

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'admin-workspace' },
    update: {},
    create: {
      id: workspaceId,
      slug: 'admin-workspace',
      name: 'Admin Workspace',
      owner_id: admin.id,
    },
  });

  await prisma.$transaction([
    prisma.userWorkspace.upsert({
      where: {
        user_id_workspace_id: { user_id: admin.id, workspace_id: workspace.id },
      },
      update: {},
      create: {
        user_id: admin.id,
        workspace_id: workspace.id,
        role: WorkspaceRole.OWNER,
      },
    }),
    prisma.userWorkspace.upsert({
      where: {
        user_id_workspace_id: { user_id: workspaceAdmin.id, workspace_id: workspace.id },
      },
      update: {},
      create: {
        user_id: workspaceAdmin.id,
        workspace_id: workspace.id,
        role: WorkspaceRole.ADMIN,
        invited_by: admin.id,
      },
    }),
    prisma.userWorkspace.upsert({
      where: {
        user_id_workspace_id: { user_id: member.id, workspace_id: workspace.id },
      },
      update: {},
      create: {
        user_id: member.id,
        workspace_id: workspace.id,
        role: WorkspaceRole.MEMBER,
        invited_by: admin.id,
      },
    }),
    prisma.subscription.upsert({
      where: { workspace_id: workspace.id },
      update: {},
      create: {
        workspace_id: workspace.id,
        plan: 'free',
        billing_period: 'monthly',
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + (10 * 365 * 86_400_000)), // 10 years from today
        seats: 5,
      },
    }),
  ]);

  if (!admin.id || !workspace.id) throw new Error('Admin ID and Workspace ID are required');
  if (!workspaceAdmin.id || !workspace.id) throw new Error('Workspace Admin ID and Workspace ID are required');
  if (!member.id || !workspace.id) throw new Error('Member ID and Workspace ID are required');

  // ───────── 4. set primary_workspace_id ─────────
  await prisma.user.updateMany({
    where: { id: { in: [admin.id, workspaceAdmin.id, member.id] } },
    data: { primary_workspace_id: workspace.id },
  });

  // Seed complete
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
