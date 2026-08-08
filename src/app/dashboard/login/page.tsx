'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/dashboard-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/dashboard');
    } else {
      /*
       * Show the real cause (e.g. "Wrong password" or
       * "DASHBOARD_SECRET is not configured…") instead of
       * a generic message that hides configuration errors.
       */
      let message = 'Wrong password. Try again.';
      try {
        const body = (await res.json()) as { error?: string };
        if (body?.error) message = body.error;
      } catch {
        /* response had no JSON body */
      }
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>TG</div>
        <h1 style={s.title}>Marketing Intelligence</h1>
        <p style={s.subtitle}>Enter your password to access the dashboard</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={s.input}
          />
          {error && <p style={s.error}>{error}</p>}
          <button type="submit" disabled={loading} style={s.button}>
            {loading ? 'Verifying...' : 'Access Dashboard'}
          </button>
        </form>

        <p style={s.footer}>Company staff only</p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: '#f8faf9',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  logo: {
    width: '64px',
    height: '64px',
    borderRadius: '12px',
    background: '#10b981',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: 700,
    margin: '0 auto 20px',
  },
  title: {
    margin: '0 0 8px',
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
  },
  subtitle: {
    margin: '0 0 28px',
    fontSize: '14px',
    color: '#64748b',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    color: '#0f172a',
    outline: 'none',
  },
  error: {
    color: '#ef4444',
    fontSize: '13px',
    margin: 0,
    fontWeight: 600,
  },
  button: {
    background: '#10b981',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  footer: {
    marginTop: '24px',
    fontSize: '13px',
    color: '#94a3b8',
  },
};