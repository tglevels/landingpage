import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

import { verifyDashboardAuth } from '@/lib/analytics/authCheck';
import { getAnalyticsRows } from '@/lib/analytics/submissionRows';
import { connectDB } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatExcelDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const day = date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const time = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });

  return `${day} ${time}`;
}

function getCampaignLabel(row: {
  sourceType: string;
  utmCampaign: string;
  campaign: string;
  platform: string;
}): string {
  if (
    row.sourceType === 'legacy_import' ||
    row.sourceType === 'legacy_submission' ||
    row.platform === 'Legacy' ||
    row.campaign === 'Historical Lead'
  ) {
    return 'Historical Lead';
  }

  return (
    row.utmCampaign.trim() ||
    row.campaign.trim() ||
    'Organic'
  );
}

export async function GET() {
  if (!(await verifyDashboardAuth())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await connectDB();

    const submissions = await getAnalyticsRows();

    const rows = [...submissions]
      .sort((first, second) => {
        const firstTime = first.capturedAt.getTime();
        const secondTime = second.capturedAt.getTime();

        return secondTime - firstTime;
      })
      .map((submission) => {
        const isLegacy =
          submission.sourceType === 'legacy_import' ||
          submission.sourceType === 'legacy_submission' ||
          submission.platform === 'Legacy';

        const platform = isLegacy
          ? 'Legacy'
          : (submission.platform.trim() || 'Direct');

        return {
          Timestamp: formatExcelDate(submission.capturedAt),
          'Full Name': submission.fullName.trim() || 'Unnamed Lead',
          'Phone Number': submission.phone,
          Platform: platform,
          Campaign: getCampaignLabel(submission),
        };
      });

    const headers = [
      'Timestamp',
      'Full Name',
      'Phone Number',
      'Platform',
      'Campaign',
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: headers,
    });

    worksheet['!cols'] = [
      { wch: 24 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 32 },
    ];

    worksheet['!autofilter'] = {
      ref: `A1:E${Math.max(rows.length + 1, 1)}`,
    };

    worksheet['!views'] = [
      {
        state: 'frozen',
        xSplit: 0,
        ySplit: 1,
      },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Marketing Leads'
    );

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      compression: true,
    });

    const fileDate = new Date()
      .toISOString()
      .slice(0, 10);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          `attachment; filename="marketing-leads-${fileDate}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Server error.';

    console.error('[export]', error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}