import { createClerkClient } from '@clerk/backend';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const logger = pino({ name: 'test-utils' });

const TOKEN_EXPIRY_BUFFER_MS = 2 * 60 * 1000; // 2 minutes

interface TestSessionToken {
  id: string;
  email: string;
  token: string;
  expires_at: Date;
  clerk_id: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Fetch a test user by email, returning Clerk and DB IDs, a valid JWT, and all relevant DB fields.
 * Uses TestSessionToken cache to reduce Clerk calls.
 */
export async function getTestUserByEmail(email: string) {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const prisma = new PrismaClient();

  let token: string | null = null;
  let expires_at: Date | null = null;
  let clerkId: string | null = null;
  let sessionRow: TestSessionToken | null = null;
  let scenario: 'cache-valid' | 'cache-expired' | 'no-cache' = 'no-cache';
  let cacheWasExpired = false;

  // 1. Try to get cached session token
  try {
    sessionRow = await (prisma as any).testSessionToken.findUnique({ where: { email } });
    if (sessionRow) {
      expires_at = sessionRow.expires_at;
      clerkId = sessionRow.clerk_id;
      // Check if token is not about to expire
      if (expires_at && new Date(expires_at).getTime() - Date.now() > TOKEN_EXPIRY_BUFFER_MS) {
        token = sessionRow.token;
        scenario = 'cache-valid';
        logger.info('getTestUserByEmail: cache-valid: %o', { email, expires_at });
      } else {
        cacheWasExpired = true;
        scenario = 'cache-expired';
        logger.info('getTestUserByEmail: cache-expired: %o', { email, expires_at });
      }
    }
  } catch (err) {
    logger.warn('getTestUserByEmail: error reading cache: %o', {
      email,
      error: (err as Error).message,
    });
  }

  if (!token || !clerkId) {
    // 2. Go to Clerk for a new session/JWT
    const users = (await clerk.users.getUserList({ emailAddress: [email] })).data;
    if (!users.length) throw new Error(`No Clerk user for email: ${email}`);
    clerkId = users[0].id;
    const session = await clerk.sessions.createSession({ userId: clerkId });
    // Use expireAt (ms) for expiration
    let expiresAtMs: number;
    if ('expireAt' in session && typeof session.expireAt === 'number') {
      expiresAtMs = session.expireAt;
    } else {
      throw new Error('Cannot determine session expiration');
    }
    const { jwt } = await clerk.sessions.getToken(session.id, 'e2e-test');
    token = jwt;
    expires_at = new Date(expiresAtMs);
    // Upsert the session token in the DB
    await (prisma as any).testSessionToken.upsert({
      where: { email },
      update: { token, expires_at, clerk_id: clerkId },
      create: { email, token, expires_at, clerk_id: clerkId },
    });
    scenario = cacheWasExpired ? 'cache-expired' : 'no-cache';
    logger.info('getTestUserByEmail: %s: %o', scenario, { email, expires_at });
  }

  // 3. Fetch DB user
  const dbUser = await prisma.user.findUnique({ where: { email } });
  if (!dbUser) throw new Error(`No DB user for email: ${email}`);

  await prisma.$disconnect();

  return {
    ...dbUser, // enrich with all DB fields (is_global_admin, is_disabled, etc)
    token,
    userId: dbUser.id, // also clerkId by design
    clerkId,
    scenario, // for debug/testing
  };
}
