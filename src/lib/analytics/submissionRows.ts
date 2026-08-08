import Submission from '@/lib/Submission';
import {
  normalizePlatform,
} from '@/lib/analytics/normalizePlatform';

export type LeanTouchpoint = {
  _id?: {
    toString(): string;
  };

  touchpointKey?: string;

  platform?: string;
  formSource?: string;
  sourceType?: string;

  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  utmId?: string;

  gclid?: string;
  fbclid?: string;

  landingPage?: {
    url?: string;
    path?: string;
  };

  referrer?: string;

  userAgent?: string;
  ipAddress?: string;
  language?: string;
  timezone?: string;

  browser?: {
    name?: string;
    version?: string;
  };

  os?: {
    name?: string;
    version?: string;
  };

  device?: {
    type?: string;
    vendor?: string;
    model?: string;
  };

  capturedAt?:
    | Date
    | string;
};

export type LegacyAttribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  utmId?: string;

  gclid?: string;
  fbclid?: string;

  landingPage?: {
    url?: string;
    path?: string;
  };

  referrer?: string;
};

export type LeanSubmission = {
  _id: {
    toString(): string;
  };

  fullName?: string;
  phone?: string;

  touchpoints?:
    LeanTouchpoint[];

  attribution?: LegacyAttribution;

  firstTouchAt?:
    | Date
    | string;

  lastTouchAt?:
    | Date
    | string;

  createdAt?:
    | Date
    | string;

  updatedAt?:
    | Date
    | string;

  totalTouchpoints?: number;
};
export type AnalyticsRow = {
  index: number;

  leadId: string;
  touchpointId: string;

  fullName: string;
  phone: string;

  timestamp: string;
  createdAtRaw: string;

  /*
   * Raw Date object used by server-side
   * analytics, export and sync routes.
   */
  capturedAt: Date;

  platform: string;
  campaign: string;

  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  utmId: string;

  gclid: string;
  fbclid: string;

  /*
   * Keep both names for compatibility.
   * Dashboard uses landingPage.
   * Analytics routes use landingPagePath.
   */
  landingPage: string;
  landingPagePath: string;
  landingPageUrl: string;

  referrer: string;

  formSource: string;
  sourceType: string;

  userAgent: string;
  ipAddress: string;
  language: string;
  timezone: string;

  browserName: string;
  browserVersion: string;

  osName: string;
  osVersion: string;

  deviceType: string;
  deviceVendor: string;
  deviceModel: string;

  firstTouchAt: string;
  lastTouchAt: string;

  totalTouchpoints: number;
};

export function toDateSafe(
  value: Date | string | undefined
): Date {
  if (!value) {
    return new Date(0);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date(0);
  }
  return date;
}

export function toISOStringSafe(
  value: Date | string | undefined
): string {
  return toDateSafe(value).toISOString();
}

export function toIndianDateTime(
  value: Date | string | undefined
): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
  });
}

export function mapTouchpointToRow(
  submission: LeanSubmission,
  touchpoint: LeanTouchpoint
): AnalyticsRow {
  const capturedAt = toDateSafe(
    touchpoint.capturedAt || submission.createdAt
  );

  const isLegacy = touchpoint.sourceType === 'legacy_import';

  const platform = isLegacy
    ? 'Legacy'
    : touchpoint.platform?.trim() ||
      normalizePlatform(touchpoint.utmSource);

  const campaign = isLegacy
    ? 'Historical Lead'
    : touchpoint.utmCampaign?.trim() || 'Organic';

  return {
    index: 0,
    leadId: submission._id.toString(),
    touchpointId:
      touchpoint._id?.toString() ||
      touchpoint.touchpointKey ||
      '',
    fullName:
  submission.fullName?.trim() || '',
    phone: submission.phone || '',
    platform,
    campaign,
    utmSource: touchpoint.utmSource || '',
    utmMedium: touchpoint.utmMedium || '',
    utmCampaign: touchpoint.utmCampaign || '',
    utmContent: touchpoint.utmContent || '',
    utmTerm: touchpoint.utmTerm || '',
    utmId: touchpoint.utmId || '',
    gclid: touchpoint.gclid || '',
    fbclid: touchpoint.fbclid || '',
    landingPage: touchpoint.landingPage?.path || '/',
    landingPagePath: touchpoint.landingPage?.path || '/',
    landingPageUrl: touchpoint.landingPage?.url || '',
    referrer: touchpoint.referrer || '',
    formSource: touchpoint.formSource || '',
    sourceType: touchpoint.sourceType || '',
    userAgent: touchpoint.userAgent || '',
    ipAddress: touchpoint.ipAddress || '',
    language: touchpoint.language || '',
    timezone: touchpoint.timezone || '',
    browserName: touchpoint.browser?.name || '',
    browserVersion: touchpoint.browser?.version || '',
    osName: touchpoint.os?.name || '',
    osVersion: touchpoint.os?.version || '',
    deviceType: touchpoint.device?.type || '',
    deviceVendor: touchpoint.device?.vendor || '',
    deviceModel: touchpoint.device?.model || '',
    createdAtRaw: capturedAt.toISOString(),
    timestamp: toIndianDateTime(capturedAt),
    capturedAt,
    firstTouchAt: toISOStringSafe(submission.firstTouchAt || submission.createdAt),
    lastTouchAt: toISOStringSafe(submission.lastTouchAt || submission.updatedAt || submission.createdAt),
    totalTouchpoints:
      submission.totalTouchpoints ||
      (submission.touchpoints ? submission.touchpoints.length : 0) ||
      1,
  };
}

export function mapLegacySubmissionToRow(
  submission: LeanSubmission
): AnalyticsRow {
  const attribution = submission.attribution || {};
  const createdAt = toDateSafe(
    submission.createdAt || submission.firstTouchAt
  );

  const utmSource = attribution.utmSource || '';
  const platform = 'Legacy';
  const campaign = 'Historical Lead';

  return {
    index: 0,
    leadId: submission._id.toString(),
    touchpointId: `legacy-${submission._id.toString()}`,
    fullName: submission.fullName || '',
    phone: submission.phone || '',
    platform,
    campaign,
    utmSource,
    utmMedium: attribution.utmMedium || '',
    utmCampaign: attribution.utmCampaign || '',
    utmContent: attribution.utmContent || '',
    utmTerm: attribution.utmTerm || '',
    utmId: attribution.utmId || '',
    gclid: attribution.gclid || '',
    fbclid: attribution.fbclid || '',
    landingPage: attribution.landingPage?.path || '/',
    landingPagePath: attribution.landingPage?.path || '/',
    landingPageUrl: attribution.landingPage?.url || '',
    referrer: attribution.referrer || '',
    formSource: '',
    sourceType: 'legacy_submission',
    userAgent: '',
    ipAddress: '',
    language: '',
    timezone: '',
    browserName: '',
    browserVersion: '',
    osName: '',
    osVersion: '',
    deviceType: '',
    deviceVendor: '',
    deviceModel: '',
    createdAtRaw: createdAt.toISOString(),
    timestamp: toIndianDateTime(createdAt),
    capturedAt: createdAt,
    firstTouchAt: toISOStringSafe(createdAt),
    lastTouchAt: toISOStringSafe(submission.updatedAt || createdAt),
    totalTouchpoints: 1,
  };
}

export async function getAnalyticsRows(): Promise<AnalyticsRow[]> {
  const documents = (await Submission.find()
    .sort({
      lastTouchAt: -1,
    })
    .lean()) as unknown as LeanSubmission[];

  const rows: AnalyticsRow[] = [];

  for (const submission of documents) {
    const touchpoints = Array.isArray(submission.touchpoints)
      ? submission.touchpoints
      : [];

    if (touchpoints.length > 0) {
      for (const touchpoint of touchpoints) {
        rows.push(mapTouchpointToRow(submission, touchpoint));
      }
    } else {
      rows.push(mapLegacySubmissionToRow(submission));
    }
  }

  return rows
    .sort(
      (first, second) =>
        new Date(second.createdAtRaw).getTime() -
        new Date(first.createdAtRaw).getTime()
    )
    .map((row, index) => ({
      ...row,
      index: index + 1,
    }));
}