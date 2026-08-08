import Submission from '@/lib/Submission';

type DataVersionResult = {
  totalLeads: number;
  totalTouchpoints: number;
  latestUpdate: Date | null;
};

/**
 * Cheap fingerprint of the submissions collection.
 *
 * The dashboard polls this to decide whether it needs
 * to pull the full row set, so it must stay far cheaper
 * than getAnalyticsRows().
 */
export async function getDataVersion(): Promise<string> {
  const result = await Submission.aggregate<DataVersionResult>([
    {
      $project: {
        updatedAt: 1,
        touchpointCount: {
          $size: {
            $ifNull: ['$touchpoints', []],
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        totalLeads: { $sum: 1 },
        totalTouchpoints: { $sum: '$touchpointCount' },
        latestUpdate: { $max: '$updatedAt' },
      },
    },
  ]);

  const version = result[0];

  if (!version) {
    return '0:0:none';
  }

  return [
    version.totalLeads,
    version.totalTouchpoints,
    version.latestUpdate
      ? new Date(version.latestUpdate).toISOString()
      : 'none',
  ].join(':');
}
