import {
  NextRequest,
  NextResponse,
} from 'next/server';

import * as XLSX from 'xlsx';

import {
  verifyDashboardAuth,
} from '@/lib/analytics/authCheck';

import {
  getAnalyticsRows,
} from '@/lib/analytics/submissionRows';

import {
  connectDB,
} from '@/lib/mongodb';

import {
  getLandingPageDisplay,
} from '@/lib/analytics/getLandingPageDisplays';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIME_ZONE = 'Asia/Kolkata';

/* -------------------------------------------------------
   Excel date formatter
------------------------------------------------------- */

function formatExcelDate(
  date: Date
): string {
  const day =
    date.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: TIME_ZONE,
      }
    );

  const time =
    date.toLocaleTimeString(
      'en-IN',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: TIME_ZONE,
      }
    );

  return `${day} ${time}`;
}

/* -------------------------------------------------------
   Convert Date → YYYY-MM-DD in IST

   This allows reliable comparison for:
   Today
   Yesterday
   Custom range
------------------------------------------------------- */

function getISTDateKey(
  date: Date
): string {
  const parts =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: TIME_ZONE,
      }
    ).formatToParts(date);

  const year =
    parts.find(
      (part) =>
        part.type === 'year'
    )?.value || '';

  const month =
    parts.find(
      (part) =>
        part.type === 'month'
    )?.value || '';

  const day =
    parts.find(
      (part) =>
        part.type === 'day'
    )?.value || '';

  return `${year}-${month}-${day}`;
}

/* -------------------------------------------------------
   Get current IST calendar date
------------------------------------------------------- */

function getTodayIST(): Date {
  const formatter =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: TIME_ZONE,
      }
    );

  const parts =
    formatter.formatToParts(
      new Date()
    );

  const year = Number(
    parts.find(
      (part) =>
        part.type === 'year'
    )?.value
  );

  const month = Number(
    parts.find(
      (part) =>
        part.type === 'month'
    )?.value
  );

  const day = Number(
    parts.find(
      (part) =>
        part.type === 'day'
    )?.value
  );

  /*
   * UTC Date is used only as a stable
   * calendar-date container here.
   */
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );
}

/* -------------------------------------------------------
   Date filter
------------------------------------------------------- */

function matchesDateRange(
  capturedAt: Date,
  range: string,
  customFrom: string,
  customTo: string
): boolean {
  if (
    !capturedAt ||
    Number.isNaN(
      capturedAt.getTime()
    )
  ) {
    return false;
  }

  if (range === 'all') {
    return true;
  }

  const rowDateKey =
    getISTDateKey(
      capturedAt
    );

  const today =
    getTodayIST();

  const todayKey =
    getISTDateKey(
      today
    );

  if (range === 'today') {
    return (
      rowDateKey ===
      todayKey
    );
  }

  if (
    range === 'yesterday'
  ) {
    const yesterday =
      new Date(today);

    yesterday.setUTCDate(
      yesterday.getUTCDate() - 1
    );

    return (
      rowDateKey ===
      getISTDateKey(
        yesterday
      )
    );
  }

  if (range === '7d') {
    const startDate =
      new Date(today);

    /*
     * Today + previous 6 days
     * = 7 calendar days.
     */
    startDate.setUTCDate(
      startDate.getUTCDate() -
        6
    );

    const startKey =
      getISTDateKey(
        startDate
      );

    return (
      rowDateKey >= startKey &&
      rowDateKey <= todayKey
    );
  }

  if (range === '30d') {
    const startDate =
      new Date(today);

    /*
     * Today + previous 29 days
     * = 30 calendar days.
     */
    startDate.setUTCDate(
      startDate.getUTCDate() -
        29
    );

    const startKey =
      getISTDateKey(
        startDate
      );

    return (
      rowDateKey >= startKey &&
      rowDateKey <= todayKey
    );
  }

  if (range === 'custom') {
    if (
      customFrom &&
      rowDateKey <
        customFrom
    ) {
      return false;
    }

    if (
      customTo &&
      rowDateKey >
        customTo
    ) {
      return false;
    }

    return true;
  }

  return true;
}

/* -------------------------------------------------------
   Export API
------------------------------------------------------- */

export async function GET(
  request: NextRequest
) {
  if (
    !(await verifyDashboardAuth())
  ) {
    return NextResponse.json(
      {
        error:
          'Unauthorized',
      },
      {
        status: 401,
      }
    );
  }

  try {
    await connectDB();

    /* ---------------------------------------------------
       Read dashboard filters from URL
    --------------------------------------------------- */

    const searchParams =
      request.nextUrl
        .searchParams;

    const range =
      searchParams.get(
        'range'
      ) || 'all';

    const platform =
      searchParams.get(
        'platform'
      ) || 'all';

    const campaign =
      searchParams.get(
        'campaign'
      ) || 'all';

    const landingPage =
      searchParams.get(
        'landingPage'
      ) || 'all';

    const search =
      (
        searchParams.get(
          'search'
        ) || ''
      )
        .trim()
        .toLowerCase();

    const customFrom =
      searchParams.get(
        'customFrom'
      ) || '';

    const customTo =
      searchParams.get(
        'customTo'
      ) || '';

    /* ---------------------------------------------------
       Read all analytics rows
    --------------------------------------------------- */

    const submissions =
      await getAnalyticsRows();

    /* ---------------------------------------------------
       Apply exactly the same dashboard filters
    --------------------------------------------------- */

    const filteredSubmissions =
      submissions.filter(
        (submission) => {

          /* -----------------------------
             Date filter
          ----------------------------- */

          if (
            !matchesDateRange(
              submission.capturedAt,
              range,
              customFrom,
              customTo
            )
          ) {
            return false;
          }

          /* -----------------------------
             Platform filter
          ----------------------------- */

          if (
            platform !== 'all' &&
            submission.platform !==
              platform
          ) {
            return false;
          }

          /* -----------------------------
             Campaign filter
          ----------------------------- */

          const rowCampaign =
            submission
              .utmCampaign
              ?.trim() ||
            submission
              .campaign
              ?.trim() ||
            '';

          if (
            campaign !== 'all' &&
            rowCampaign !==
              campaign
          ) {
            return false;
          }

          /* -----------------------------
             Landing page filter
          ----------------------------- */

          if (
            landingPage !==
            'all'
          ) {
            const storedUrl =
              submission
                .landingPageUrl
                ?.trim() ||
              '';

            const storedPath =
              submission
                .landingPage
                ?.trim() ||
              '';

            const fallbackUrl =
              storedUrl ||
              (
                (
                  !storedPath ||
                  storedPath ===
                    '/'
                ) &&
                submission
                  .referrer
                  ?.trim()
                  ? submission
                      .referrer
                      .trim()
                  : ''
              );

            const rowLandingPage =
              getLandingPageDisplay(
                fallbackUrl,
                storedPath
              );

            if (
              rowLandingPage !==
              landingPage
            ) {
              return false;
            }
          }

          /* -----------------------------
             Search filter
          ----------------------------- */

          if (search) {
            const searchableText =
              [
                submission
                  .fullName,
                submission
                  .phone,
                submission
                  .platform,
                submission
                  .campaign,
                submission
                  .utmCampaign,
                submission
                  .utmSource,
                submission
                  .utmMedium,
                submission
                  .utmContent,
                submission
                  .landingPage,
                submission
                  .landingPageUrl,
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            if (
              !searchableText.includes(
                search
              )
            ) {
              return false;
            }
          }

          return true;
        }
      );

    /* ---------------------------------------------------
       Newest first
    --------------------------------------------------- */

    filteredSubmissions.sort(
      (first, second) =>
        second.capturedAt
          .getTime() -
        first.capturedAt
          .getTime()
    );

    /* ---------------------------------------------------
       Excel rows

       Keep export intentionally simple.
    --------------------------------------------------- */

    const rows =
      filteredSubmissions.map(
        (submission) => ({
          Timestamp:
            formatExcelDate(
              submission
                .capturedAt
            ),

          'Full Name':
            submission
              .fullName ||
            'N/A',

          'Phone Number':
            submission
              .phone ||
            'N/A',

          Platform:
            submission
              .sourceType ===
            'legacy_import'
              ? 'Legacy'
              : submission
                    .platform ||
                'Direct',

          Campaign:
            submission
              .sourceType ===
            'legacy_import'
              ? 'Historical Lead'
              : submission
                    .utmCampaign ||
                submission
                    .campaign ||
                'Organic',
        })
      );

    /* ---------------------------------------------------
       Create worksheet
    --------------------------------------------------- */

    const worksheet =
      XLSX.utils
        .json_to_sheet(
          rows
        );

    worksheet['!cols'] = [
      { wch: 24 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 30 },
    ];

    /*
     * Freeze first row.
     */
    worksheet['!views'] = [
      {
        state:
          'frozen',
        xSplit: 0,
        ySplit: 1,
      },
    ];

    /*
     * Enable Excel filters.
     */
    if (rows.length > 0) {
      worksheet[
        '!autofilter'
      ] = {
        ref:
          `A1:E${
            rows.length + 1
          }`,
      };
    }

    /* ---------------------------------------------------
       Workbook
    --------------------------------------------------- */

    const workbook =
      XLSX.utils
        .book_new();

    XLSX.utils
      .book_append_sheet(
        workbook,
        worksheet,
        'Lead Touchpoints'
      );

    const buffer =
      XLSX.write(
        workbook,
        {
          type: 'buffer',
          bookType:
            'xlsx',
        }
      );

    /* ---------------------------------------------------
       Dynamic filename
    --------------------------------------------------- */

    const dateLabel =
      getISTDateKey(
        new Date()
      );

    let rangeLabel =
      range;

    if (
      range === 'custom'
    ) {
      rangeLabel =
        `${customFrom || 'start'}_to_${customTo || 'end'}`;
    }

    const fileName =
      `marketing-leads-${rangeLabel}-${dateLabel}.xlsx`;

    return new NextResponse(
      buffer,
      {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

          'Content-Disposition':
            `attachment; filename="${fileName}"`,

          'Cache-Control':
            'no-store',
        },
      }
    );
  } catch (
    error: unknown
  ) {
    const message =
      error instanceof Error
        ? error.message
        : 'Server error.';

    console.error(
      '[export]',
      error
    );

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}