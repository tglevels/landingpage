import { NextRequest, NextResponse } from 'next/server';

import { verifyDashboardAuth } from '@/lib/analytics/authCheck';
import { isDateInRange } from '@/lib/analytics/getDateRange';
import { getAnalyticsRows } from '@/lib/analytics/submissionRows';
import { connectDB } from '@/lib/mongodb';

type CampaignCount = {
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

    const campaignMap: Record<string, CampaignCount> = {};

    for (const row of rows) {
      const campaign = row.utmCampaign || 'Unassigned Campaign';

      const key = `${row.platform}::${campaign}`;

      if (!campaignMap[key]) {
        campaignMap[key] = {
          platform: row.platform,
          leads: 0,
        };
      }

      campaignMap[key].leads += 1;
    }

    const campaigns = Object.entries(campaignMap)
      .map(([key, value]) => {
        const campaign = key.split('::').slice(1).join('::');

        return {
          campaign,
          platform: value.platform,
          leads: value.leads,
        };
      })
      .sort((a, b) => b.leads - a.leads);

    return NextResponse.json(campaigns);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Server error.';

    console.error('[analytics/campaigns]', message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
