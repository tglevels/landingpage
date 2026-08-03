import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { detectIntent } from '@/lib/ai/intent';
import { generateResponse } from '@/lib/ai/generateResponse';
import { verifyDashboardAuth } from '@/lib/analytics/authCheck';
import { getAnalyticsRows } from '@/lib/analytics/submissionRows';
import { isDateInRange } from '@/lib/analytics/getDateRange';

async function getOverview() {
  const rows = await getAnalyticsRows();
  const uniqueLeadIds = new Set(rows.map((r) => r.leadId));
  const totalLeads = uniqueLeadIds.size;

  const platforms: Record<string, number> = {
    Google: 0,
    Meta: 0,
    YouTube: 0,
    Direct: 0,
    Other: 0,
  };
  const campaignCounts: Record<string, number> = {};
  const lpCounts: Record<string, number> = {};

  for (const s of rows) {
    const platform = s.platform;
    platforms[platform] = (platforms[platform] || 0) + 1;
    const campaign = s.utmCampaign || 'unknown';
    campaignCounts[campaign] = (campaignCounts[campaign] || 0) + 1;
    const lp = s.landingPagePath || '/';
    lpCounts[lp] = (lpCounts[lp] || 0) + 1;
  }

  let topCampaign = null;
  let maxC = 0;
  for (const [name, leads] of Object.entries(campaignCounts)) {
    if (leads > maxC) {
      maxC = leads;
      topCampaign = { name, leads };
    }
  }

  let topLandingPage = null;
  let maxLP = 0;
  for (const [path, leads] of Object.entries(lpCounts)) {
    if (leads > maxLP) {
      maxLP = leads;
      topLandingPage = { path, leads };
    }
  }

  return { totalLeads, platforms, topCampaign, topLandingPage };
}

async function getPlatforms() {
  const rows = await getAnalyticsRows();
  const total = rows.length;
  const counts: Record<string, number> = {};
  for (const s of rows) {
    const p = s.platform;
    counts[p] = (counts[p] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([platform, leads]) => ({
      platform,
      leads,
      percentage: total > 0 ? Math.round((leads / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.leads - a.leads);
}

async function getCampaigns() {
  const rows = await getAnalyticsRows();
  const map: Record<string, { platform: string; leads: number }> = {};
  for (const s of rows) {
    const campaign = s.utmCampaign || 'unknown';
    const platform = s.platform;
    if (!map[campaign]) map[campaign] = { platform, leads: 0 };
    map[campaign].leads += 1;
  }
  return Object.entries(map)
    .map(([campaign, d]) => ({ campaign, platform: d.platform, leads: d.leads }))
    .sort((a, b) => b.leads - a.leads);
}

async function getAds() {
  const rows = await getAnalyticsRows();
  const map: Record<string, { campaign: string; platform: string; leads: number }> = {};
  for (const s of rows) {
    const ad = s.utmContent || 'unknown';
    const campaign = s.utmCampaign || 'unknown';
    const platform = s.platform;
    if (!map[ad]) map[ad] = { campaign, platform, leads: 0 };
    map[ad].leads += 1;
  }
  return Object.entries(map)
    .map(([ad, d]) => ({ ad, campaign: d.campaign, platform: d.platform, leads: d.leads }))
    .sort((a, b) => b.leads - a.leads);
}

async function getLandingPages() {
  const rows = await getAnalyticsRows();
  const map: Record<string, number> = {};
  for (const s of rows) {
    const path = s.landingPagePath || '/';
    map[path] = (map[path] || 0) + 1;
  }
  return Object.entries(map)
    .map(([path, leads]) => ({ path, leads }))
    .sort((a, b) => b.leads - a.leads);
}

async function getFilteredLeadCount(range: string) {
  const rows = await getAnalyticsRows();
  const filtered = rows.filter((r) => isDateInRange(r.capturedAt, range));
  return filtered.length;
}

export async function POST(req: NextRequest) {
  if (!(await verifyDashboardAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { question } = await req.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
    }

    await connectDB();

    const { intent, entity } = detectIntent(question);

    let overview, platforms, campaigns, ads, landingPages, filteredCount;

    switch (intent) {
      case 'GENERAL_OVERVIEW':
      case 'TOTAL_LEADS_COUNT':
        overview = await getOverview();
        break;
      case 'TOP_PLATFORM':
      case 'PLATFORM_LEADS':
      case 'PLATFORM_COMPARISON':
      case 'ORGANIC_LEADS':
        platforms = await getPlatforms();
        break;
      case 'TOP_CAMPAIGN':
      case 'CAMPAIGN_LEADS':
        campaigns = await getCampaigns();
        break;
      case 'TOP_AD':
        ads = await getAds();
        break;
      case 'TOP_LANDING_PAGE':
        landingPages = await getLandingPages();
        break;
      case 'TODAY_LEADS':
        filteredCount = await getFilteredLeadCount('today');
        break;
      case 'LAST_7_DAYS':
        filteredCount = await getFilteredLeadCount('7d');
        break;
      case 'EXPORT_REPORT':
        break;
    }

    const answer = generateResponse(intent, {
      overview,
      platforms,
      campaigns,
      ads,
      landingPages,
      entity,
      filteredCount,
    });

    return NextResponse.json({ answer, intent });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error.';
    console.error('[analytics/chat]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
