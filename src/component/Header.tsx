'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type StoredAttribution = {
  utmSource?: string;
  utm_source?: string;
  utmMedium?: string;
  utm_medium?: string;
  utmCampaign?: string;
  utm_campaign?: string;
  utmContent?: string;
  utm_content?: string;
  utmTerm?: string;
  utm_term?: string;
  utmId?: string;
  utm_id?: string;
  gclid?: string;
  fbclid?: string;
  landingPage?: {
    url?: string;
    path?: string;
  };
  referrer?: string;
};

export default function PromoPage() {
  const [timeLeft, setTimeLeft] = useState(897);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [errorTitle, setErrorTitle] = useState('Invalid Details');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
  };

  const scrollToForm = () => {
    const isMobile = window.innerWidth < 1024;
    const targetId = isMobile ? 'mobile-form' : 'desktop-form';
    const element = document.getElementById(targetId);
    console.log(element);
    
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubmit = async () => {
    setError('');
    setErrorTitle('Invalid Details');

    const trimmedName = fullName.trim();
    const digits = phone.replace(/\D/g, '').slice(-10);

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }

    if (digits.length !== 10) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }

    setLoading(true);

    try {
      const storedAttribution = sessionStorage.getItem(
        'marketing_attribution'
      );

      let savedAttribution: StoredAttribution = {};

      try {
        savedAttribution = storedAttribution
          ? JSON.parse(storedAttribution)
          : {};
      } catch {
        savedAttribution = {};
      }

      const params = new URLSearchParams(window.location.search);

      let finalUtmId =
        params.get('utm_id') ||
        savedAttribution.utmId ||
        savedAttribution.utm_id ||
        '';

      if (!finalUtmId && savedAttribution.landingPage?.url) {
        try {
          const savedUrl = new URL(
            savedAttribution.landingPage.url
          );

          finalUtmId =
            savedUrl.searchParams.get('utm_id') ||
            savedUrl.searchParams.get('utmId') ||
            '';
        } catch {
          finalUtmId = '';
        }
      }

      const attribution = {
        ...savedAttribution,

        utmSource:
          params.get('utm_source') ||
          savedAttribution.utmSource ||
          savedAttribution.utm_source ||
          '',

        utmMedium:
          params.get('utm_medium') ||
          savedAttribution.utmMedium ||
          savedAttribution.utm_medium ||
          '',

        utmCampaign:
          params.get('utm_campaign') ||
          savedAttribution.utmCampaign ||
          savedAttribution.utm_campaign ||
          '',

        utmContent:
          params.get('utm_content') ||
          savedAttribution.utmContent ||
          savedAttribution.utm_content ||
          '',

        utmTerm:
          params.get('utm_term') ||
          savedAttribution.utmTerm ||
          savedAttribution.utm_term ||
          '',

        utmId: finalUtmId,

        gclid:
          params.get('gclid') ||
          savedAttribution.gclid ||
          '',

        fbclid:
          params.get('fbclid') ||
          savedAttribution.fbclid ||
          '',

        landingPage: {
          url:
            savedAttribution.landingPage?.url ||
            window.location.href,
          path:
            savedAttribution.landingPage?.path ||
            window.location.pathname,
        },

        referrer:
          savedAttribution.referrer ||
          document.referrer ||
          '',
      };

      sessionStorage.setItem(
        'marketing_attribution',
        JSON.stringify(attribution)
      );

      console.log('Final UTM ID sent to API:', attribution.utmId);
      console.log('Final attribution sent to API:', attribution);

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: trimmedName,
          phone: digits,
          attribution,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');

        if (data.error === 'You are already registered.') {
          setErrorTitle('Already Registered');
        }

        return;
      }

      router.push(
        `/thank-you?name=${encodeURIComponent(trimmedName)}`
      );
    } catch (error) {
      console.error('Submission error:', error);
      setError('Network error. Please try again.');
      setErrorTitle('Network Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const existingRaw = sessionStorage.getItem(
      'marketing_attribution'
    );

    let existing: StoredAttribution = {};

    try {
      existing = existingRaw
        ? JSON.parse(existingRaw)
        : {};
    } catch {
      existing = {};
    }

    let finalUtmId =
      params.get('utm_id') ||
      existing.utmId ||
      existing.utm_id ||
      '';

    if (!finalUtmId && existing.landingPage?.url) {
      try {
        const savedUrl = new URL(existing.landingPage.url);

        finalUtmId =
          savedUrl.searchParams.get('utm_id') ||
          savedUrl.searchParams.get('utmId') ||
          '';
      } catch {
        finalUtmId = '';
      }
    }

    const attribution = {
      ...existing,

      utmSource:
        params.get('utm_source') ||
        existing.utmSource ||
        existing.utm_source ||
        '',

      utmMedium:
        params.get('utm_medium') ||
        existing.utmMedium ||
        existing.utm_medium ||
        '',

      utmCampaign:
        params.get('utm_campaign') ||
        existing.utmCampaign ||
        existing.utm_campaign ||
        '',

      utmContent:
        params.get('utm_content') ||
        existing.utmContent ||
        existing.utm_content ||
        '',

      utmTerm:
        params.get('utm_term') ||
        existing.utmTerm ||
        existing.utm_term ||
        '',

      utmId: finalUtmId,

      gclid:
        params.get('gclid') ||
        existing.gclid ||
        '',

      fbclid:
        params.get('fbclid') ||
        existing.fbclid ||
        '',

      landingPage: {
        url:
          existing.landingPage?.url ||
          window.location.href,
        path:
          existing.landingPage?.path ||
          window.location.pathname,
      },

      referrer:
        existing.referrer ||
        document.referrer ||
        '',
    };

    sessionStorage.setItem(
      'marketing_attribution',
      JSON.stringify(attribution)
    );

    console.log('Captured attribution:', attribution);
    console.log('Captured UTM ID:', attribution.utmId);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <main className="min-h-screen w-full text-white flex flex-col items-center font-sans">

      {/* Error popup */}
      {error && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-7 flex flex-col items-center max-w-sm w-full text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <p className="text-[16px] font-black text-[#0f1923] mb-1">{errorTitle}</p>
            <p className="text-[14px] text-[#6b7280] mb-5">{error}</p>
            <button onClick={() => setError('')} className="bg-[#0e3c2a] text-white font-black text-sm px-8 py-2.5 rounded-xl hover:bg-[#0a5230] transition-colors">OK</button>
          </div>
        </div>
      )}

      {/* ── BANNER (shared) ── */}
      <div className="w-full bg-[#b52222] py-2 px-3 flex justify-between items-center font-semibold z-50 shrink-0 sticky top-0" style={{ fontSize: 'clamp(7px, 2.5vw, 10px)' }}>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-pink-400 rounded-full shrink-0"></div>
          <span className="opacity-90 whitespace-nowrap">Offer ends in</span>
          <div className="bg-black/20 px-1.5 py-0.5 rounded font-bold text-center" style={{ fontSize: 'clamp(8px, 3vw, 14px)', minWidth: '40px' }}>
            {formatTime(timeLeft)}
          </div>
        </div>
        <div className="flex items-center gap-0.5 whitespace-nowrap">
          <span className="opacity-90">Only </span>
          <span className="font-bold">23</span>
          <span className="opacity-90"> spots at </span>
          <span className="font-bold">₹59</span>
        </div>
      </div>

      {/* ════════════════════════════════
          MOBILE LAYOUT  (hidden on lg+)
      ════════════════════════════════ */}
      <div className="lg:hidden w-full" style={{ background: 'linear-gradient(to bottom, #0e3c2a 0%, #0e3c2a 60%, #c8d3cd 100%)' }}>
        <div className="flex flex-col items-center w-full max-w-[390px] mx-auto px-4 pt-6">

          <div className="relative w-full h-14 shrink-0">
            <Image src="/img.png" alt="TG Levels" fill className="object-contain" priority sizes="390px" />
          </div>

          <div className="border border-white/40 rounded-full px-3 py-1 flex items-center gap-1.5 bg-black/40 shrink-0 mt-6">
            <div className="w-3.5 h-3.5 bg-[#a3e635] rounded-full flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-2.5 h-2.5 text-black" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span className="font-bold uppercase" style={{ fontSize: 'clamp(7px, 2.3vw, 10px)', letterSpacing: '0.05em' }}>SEBI Registered Research Analyst</span>
          </div>

          <div className="text-center shrink-0 mt-6">
            <h1 className="font-bold leading-none tracking-tight" style={{ fontSize: 'clamp(16px, 8vw, 30px)' }}>
              Nifty & Sensex <span className="text-[#a3e635]">Options</span>
            </h1>
            <h2 className="font-bold text-[#a3e635] mt-1" style={{ fontSize: 'clamp(16px, 8vw, 30px)' }}>Trades</h2>
          </div>

          <div className="flex items-baseline justify-center shrink-0 mt-2">
            <div className="leading-none font-black text-[#a3e635] tracking-tighter" style={{ fontSize: 'clamp(24px, 20vw, 76px)' }}>
              ₹59<span className="ml-1" style={{ fontSize: 'clamp(20px, 17vw, 64px)' }}>/</span>
            </div>
            <div className="font-bold ml-2 whitespace-nowrap" style={{ fontSize: 'clamp(12px, 8vw, 36px)' }}>1 Trade **</div>
          </div>

          <div className="relative w-full flex flex-col items-center -mt-30">
            <div className="relative w-full flex justify-center items-end">
              <Image src="/sir.png" alt="Tushar Ghone" width={600} height={750} className="w-full h-auto object-contain scale-110 origin-bottom" priority />
            </div>
            <div className="w-[320px] bg-[#fff200] rounded-full py-2 px-4 flex flex-col items-center justify-center shadow-lg -mt-29 z-30 relative">
              <span className="text-black font-black text-sm uppercase leading-tight">MR. TUSHAR GHONE</span>
              <span className="text-black font-bold text-[8px] uppercase leading-tight opacity-90">SEBI REGISTERED RESEARCH ANALYST</span>
            </div>
          </div>

          <div className="shrink-0 mt-6 w-full px-8 relative">
  <button
    className="bg-red-600 hover:bg-red-700 text-white text-[26px] font-black w-full py-2 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.3)] uppercase relative"
    onClick={scrollToForm}
  >
    JOIN NOW
  </button>
</div>

          <div className="grid grid-cols-2 gap-3 w-full z-30 mt-8 mb-16">
            <FeatureCard icon="/icon1.png" text="Get trades from SEBI Registered RA" />
            <FeatureCard icon="/icon2.png" text="Minimum 4-5 Trades a day" />
            <FeatureCard icon="/icon3.png" text="Customer Support for your query" />
            <FeatureCard icon="/icon4.png" text="Proper Entry, Stoploss and Exit" />
          </div>
        </div>
      </div>

      {/* Mobile form */}
      <div id="mobile-form" className="lg:hidden w-full bg-[#f0f2f5] px-4 py-10 flex justify-center">
        <div className="w-full max-w-[420px] bg-white rounded-[28px] shadow-lg px-7 py-10 flex flex-col items-center">
          <div className="self-end -mt-6 -mr-3 w-10 h-10 rounded-full bg-[#e8ecf0] opacity-60 mb-2" />
          <h2 className="text-[34px] font-black text-[#0f1923] text-center leading-tight mb-2">Join Us Now</h2>
          <p className="text-[15px] text-[#6b7280] text-center leading-snug mb-7 px-2">Enter your details to receive the next active signal.</p>
          <div className="w-full mb-5">
            <label className="block text-[15px] font-bold text-[#0f1923] mb-2">Full Name</label>
            <input type="text" placeholder="e.g. Arjun Mehta" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-[#eef0f8] rounded-2xl px-5 py-4 text-[15px] text-[#0f1923] placeholder-[#a0a8c0] outline-none border-none focus:ring-2 focus:ring-[#063a1f]/30" />
          </div>
          <div className="w-full mb-7">
            <label className="block text-[15px] font-bold text-[#0f1923] mb-2">Phone Number</label>
            <input type="tel" inputMode="numeric" maxLength={10} placeholder="00000 00000" value={phone} onChange={(e) => handlePhoneChange(e.target.value)} className="w-full bg-[#eef0f8] rounded-2xl px-5 py-4 text-[15px] text-[#0f1923] placeholder-[#a0a8c0] outline-none border-none focus:ring-2 focus:ring-[#063a1f]/30" />
          </div>
          <button onClick={handleSubmit} disabled={loading} className="w-full bg-[#063a1f] hover:bg-[#0a5230] disabled:opacity-60 text-white text-[20px] font-black rounded-2xl py-4 shadow-md transition-colors mb-5">{loading ? 'Submitting...' : 'Register Now'}</button>
          <div className="flex items-start gap-2 px-1">
            <svg className="w-4 h-4 text-[#6b7280] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-[12px] text-[#6b7280] leading-snug">No spam. Your details are secure &amp; encrypted.</p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════
          DESKTOP LAYOUT  (hidden on mobile)
      ════════════════════════════════ */}

      {/* Desktop Hero */}
      <div
        className="hidden lg:flex flex-col w-full overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0e3c2a 0%, #0e3c2a 60%, #c8d3cd 100%)', height: 'calc(100vh - 40px)' }}
      >
        {/* ── Navbar ── */}
        <div className="w-full flex items-center justify-between px-16 py-5 shrink-0 z-20">
          <div className="relative w-48 h-12">
            <Image src="/img.png" alt="TG Levels" fill className="object-contain object-left" priority />
          </div>
          <div className="border border-white/40 rounded-full px-5 py-2 flex items-center gap-2 bg-black/30">
            <div className="w-4 h-4 bg-[#a3e635] rounded-full flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 text-black" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span className="text-xs font-bold tracking-widest uppercase text-white">SEBI Registered Research Analyst</span>
          </div>
        </div>

        {/* ── Two column body ── */}
        <div className="flex flex-1 w-full max-w-7xl mx-auto overflow-hidden">

        {/* LEFT — Person image + name tag */}
        <div className="relative flex flex-col items-center justify-start w-[45%] shrink-0" style={{ marginTop: '-80px' }}>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-80 h-80 rounded-full blur-3xl opacity-15" style={{ background: '#a3e635' }} />
          </div>
          {/* Image + name tag grouped — move together */}
          <div className="flex flex-col items-center w-full z-10">
            <Image
              src="/sir.png"
              alt="Tushar Ghone"
              width={600}
              height={750}
              className="w-full object-contain"
              style={{ maxHeight: 'calc(100vh - 80px)' }}
              priority
            />
            <div className="w-[260px] bg-[#fff200] rounded-full py-2 px-4 flex flex-col items-center shadow-2xl" style={{ marginTop: '-22%' }}>
              <span className="text-black font-black text-sm uppercase tracking-wide leading-tight">MR. TUSHAR GHONE</span>
              <span className="text-black/70 font-bold text-[8px] uppercase tracking-wider leading-none mt-0.5">SEBI REGISTERED RESEARCH ANALYST</span>
            </div>
          </div>
        </div>

        {/* RIGHT — Content */}
        <div className="flex-1 flex flex-col justify-center pr-16 pl-8">

          {/* Headline */}
          <div className="mt-4">
            <h1 className="text-[44px] xl:text-[54px] font-black leading-[1.05] tracking-tight">
              Nifty & Sensex <span className="text-[#a3e635]">Options</span>
            </h1>
            <h2 className="text-[44px] xl:text-[54px] font-black text-[#a3e635] leading-[1.05]">Trades</h2>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline mt-2 gap-1">
            <span className="text-[68px] xl:text-[80px] leading-none font-black text-[#a3e635] tracking-tighter">₹59</span>
            <span className="text-[52px] xl:text-[62px] leading-none font-black text-[#a3e635]">/</span>
            <span className="text-[26px] xl:text-[30px] font-black text-white ml-2">1 Trade <span className="text-white/40 text-lg">**</span></span>
          </div>

          {/* CTA */}
          <div className="mt-4 w-full max-w-[340px]">
            <button
              onClick={scrollToForm}
              className="w-full bg-red-600 hover:bg-red-700 transition-colors text-white text-xl font-black py-3.5 rounded-2xl shadow-[0_6px_30px_rgba(185,28,28,0.5)] uppercase tracking-wide"
            >
              JOIN NOW
            </button>
          </div>

          {/* Feature cards — 2×2 grid */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 w-full max-w-[440px]">
            {[
              { icon: '/icon1.png', text: 'SEBI Registered RA Calls' },
              { icon: '/icon2.png', text: 'Min 4–5 Trades Daily' },
              { icon: '/icon3.png', text: 'Dedicated Customer Support' },
              { icon: '/icon4.png', text: 'Entry, Stoploss & Exit' },
            ].map(({ icon, text }) => (
              <div key={text} className="bg-white/10 border border-white/15 rounded-xl p-2.5 flex items-center gap-2.5 min-h-[50px]">
                <Image src={icon} alt="icon" width={24} height={24} className="object-contain shrink-0" />
                <p className="text-[11px] text-white/90 font-bold leading-tight">{text}</p>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>

      {/* Desktop Form Section */}
      <div id="desktop-form" className="hidden lg:flex w-full bg-[#f0f2f5] py-20 px-16 justify-center">
        <div className="w-full max-w-6xl flex items-center gap-20">

          {/* Left — Why join */}
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#0e3c2a] mb-3">Why Join TG Levels?</p>
              <h2 className="text-[44px] xl:text-[52px] font-black text-[#0e3c2a] leading-tight">
                Trade Smarter,<br />Earn <span className="text-[#b52222]">Every Day</span>
              </h2>
            </div>
            <p className="text-[16px] text-[#4b5563] leading-relaxed max-w-sm">
              Get SEBI-registered research calls with precise entry, stoploss, and exit levels — delivered every trading day.
            </p>
            <ul className="flex flex-col gap-3.5">
              {[
                'Minimum 4–5 live trades delivered daily',
                'Precise Entry, Stoploss & Exit levels',
                'Backed by a SEBI Registered Research Analyst',
                'Dedicated customer support team',
                'Start for just ₹59 per trade',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-[15px] text-[#1a1a1a] font-semibold">
                  <span className="w-6 h-6 rounded-full bg-[#0e3c2a] flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 text-white" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-[14px] text-[#4b5563] font-semibold">
                <span className="text-[#0e3c2a] font-black text-lg">30,000+</span> traders already joined
              </p>
            </div>
          </div>

          {/* Right — Form card */}
          <div className="w-[440px] shrink-0 bg-white rounded-[28px] shadow-2xl px-9 py-10 flex flex-col items-center">
            <div className="self-end -mt-6 -mr-5 w-10 h-10 rounded-full bg-[#e8ecf0] opacity-60 mb-2" />
            <h2 className="text-[34px] font-black text-[#0f1923] text-center leading-tight mb-2">Join Us Now</h2>
            <p className="text-[15px] text-[#6b7280] text-center leading-snug mb-7 px-2">Enter your details to receive the next active signal.</p>
            <div className="w-full mb-5">
              <label className="block text-[15px] font-bold text-[#0f1923] mb-2">Full Name</label>
              <input type="text" placeholder="e.g. Arjun Mehta" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-[#eef0f8] rounded-2xl px-5 py-4 text-[15px] text-[#0f1923] placeholder-[#a0a8c0] outline-none border-none focus:ring-2 focus:ring-[#063a1f]/30" />
            </div>
            <div className="w-full mb-7">
              <label className="block text-[15px] font-bold text-[#0f1923] mb-2">Phone Number</label>
              <input type="tel" inputMode="numeric" maxLength={10} placeholder="00000 00000" value={phone} onChange={(e) => handlePhoneChange(e.target.value)} className="w-full bg-[#eef0f8] rounded-2xl px-5 py-4 text-[15px] text-[#0f1923] placeholder-[#a0a8c0] outline-none border-none focus:ring-2 focus:ring-[#063a1f]/30" />
            </div>
            <button onClick={handleSubmit} disabled={loading} className="w-full bg-[#063a1f] hover:bg-[#0a5230] disabled:opacity-60 text-white text-[20px] font-black rounded-2xl py-4 shadow-md transition-colors mb-5">{loading ? 'Submitting...' : 'Register Now'}</button>
            <div className="flex items-start gap-2 px-1">
              <svg className="w-4 h-4 text-[#6b7280] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-[12px] text-[#6b7280] leading-snug">No spam. Your details are secure &amp; encrypted.</p>
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}

function FeatureCard({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="bg-[#e8efeb] rounded-xl p-2.5 flex items-center gap-2 shadow-sm border border-white/20 min-h-[54px]">
      <div className="shrink-0 relative w-7 h-7 flex items-center justify-center">
        <Image src={icon} alt="icon" width={28} height={28} style={{ width: 'auto', height: 'auto' }} />
      </div>
      <p className="text-[10px] text-[#0a3a22] font-extrabold leading-tight">{text}</p>
    </div>
  );
}