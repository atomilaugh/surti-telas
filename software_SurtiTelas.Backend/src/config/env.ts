import 'dotenv/config';
import { z } from 'zod';

const nodeEnv = process.env.NODE_ENV || 'development';

if (nodeEnv === 'production') {
  import('dotenv').then((dotenv) => {
    dotenv.config({ path: '.env.production' });
  }).catch(() => {});
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_TEMP_SECRET: z.string().min(16),
  ACCESS_TTL: z.string().default('15m'),
  REFRESH_TTL: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  RATE_LIMIT_MAX: z.coerce.number().default(300),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  EVENT_BUS: z.enum(['memory', 'redis']).default('memory'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  METRICS_ALLOWED_IPS: z.string().default('127.0.0.1,::1'),
  METRICS_SECRET: z.string().min(16),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: z.coerce.boolean().default(true),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_NAME: z.string().default('SurtiTelas'),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
});

export const env = schema.parse(process.env);

export type Env = z.infer<typeof schema>;
