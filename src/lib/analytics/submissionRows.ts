import Submission from '@/lib/Submission';
import { normalizePlatform } from './normalizePlatform';

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
  capturedAt?: Date | string;
};

export type LeanSubmission = {
  _id: {
    toString(): string;
  };

  fullName?: string;
  phone?: string;

  touchpoints?: LeanTouchpoint[];

  firstTouchAt?: Date | string;
  lastTouchAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type AnalyticsRow = {
  leadId: string;

  fullName: string;
  phone: string;

  platform: string;

  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  utmId: string;

  gclid: string;
  fbclid: string;

  landingPagePath: string;
  landingPageUrl: string;
  referrer: string;

  formSource: string;
  sourceType: string;

  capturedAt: Date;
};

function safeDate(value: Date | string | undefined): Date {
  const date = value ? new Date(value) : new Date(0);

  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

export async function getAnalyticsRows(): Promise<AnalyticsRow[]> {
  const submissions = (await Submission.find()
    .select(
      [
        'fullName',
        'phone',
        'touchpoints',
        'firstTouchAt',
        'lastTouchAt',
        'createdAt',
        'updatedAt',
      ].join(' ')
    )
    .lean()) as unknown as LeanSubmission[];

  return submissions.flatMap((submission) => {
    const touchpoints = Array.isArray(submission.touchpoints)
      ? submission.touchpoints
      : [];

    return touchpoints.map((touchpoint) => {
      const utmSource = touchpoint.utmSource || '';

      return {
        leadId: submission._id.toString(),

        fullName: submission.fullName || '',

        phone: submission.phone || '',

        platform:
          touchpoint.platform || normalizePlatform(utmSource),

        utmSource,

        utmMedium: touchpoint.utmMedium || '',

        utmCampaign: touchpoint.utmCampaign || '',

        utmContent: touchpoint.utmContent || '',

        utmTerm: touchpoint.utmTerm || '',

        utmId: touchpoint.utmId || '',

        gclid: touchpoint.gclid || '',

        fbclid: touchpoint.fbclid || '',

        landingPagePath: touchpoint.landingPage?.path || '/',

        landingPageUrl: touchpoint.landingPage?.url || '',

        referrer: touchpoint.referrer || '',

        formSource: touchpoint.formSource || '',

        sourceType: touchpoint.sourceType || '',

        capturedAt: safeDate(
          touchpoint.capturedAt || submission.createdAt
        ),
      };
    });
  });
}
