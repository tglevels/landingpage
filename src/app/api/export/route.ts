import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

import { verifyDashboardAuth } from '@/lib/analytics/authCheck';
import { getAnalyticsRows } from '@/lib/analytics/submissionRows';
import { connectDB } from '@/lib/mongodb';

function formatExcelDate(date: Date): string {
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

    const rows = submissions
      .sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime())
      .map((submission) => ({
        Timestamp: formatExcelDate(submission.capturedAt),
        'Full Name': submission.fullName || 'N/A',
        'Phone Number': submission.phone || 'N/A',
        Platform: submission.platform || 'Direct',
        Campaign: submission.utmCampaign ? submission.utmCampaign : 'Organic',
      }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet['!cols'] = [
      { wch: 24 },
      { wch: 25 },
      { wch: 18 },
      { wch: 18 },
      { wch: 28 },
    ];

    worksheet['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lead Touchpoints');

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="marketing-leads.xlsx"',
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Server error.';

    console.error('[export]', message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
