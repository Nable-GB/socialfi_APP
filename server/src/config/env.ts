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
  JWT_EXPIRES_IN: optional("JWT_EXPIRES_IN", "7d"),

  // Stripe
  STRIPE_SECRET_KEY: required("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: required("STRIPE_WEBHOOK_SECRET"),

  // Blockchain
  RPC_URL: optional("RPC_URL", ""),
  ESCROW_CONTRACT_ADDRESS: optional("ESCROW_CONTRACT_ADDRESS", ""),
  CHAIN_ID: parseInt(optional("CHAIN_ID", "137"), 10),

  // Rewards
  REFERRAL_RATE: parseFloat(optional("REFERRAL_RATE", "0.05")),
} as const;
