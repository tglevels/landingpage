import { cookies } from 'next/headers';

/**
 * Verify dashboard authentication from cookie.
 * Returns true if authenticated, false otherwise.
 */
export async function verifyDashboardAuth(): Promise<boolean> {
  const secret = process.env.DASHBOARD_SECRET;

  /*
   * Never treat a missing secret as "authenticated":
   * undefined === undefined would otherwise open the
   * dashboard to everyone when DASHBOARD_SECRET is not
   * configured (e.g. forgotten in Vercel env vars).
   */
  if (!secret) {
    console.error(
      '[auth] DASHBOARD_SECRET is not configured. ' +
        'Add it under Vercel → Settings → Environment Variables and redeploy.'
    );
    return false;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('dashboard_token')?.value;
  return token === secret;
}
