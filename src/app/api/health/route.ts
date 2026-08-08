import { NextResponse } from 'next/server';

import { connectDB } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public health check — the fastest way to see why the
 * dashboard cannot load data in a given environment.
 *
 * Returns which env vars are configured and a live MongoDB
 * connectivity test. No secrets are returned (only whether
 * each variable is set, plus the connection error message).
 */
export async function GET() {
  const env = {
    MONGODB_URI: Boolean(process.env.MONGODB_URI),
    DASHBOARD_SECRET: Boolean(process.env.DASHBOARD_SECRET),
    GOOGLE_SCRIPT_URL: Boolean(process.env.GOOGLE_SCRIPT_URL),
    GOOGLE_SERVICE_ACCOUNT_EMAIL: Boolean(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    ),
    GOOGLE_PRIVATE_KEY: Boolean(process.env.GOOGLE_PRIVATE_KEY),
  };

  let mongoConnected = false;
  let mongoError = '';

  try {
    const instance = await connectDB();
    mongoConnected = instance.connection.readyState === 1;
  } catch (err: unknown) {
    mongoError =
      err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    ok: env.MONGODB_URI && mongoConnected,
    environment: env,
    mongo: {
      connected: mongoConnected,
      error: mongoError || null,
    },
    timestamp: new Date().toISOString(),
  });
}
