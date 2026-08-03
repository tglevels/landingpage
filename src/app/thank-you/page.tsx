'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

function ThankYouContent() {
  const params = useSearchParams();
  const name = params.get('name') || '';

  return (
    <main
      className="min-h-screen w-full flex flex-col items-center justify-center font-sans px-4"
      style={{
        background:
          'linear-gradient(160deg, #0e3c2a 0%, #0e3c2a 60%, #c8d3cd 100%)',
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl px-8 py-14 flex flex-col items-center w-full max-w-md text-center">
        {/* Checkmark */}
        <div className="w-20 h-20 rounded-full bg-[#0e3c2a] flex items-center justify-center mb-6 shadow-lg">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-10 h-10 text-white"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="text-[36px] font-black text-[#0e3c2a] leading-tight mb-3">
          Thank You{name ? `, ${name}` : ''}!
        </h1>

        <p className="text-[16px] text-[#4b5563] leading-relaxed mb-8">
          Your registration is confirmed.
        </p>

        <Link
          href="/"
          className="w-full bg-[#0e3c2a] hover:bg-[#0a5230] text-white text-[16px] font-black rounded-2xl py-4 transition-colors text-center block"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense>
      <ThankYouContent />
    </Suspense>
  );
}
