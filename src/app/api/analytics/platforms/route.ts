import { NextRequest, NextResponse } from 'next/server';

import { verifyDashboardAuth } from '@/lib/analytics/authCheck';
import { getAnalyticsRows } from '@/lib/analytics/submissionRows';
import { isDateInRange } from '@/lib/analytics/getDateRange';
import { connectDB } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  if (!(await verifyDashboardAuth())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await connectDB();

    const range = req.nextUrl.searchParams.get('range');

    const rows = (await getAnalyticsRows()).filter((row) =>
      isDateInRange(row.capturedAt, range)
    );

    const counts: Record<string, number> = {};

    for (const row of rows) {
      counts[row.platform] = (counts[row.platform] || 0) + 1;
    }

    const total = rows.length;

    const platforms = Object.entries(counts)
      .map(([platform, leads]) => ({
        platform,
        leads,
        percentage:
          total > 0
            ? Math.round((leads / total) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.leads - a.leads);

    return NextResponse.json(platforms);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Server error.';

    console.error('[analytics/platforms]', message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
