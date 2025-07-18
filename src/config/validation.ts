// src/config/validation.ts
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().uri().required(),

  CLERK_SECRET_KEY: Joi.string().required(),
  CLERK_WEBHOOK_SECRET: Joi.string().required(),

  GUEST_TOKEN_SECRET: Joi.string().default('change-me-in-prod'),
  GUEST_TOKEN_EXPIRY_SECONDS: Joi.number().default(3600),
  GUEST_WORKSPACE_ID: Joi.string().default('guest-demo-workspace-id'),

  AWS_S3_BUCKET: Joi.string().required(),
  AWS_S3_REGION: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),

  RESEND_API_KEY: Joi.string().required(),
  RESEND_FROM_EMAIL: Joi.string().email().allow(''),
  ENABLE_EMAIL: Joi.boolean().default(false),

  LOG_LEVEL: Joi.string().default('info'),
  BETTERSTACK_TOKEN: Joi.string().allow(''),

  STRIPE_API_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),

  APP_URL: Joi.string().uri().required(),
  APP_NAME: Joi.string().required(),
  APP_WEBSITE: Joi.string().uri().required(),
  APP_EMAIL: Joi.string().email().required(),
});
