import { NextRequest, NextResponse } from 'next/server';

import { verifyDashboardAuth } from '@/lib/analytics/authCheck';
import { isDateInRange } from '@/lib/analytics/getDateRange';
import { getAnalyticsRows } from '@/lib/analytics/submissionRows';
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

    const pageMap: Record<string, number> = {};

    for (const row of rows) {
      const path = row.landingPagePath || '/';

      pageMap[path] = (pageMap[path] || 0) + 1;
    }

    const landingPages = Object.entries(pageMap)
      .map(([path, leads]) => ({
        path,
        leads,
      }))
      .sort((a, b) => b.leads - a.leads);

    return NextResponse.json(landingPages);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Server error.';

    console.error('[analytics/landing-pages]', message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
