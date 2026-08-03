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

    const uniqueLeadIds = new Set(rows.map((row) => row.leadId));

    const platforms: Record<string, number> = {};
    const campaignCounts: Record<string, number> = {};
    const landingPageCounts: Record<string, number> = {};

    for (const row of rows) {
      platforms[row.platform] = (platforms[row.platform] || 0) + 1;

      const campaign = row.utmCampaign || 'Unassigned Campaign';
      campaignCounts[campaign] = (campaignCounts[campaign] || 0) + 1;

      const page = row.landingPagePath || '/';
      landingPageCounts[page] = (landingPageCounts[page] || 0) + 1;
    }

    const topCampaignEntry = Object.entries(campaignCounts).sort(
      ([, first], [, second]) => second - first
    )[0];

    const topLandingPageEntry = Object.entries(
      landingPageCounts
    ).sort(([, first], [, second]) => second - first)[0];

    return NextResponse.json({
      totalLeads: uniqueLeadIds.size,
      totalInteractions: rows.length,
      platforms,
      topCampaign: topCampaignEntry
        ? {
            name: topCampaignEntry[0],
            leads: topCampaignEntry[1],
          }
        : null,
      topLandingPage: topLandingPageEntry
        ? {
            path: topLandingPageEntry[0],
            leads: topLandingPageEntry[1],
          }
        : null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Server error.';

    console.error('[analytics/overview]', message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
