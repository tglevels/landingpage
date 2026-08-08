import crypto from 'crypto';

import {
  NextRequest,
  NextResponse,
} from 'next/server';

import { connectDB } from '@/lib/mongodb';

import Submission, {
  ITouchpoint,
} from '@/lib/Submission';

import { normalizePlatform } from '@/lib/analytics/normalizePlatform';

export const dynamic = 'force-dynamic';

function cleanString(
  value: unknown
): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function createTouchpointKey({
  utmSource,
  utmId,
  utmCampaign,
  landingPagePath,
}: {
  utmSource: string;
  utmId: string;
  utmCampaign: string;
  landingPagePath: string;
}): string {
  /*
   * Duplicate checking priority:
   *
   * 1. Source + UTM campaign ID
   * 2. Source + campaign name
   * 3. Source + landing-page path
   */
  const campaignIdentifier =
    utmId ||
    utmCampaign ||
    landingPagePath ||
    'direct';

  const rawKey = [
    utmSource || 'direct',
    campaignIdentifier,
  ]
    .join('|')
    .trim()
    .toLowerCase();

  return crypto
    .createHash('sha256')
    .update(rawKey)
    .digest('hex');
}

export async function POST(
  req: NextRequest
) {
  try {
    await connectDB();

    const body = await req.json();

    const fullName =
      cleanString(body.fullName);

    const rawPhone =
      cleanString(body.phone);

    const normalizedPhone = rawPhone
      .replace(/\D/g, '')
      .slice(-10);

    /*
     * Basic form validation
     *
     * fullName is optional (for example PWA
     * submissions only send a phone number).
     */
    if (
      normalizedPhone.length !== 10
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Phone number must be exactly 10 digits.',
        },
        {
          status: 400,
        }
      );
    }

    const attribution =
      body.attribution &&
      typeof body.attribution ===
        'object'
        ? body.attribution
        : {};

    /*
     * Normalize marketing attribution.
     *
     * Keep the raw advertising source:
     * facebook, instagram, google, etc.
     *
     * normalizePlatform() converts it into:
     * Meta, Google, YouTube, Direct, etc.
     */
    const normalizedUtmSource =
      cleanString(
        attribution.utmSource ||
          attribution.utm_source
      ).toLowerCase() || 'direct';

    const normalizedUtmMedium =
      cleanString(
        attribution.utmMedium ||
          attribution.utm_medium
      ).toLowerCase();

    const normalizedUtmCampaign =
      cleanString(
        attribution.utmCampaign ||
          attribution.utm_campaign
      ).toLowerCase();

    const normalizedUtmContent =
      cleanString(
        attribution.utmContent ||
          attribution.utm_content
      );

    const normalizedUtmTerm =
      cleanString(
        attribution.utmTerm ||
          attribution.utm_term
      );

    const normalizedUtmId =
      cleanString(
        attribution.utmId ||
          attribution.utm_id
      );

    const gclid =
      cleanString(
        attribution.gclid
      );

    const fbclid =
      cleanString(
        attribution.fbclid
      );

    const landingPageUrl =
      cleanString(
        attribution.landingPage?.url ||
          attribution.landingPageUrl ||
          attribution.landing_page_url
      );

    let landingPagePath =
      cleanString(
        attribution.landingPage?.path ||
          attribution.landing_page_path
      ) || '/';

    /*
     * Derive the pathname from the full URL
     * when the client did not send it.
     */
    if (
      landingPagePath === '/' &&
      landingPageUrl
    ) {
      try {
        landingPagePath =
          new URL(
            landingPageUrl
          ).pathname || '/';
      } catch {
        landingPagePath = '/';
      }
    }

    const referrer =
      cleanString(
        attribution.referrer
      );

    const platform =
      normalizePlatform(
        normalizedUtmSource
      );

    /*
     * Identifies which website or form
     * generated this interaction.
     *
     * Examples:
     * nextjs-landing-page
     * wordpress-main-site
     * wordpress-webinar
     */
    const formSource =
      cleanString(
        body.formSource ||
          attribution.formSource ||
          attribution.form_source
      );

    const sourceType =
      cleanString(
        body.sourceType ||
          attribution.sourceType ||
          attribution.source_type
      ) || 'landing_page';

    const timezone =
      cleanString(
        body.timezone
      );

    /*
     * Request and device information
     */
    const userAgent =
      req.headers.get(
        'user-agent'
      ) || '';

    const language =
      req.headers.get(
        'accept-language'
      ) || '';

    const forwardedFor =
      req.headers.get(
        'x-forwarded-for'
      );

    const ipAddress =
      forwardedFor
        ?.split(',')[0]
        ?.trim() ||
      req.headers.get(
        'x-real-ip'
      ) ||
      '';

    const browser =
      body.browser &&
      typeof body.browser === 'object'
        ? body.browser
        : {};

    const operatingSystem =
      body.os &&
      typeof body.os === 'object'
        ? body.os
        : {};

    const device =
      body.device &&
      typeof body.device === 'object'
        ? body.device
        : {};

    /*
     * This key determines whether the same
     * customer has already registered for
     * this exact campaign.
     */
    const touchpointKey =
      createTouchpointKey({
        utmSource:
          normalizedUtmSource,

        utmId:
          normalizedUtmId,

        utmCampaign:
          normalizedUtmCampaign,

        landingPagePath,
      });

    const capturedAt =
      new Date();

    const channel =
      cleanString(
        body.channel ||
          attribution.channel
      );

    const videoId =
      cleanString(
        body.videoId ||
          attribution.videoId
      );

    const videoTitle =
      cleanString(
        body.videoTitle ||
          attribution.videoTitle
      );

    const placement =
      cleanString(
        body.placement ||
          attribution.placement
      );

    const journeyId =
      cleanString(
        body.journeyId ||
          attribution.journeyId
      );

    const parentTouchpointId =
      cleanString(
        body.parentTouchpointId ||
          attribution.parentTouchpointId
      );

    /*
     * ITouchpoint explicitly types this object
     * and prevents implicit-any TypeScript errors.
     */
    const touchpoint: ITouchpoint = {
      touchpointKey,

      platform,
      formSource,
      sourceType,

      utmSource:
        normalizedUtmSource,

      utmMedium:
        normalizedUtmMedium,

      utmCampaign:
        normalizedUtmCampaign,

      utmContent:
        normalizedUtmContent,

      utmTerm:
        normalizedUtmTerm,

      utmId:
        normalizedUtmId,

      gclid,
      fbclid,

      landingPage: {
        url: landingPageUrl,
        path: landingPagePath,
      },

      referrer,

      userAgent,
      ipAddress,
      language,
      timezone,

      browser: {
        name:
          cleanString(
            browser.name
          ),

        version:
          cleanString(
            browser.version
          ),
      },

      os: {
        name:
          cleanString(
            operatingSystem.name
          ),

        version:
          cleanString(
            operatingSystem.version
          ),
      },

      device: {
        type:
          cleanString(
            device.type
          ) || 'unknown',

        vendor:
          cleanString(
            device.vendor
          ),

        model:
          cleanString(
            device.model
          ),
      },

      channel,
      videoId,
      videoTitle,
      placement,

      journeyId,
      parentTouchpointId,

      capturedAt,
    };

    /*
     * One Submission document now represents
     * one customer.
     *
     * Phone is the unique customer identifier.
     */
    const existingSubmission =
      await Submission.findOne({
        phone: normalizedPhone,
      });

    if (existingSubmission) {
      /*
       * Same phone + same platform/source +
       * same campaign:
       *
       * Do not create another touchpoint.
       */
      const alreadyRegistered =
        existingSubmission.touchpoints.some(
          (
            existingTouchpoint:
              ITouchpoint
          ) =>
            existingTouchpoint
              .touchpointKey ===
            touchpointKey
        );

      if (alreadyRegistered) {
        return NextResponse.json(
          {
            success: false,
            error:
              'You are already registered for this campaign.',
          },
          {
            status: 409,
          }
        );
      }

      /*
       * Same phone with a different campaign
       * or different advertising platform:
       *
       * Add a new touchpoint to the same
       * customer document.
       */
      const updateResult =
        await Submission.updateOne(
          {
            _id:
              existingSubmission._id,

            'touchpoints.touchpointKey': {
              $ne: touchpointKey,
            },
          },
          [
            {
              $set: {
                /*
                 * Only fill in the name when a
                 * real name was submitted and the
                 * existing lead has no name yet.
                 *
                 * A blank PWA name must never
                 * overwrite a real WordPress name.
                 */
                fullName: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $ne: [
                            fullName,
                            '',
                          ],
                        },
                        {
                          $eq: [
                            {
                              $trim: {
                                input: {
                                  $ifNull: [
                                    '$fullName',
                                    '',
                                  ],
                                },
                              },
                            },
                            '',
                          ],
                        },
                      ],
                    },

                    then: fullName,

                    else: '$fullName',
                  },
                },

                lastTouchAt:
                  capturedAt,
              },
            },
            {
              $push: {
                touchpoints:
                  touchpoint,
              },
            },
            {
              $inc: {
                totalTouchpoints:
                  1,
              },
            },
          ]
        );

      /*
       * This can occur when two identical
       * requests arrive simultaneously.
       */
      if (
        updateResult.modifiedCount === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'You are already registered for this campaign.',
          },
          {
            status: 409,
          }
        );
      }

      const updatedSubmission =
        await Submission.findById(
          existingSubmission._id
        ).lean();

      return NextResponse.json(
        {
          success: true,

          message:
            'New campaign interaction added successfully.',

          data: {
            id:
              existingSubmission
                ._id
                .toString(),

            fullName,

            phone:
              normalizedPhone,

            touchpoint,

            totalTouchpoints:
              updatedSubmission
                ?.totalTouchpoints ??
              existingSubmission
                .totalTouchpoints +
                1,

            firstTouchAt:
              updatedSubmission
                ?.firstTouchAt,

            lastTouchAt:
              updatedSubmission
                ?.lastTouchAt,
          },
        },
        {
          status: 200,
        }
      );
    }

    /*
     * Phone number does not exist.
     *
     * Create a new customer with their
     * first marketing touchpoint.
     */
    try {
      const submission =
        await Submission.create({
          fullName,

          phone:
            normalizedPhone,

          touchpoints: [
            touchpoint,
          ],

          firstTouchAt:
            capturedAt,

          lastTouchAt:
            capturedAt,

          totalTouchpoints: 1,
        });

      return NextResponse.json(
        {
          success: true,

          message:
            'Registration completed successfully.',

          data: {
            id:
              submission._id.toString(),

            fullName:
              submission.fullName,

            phone:
              submission.phone,

            touchpoint,

            totalTouchpoints:
              submission.totalTouchpoints,

            firstTouchAt:
              submission.firstTouchAt,

            lastTouchAt:
              submission.lastTouchAt,
          },
        },
        {
          status: 201,
        }
      );
    } catch (error: unknown) {
      /*
       * Race-condition protection:
       *
       * Two requests for the same new phone
       * may arrive at the same time.
       *
       * Since phone is unique, the second
       * request can receive MongoDB E11000.
       */
      const mongoError =
        error as {
          code?: number;
        };

      if (
        mongoError.code !== 11000
      ) {
        throw error;
      }

      /*
       * Retry by adding the touchpoint to
       * the customer created by the first
       * concurrent request.
       */
      const retryResult =
        await Submission.updateOne(
          {
            phone:
              normalizedPhone,

            'touchpoints.touchpointKey': {
              $ne: touchpointKey,
            },
          },
          [
            {
              $set: {
                fullName: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $ne: [
                            fullName,
                            '',
                          ],
                        },
                        {
                          $eq: [
                            {
                              $trim: {
                                input: {
                                  $ifNull: [
                                    '$fullName',
                                    '',
                                  ],
                                },
                              },
                            },
                            '',
                          ],
                        },
                      ],
                    },

                    then: fullName,

                    else: '$fullName',
                  },
                },

                lastTouchAt:
                  capturedAt,
              },
            },
            {
              $push: {
                touchpoints:
                  touchpoint,
              },
            },
            {
              $inc: {
                totalTouchpoints:
                  1,
              },
            },
          ]
        );

      if (
        retryResult.modifiedCount === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'You are already registered for this campaign.',
          },
          {
            status: 409,
          }
        );
      }

      const updatedSubmission =
        await Submission.findOne({
          phone:
            normalizedPhone,
        }).lean();

      return NextResponse.json(
        {
          success: true,

          message:
            'New campaign interaction added successfully.',

          data: {
            id:
              updatedSubmission
                ?._id
                ?.toString(),

            fullName:
              updatedSubmission
                ?.fullName ||
              fullName,

            phone:
              normalizedPhone,

            touchpoint,

            totalTouchpoints:
              updatedSubmission
                ?.totalTouchpoints ??
              1,

            firstTouchAt:
              updatedSubmission
                ?.firstTouchAt,

            lastTouchAt:
              updatedSubmission
                ?.lastTouchAt,
          },
        },
        {
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error(
      '[api/submit] Submission error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          'Unable to submit your details.',
      },
      {
        status: 500,
      }
    );
  }
}