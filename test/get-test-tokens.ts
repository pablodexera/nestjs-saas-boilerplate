import { getTestUserByEmail } from './test-utils';

async function main() {
  const emails = [
    process.env.SEED_ADMIN_EMAIL!,
    process.env.SEED_WORKSPACE_ADMIN_EMAIL!,
    process.env.SEED_USER_EMAIL!,
  ];

  const results: Record<
    string,
    { email: string; token?: string; userId?: string; clerkId?: string; error?: string }
  > = {};
  for (const email of emails) {
    try {
      const user = await getTestUserByEmail(email);
      results[email] = {
        email,
        token: user.token,
        userId: user.userId,
        clerkId: user.clerkId,
      };
    } catch (err) {
      results[email] = { email, error: (err as Error).message };
    }
  }
  // Print as pretty JSON
  console.warn(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error('Failed to get test tokens:', err);
  process.exit(1);
});
