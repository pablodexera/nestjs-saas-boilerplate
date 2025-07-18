// src/config/configuration.ts
export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  clerk: {
    apiKey: process.env.CLERK_SECRET_KEY,
    webhookSecret: process.env.CLERK_WEBHOOK_SECRET,
  },
  aws: {
    s3: {
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_S3_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL,
  },
  enableEmail: process.env.ENABLE_EMAIL,
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    betterStackToken: process.env.BETTERSTACK_TOKEN,
  },
  stripe: {
    apiKey: process.env.STRIPE_API_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  guestTokens: {
    secret: process.env.GUEST_TOKEN_SECRET,
    expirySeconds: parseInt(process.env.GUEST_TOKEN_EXPIRY_SECONDS || '3600', 10),
    workspaceId: process.env.GUEST_WORKSPACE_ID,
  },
  app: {
    url: process.env.APP_URL || 'http://localhost:3000',
    name: process.env.APP_NAME,
    website: process.env.APP_WEBSITE,
    email: process.env.APP_EMAIL,
  },
});
