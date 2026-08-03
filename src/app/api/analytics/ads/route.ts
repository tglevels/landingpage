import { NextRequest, NextResponse } from 'next/server';

import { verifyDashboardAuth } from '@/lib/analytics/authCheck';
import { isDateInRange } from '@/lib/analytics/getDateRange';
import { getAnalyticsRows } from '@/lib/analytics/submissionRows';
import { connectDB } from '@/lib/mongodb';

type AdCount = {
  ad: string;
  campaign: string;
  platform: string;
  leads: number;
};

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

    const adMap: Record<string, AdCount> = {};

    for (const row of rows) {
      const ad = row.utmContent || 'Unassigned Ad';

      const campaign = row.utmCampaign || 'Unassigned Campaign';

      const key = [row.platform, campaign, ad].join('::');

      if (!adMap[key]) {
        adMap[key] = {
          ad,
          campaign,
          platform: row.platform,
          leads: 0,
        };
      }

      adMap[key].leads += 1;
    }

    const ads = Object.values(adMap).sort(
      (a, b) => b.leads - a.leads
    );

    return NextResponse.json(ads);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Server error.';

    console.error('[analytics/ads]', message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
