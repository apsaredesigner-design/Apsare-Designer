// Server-only configuration, validated once when first imported (fail fast, like
// server/src/config/env.ts). Next.js loads .env / .env.local / .env.$NODE_ENV
// itself, so there is no dotenv here. The Prisma CLI loads them in prisma.config.ts.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function jwtSecret(): string {
  const value = required("JWT_SECRET");
  if (value.length < 32) throw new Error("JWT_SECRET must be at least 32 characters (e.g. `openssl rand -hex 32`)");
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? "development";

export const env = {
  nodeEnv,
  isProd: nodeEnv === "production",
  /**
   * TRUST_PROXY=1: take the client IP from the last X-Forwarded-For hop (Express
   * `trust proxy 1`). Otherwise a Route Handler has no trustworthy client IP and
   * every guest shares one rate-limit bucket (see http/client-ip.ts).
   */
  trustProxy: process.env.TRUST_PROXY === "1",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:3000",
  databaseUrl: required("DATABASE_URL"),
  jwt: {
    secret: jwtSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
    rememberExpiresIn: process.env.JWT_REMEMBER_EXPIRES_IN ?? "30d",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  },
  paymentProvider: process.env.PAYMENT_PROVIDER ?? "cod",
  mail: {
    /** console (default: logs emails) | resend | smtp. See lib/mailer.ts. */
    provider: process.env.MAIL_PROVIDER ?? "console",
    from: process.env.MAIL_FROM ?? "Label Apsáre <support@apsaredesigner.in>",
    /** Where contact-form notifications go. */
    adminEmail: process.env.ADMIN_NOTIFY_EMAIL ?? "support@apsaredesigner.in",
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    smtp: {
      host: process.env.SMTP_HOST ?? "smtp.titan.email",
      port: Number(process.env.SMTP_PORT) || 465,
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    }
  },
  /** RATE_LIMIT_DISABLED=1 (or NODE_ENV=test) turns the rate limiters off so a test suite can run. */
  rateLimitDisabled: nodeEnv === "test" || process.env.RATE_LIMIT_DISABLED === "1",
};
