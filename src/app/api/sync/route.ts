import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getAnalyticsRows } from '@/lib/analytics/submissionRows';

export async function GET() {
  try {
    await connectDB();
    const submissions = await getAnalyticsRows();

    const rows = submissions.map((submission) => ({
      timestamp: submission.capturedAt.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
      }),
      fullName: submission.fullName,
      phone: submission.phone,
      platform: submission.platform,
      campaign: submission.utmCampaign,
      utmId: submission.utmId,
    }));

    const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;

    if (!googleScriptUrl) {
      return NextResponse.json(
        { error: 'GOOGLE_SCRIPT_URL is not configured.' },
        { status: 500 }
      );
    }

    await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulk: true, rows }),
    });

    return NextResponse.json({ success: true, total: rows.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error.';
    console.error('[sync]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
