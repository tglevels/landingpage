import { NextRequest, NextResponse } from 'next/server';

import { verifyDashboardAuth } from '@/lib/analytics/authCheck';
import { getDataVersion } from '@/lib/analytics/dataVersion';
import { getAnalyticsRows } from '@/lib/analytics/submissionRows';
import { connectDB } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
 * The full pull reads the whole collection and can take
 * several seconds on a cold start. Without this it inherits
 * the account default, which may be as low as 10s.
 */
export const maxDuration = 60;

/**
 * Polling endpoint for the dashboard.
 *
 * Replaces the old SSE stream, which could not survive
 * Vercel's serverless function duration cap.
 *
 * The client sends the version it already holds via ?since=.
 * When nothing changed we return just the fingerprint, so the
 * expensive full-collection read only runs on real changes.
 */
export async function GET(req: NextRequest) {
  if (!(await verifyDashboardAuth())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await connectDB();

    const since = req.nextUrl.searchParams.get('since') || '';
    const version = await getDataVersion();

    if (since && since === version) {
      return NextResponse.json({
        version,
        changed: false,
      });
    }

    return NextResponse.json({
      version,
      changed: true,
      rows: await getAnalyticsRows(),
    });
  } catch (error) {
    console.error('[api/submissions/live] Failed:', error);

    /*
     * This route is already behind the dashboard auth check,
     * so returning the cause is safe and makes production
     * failures diagnosable from the browser console.
     */
    return NextResponse.json(
      {
        error: 'Unable to load submissions.',
        detail:
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : String(error),
      },
      { status: 500 }
    );
  }
}
