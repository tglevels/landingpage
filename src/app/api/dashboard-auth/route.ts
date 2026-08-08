import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const secret = process.env.DASHBOARD_SECRET;

  if (!secret) {
    return NextResponse.json(
      {
        error:
          'DASHBOARD_SECRET is not configured on the server. ' +
          'Add it under Vercel → Settings → Environment Variables and redeploy.',
      },
      { status: 500 }
    );
  }

  const { password } = await req.json();

  if (password !== secret) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('dashboard_token', secret, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'strict',
  });
  return res;
}
