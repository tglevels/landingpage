import { NextRequest, NextResponse } from 'next/server';

import { verifyDashboardAuth } from '@/lib/analytics/authCheck';
import { getAnalyticsRows } from '@/lib/analytics/submissionRows';
import { connectDB } from '@/lib/mongodb';
import Submission from '@/lib/Submission';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const POLL_INTERVAL_MS = 5000;

type DataVersionResult = {
  totalLeads: number;
  totalTouchpoints: number;
  latestUpdate: Date | null;
};

async function getDataVersion(): Promise<string> {
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

export async function GET(req: NextRequest) {
  if (!(await verifyDashboardAuth())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const encoder = new TextEncoder();

  let lastVersion = '';
  let timer: ReturnType<typeof setInterval> | null = null;
  let isClosed = false;
  let isChecking = false;

  let controllerRef:
    | ReadableStreamDefaultController<Uint8Array>
    | null = null;

  const stopStream = () => {
    if (isClosed) {
      return;
    }

    isClosed = true;

    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    if (controllerRef) {
      try {
        controllerRef.close();
      } catch {
        // The browser or runtime may already have closed the stream.
      }

      controllerRef = null;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controllerRef = controller;

      req.signal.addEventListener('abort', stopStream, {
        once: true,
      });

      try {
        await connectDB();
      } catch (error) {
        console.error(
          '[submissions-stream] MongoDB connection failed:',
          error
        );

        stopStream();
        return;
      }

      const safeSend = (content: string): boolean => {
        if (
          isClosed ||
          req.signal.aborted ||
          !controllerRef
        ) {
          return false;
        }

        try {
          controllerRef.enqueue(encoder.encode(content));
          return true;
        } catch (error) {
          if (!isClosed) {
            console.error(
              '[submissions-stream] Failed to write to stream:',
              error
            );
          }

          stopStream();
          return false;
        }
      };

      const checkForChanges = async () => {
        if (
          isChecking ||
          isClosed ||
          req.signal.aborted
        ) {
          return;
        }

        isChecking = true;

        try {
          const currentVersion = await getDataVersion();

          if (
            isClosed ||
            req.signal.aborted
          ) {
            return;
          }

          if (currentVersion !== lastVersion) {
            const rows = await getAnalyticsRows();

            if (
              isClosed ||
              req.signal.aborted
            ) {
              return;
            }

            const sent = safeSend(
              `data: ${JSON.stringify(rows)}\n\n`
            );

            if (sent) {
              lastVersion = currentVersion;
            }
          } else {
            safeSend(': ping\n\n');
          }
        } catch (error) {
          if (
            !isClosed &&
            !req.signal.aborted
          ) {
            console.error(
              '[submissions-stream] Update check failed:',
              error
            );
          }
        } finally {
          isChecking = false;
        }
      };

      await checkForChanges();

      if (
        isClosed ||
        req.signal.aborted
      ) {
        return;
      }

      timer = setInterval(() => {
        void checkForChanges();
      }, POLL_INTERVAL_MS);
    },

    cancel() {
      stopStream();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}