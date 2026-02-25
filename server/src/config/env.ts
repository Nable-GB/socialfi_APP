import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env variable: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  // App
  PORT: parseInt(optional("PORT", "4000"), 10),
  NODE_ENV: optional("NODE_ENV", "development"),
  FRONTEND_URL: optional("FRONTEND_URL", "http://localhost:5173"),

  // Auth
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: optional("JWT_EXPIRES_IN", "15m"),
  JWT_REFRESH_SECRET: optional("JWT_REFRESH_SECRET", required("JWT_SECRET") + "_refresh"),
  JWT_REFRESH_EXPIRES_IN: optional("JWT_REFRESH_EXPIRES_IN", "7d"),

  // Stripe
  STRIPE_SECRET_KEY: required("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: required("STRIPE_WEBHOOK_SECRET"),

  // Blockchain
  RPC_URL: optional("RPC_URL", ""),
  ESCROW_CONTRACT_ADDRESS: optional("ESCROW_CONTRACT_ADDRESS", ""),
  TOKEN_CONTRACT_ADDRESS: optional("TOKEN_CONTRACT_ADDRESS", ""),
  OPERATOR_PRIVATE_KEY: optional("OPERATOR_PRIVATE_KEY", ""),
  CHAIN_ID: parseInt(optional("CHAIN_ID", "137"), 10),
  MIN_WITHDRAWAL: parseFloat(optional("MIN_WITHDRAWAL", "10")),
  MAX_WITHDRAWAL: parseFloat(optional("MAX_WITHDRAWAL", "10000")),

  // Rewards
  REFERRAL_RATE: parseFloat(optional("REFERRAL_RATE", "0.05")),

  // S3 File Upload
  S3_BUCKET: optional("S3_BUCKET", ""),
  S3_REGION: optional("S3_REGION", "ap-southeast-1"),
  S3_ACCESS_KEY_ID: optional("S3_ACCESS_KEY_ID", ""),
  S3_SECRET_ACCESS_KEY: optional("S3_SECRET_ACCESS_KEY", ""),
  S3_CDN_URL: optional("S3_CDN_URL", ""),  // CloudFront or custom CDN domain
  MAX_FILE_SIZE: parseInt(optional("MAX_FILE_SIZE", "10485760"), 10), // 10MB default

  // Email (SendGrid)
  SENDGRID_API_KEY: optional("SENDGRID_API_KEY", ""),
  FROM_EMAIL: optional("FROM_EMAIL", "noreply@socialfi.app"),
  FROM_NAME: optional("FROM_NAME", "SocialFi"),
} as const;
