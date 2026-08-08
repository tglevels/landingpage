'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { getLandingPageDisplay } from '../../lib/analytics/getLandingPageDisplays';
/* ─── Types ─── */
type Submission = {
  index: number;

  leadId: string;
  touchpointId: string;

  fullName: string;
  phone: string;

  timestamp: string;
  createdAtRaw: string;

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

  landingPage: string;
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

function getUtmId(submission: Submission): string {
  if (submission.utmId?.trim()) return submission.utmId.trim();
  if (!submission.landingPageUrl) return '';
  try {
    const url = new URL(submission.landingPageUrl);
    return url.searchParams.get('utm_id') || url.searchParams.get('utmId') || '';
  } catch {
    return '';
  }
}

/*
 * UI-only display name. The stored fullName is
 * never modified; "PWA Lead" is a presentation
 * fallback, not the person's real name.
 */
function getDisplayName(row: Submission): string {
  const name = row.fullName?.trim();

  if (name) return name;

  if (
    row.sourceType === 'pwa' ||
    row.formSource === 'tg_levels_lite_pwa'
  ) {
    return 'PWA Lead';
  }

  return 'Name unavailable';
}

function getAvatarText(row: Submission): string {
  const displayName = getDisplayName(row);

  return displayName === 'PWA Lead'
    ? 'P'
    : displayName.charAt(0).toUpperCase();
}

type PlatformData = { platform: string; leads: number; percentage: number };
type CampaignData = { campaign: string; platform: string; leads: number };
type AdData = { ad: string; campaign: string; platform: string; leads: number };
type LandingPageData = {
  key: string;
  path: string;
  url: string;
  displayUrl: string;
  leads: number;
};
type ChatMessage = { role: 'user' | 'assistant'; text: string };

type SeriesKey = 'Total' | 'Google' | 'Meta' | 'YouTube' | 'Direct' | 'Legacy';

type ChartPoint = {
  label: string;
  Total: number;
  Google: number;
  Meta: number;
  YouTube: number;
  Direct: number;
  Legacy: number;
};

/* ─── Constants ─── */
const PLATFORM_COLORS: Record<string, string> = {
  Google: '#09c99b',
  Meta: '#0f766e',
  YouTube: '#ff5f91',
  Direct: '#687086',
  Legacy: '#64748b',
  Other: '#9aa1b2',
};

const SERIES_CONFIG: Record<SeriesKey, { label: string; color: string }> = {
  Total: { label: 'Total', color: '#0f766e' },
  Google: { label: 'Google', color: '#09c99b' },
  Meta: { label: 'Meta', color: '#0f766e' },
  YouTube: { label: 'YouTube', color: '#ff5f91' },
  Direct: { label: 'Direct', color: '#687086' },
  Legacy: { label: 'Legacy', color: '#64748b' },
};

const RANGE_OPTIONS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Custom Range', value: 'custom' },
  { label: 'All Time', value: 'all' },
];

const LEADS_PER_PAGE = 10;

/* ─── Helper for Smooth SVG Curve Paths ─── */
function getSmoothPath(coords: Array<{ x: number; y: number }>) {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  let path = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? i : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

type IconName =
  | 'overview'
  | 'platforms'
  | 'campaigns'
  | 'ads'
  | 'pages'
  | 'leads'
  | 'chat'
  | 'search'
  | 'collapse'
  | 'expand'
  | 'download'
  | 'interactions'
  | 'users'
  | 'target'
  | 'globe'
  | 'close'
  | 'calendar';

function Icon({
  name,
  size = 18,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.4" />
        <rect x="14" y="3" width="7" height="7" rx="1.4" />
        <rect x="3" y="14" width="7" height="7" rx="1.4" />
        <rect x="14" y="14" width="7" height="7" rx="1.4" />
      </>
    ),
    platforms: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18" />
        <path d="M12 3a14 14 0 0 0 0 18" />
      </>
    ),
    campaigns: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M16.5 7.5 21 3" />
        <path d="M17 3h4v4" />
      </>
    ),
    ads: (
      <>
        <path d="m3 11 14-6v14L3 13z" />
        <path d="M3 11v2" />
        <path d="m7 14 1.5 5h3L10 13" />
        <path d="M20 9v6" />
      </>
    ),
    pages: (
      <>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </>
    ),
    leads: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    chat: (
      <>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        <path d="M8 10h.01" />
        <path d="M12 10h.01" />
        <path d="M16 10h.01" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    collapse: (
      <>
        <path d="m15 18-6-6 6-6" />
        <path d="M21 12H9" />
      </>
    ),
    expand: (
      <>
        <path d="m9 18 6-6-6-6" />
        <path d="M3 12h12" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    interactions: (
      <>
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19V3" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v3" />
        <path d="M21 12h-3" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c3 3.2 3 14.8 0 18" />
        <path d="M12 3c-3 3.2-3 14.8 0 18" />
      </>
    ),
    close: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6 6 18" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h18" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

/* ─── Pagination Component ─── */
function LeadsPagination({
  currentPage,
  totalPages,
  firstVisibleLead,
  lastVisibleLead,
  totalLeads,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  firstVisibleLead: number;
  lastVisibleLead: number;
  totalLeads: number;
  onPageChange: (page: number) => void;
}) {
  if (totalLeads === 0) {
    return null;
  }

  const visiblePages: number[] = [];

  const startPage = Math.max(1, currentPage - 2);

  const endPage = Math.min(totalPages, startPage + 4);

  for (let page = startPage; page <= endPage; page += 1) {
    visiblePages.push(page);
  }

  return (
    <div style={s.paginationContainer}>
      <span style={s.paginationSummary}>
        Showing {firstVisibleLead}–{lastVisibleLead} of {totalLeads} leads
      </span>

      <div style={s.pagination}>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          style={currentPage === 1 ? s.pageButtonDisabled : s.pageButton}
        >
          Previous
        </button>

        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              style={currentPage === 1 ? s.pageNumberActive : s.pageNumber}
            >
              1
            </button>

            {startPage > 2 && <span style={s.paginationDots}>…</span>}
          </>
        )}

        {visiblePages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            style={currentPage === page ? s.pageNumberActive : s.pageNumber}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span style={s.paginationDots}>…</span>}

            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              style={currentPage === totalPages ? s.pageNumberActive : s.pageNumber}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          style={currentPage === totalPages ? s.pageButtonDisabled : s.pageButton}
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function Dashboard() {
  const [data, setData] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [newCount, setNewCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const prevLengthRef = useRef(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [range, setRange] = useState('all');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [lpFilter, setLpFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeSeries, setActiveSeries] = useState<Record<SeriesKey, boolean>>({
    Total: true,
    Google: true,
    Meta: true,
    YouTube: true,
    Direct: true,
    Legacy: true,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<Submission | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Hi! Ask me anything about your marketing data.' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [activeSection, setActiveSection] = useState<
    'overview' | 'platforms' | 'campaigns' | 'ads' | 'pages' | 'leads'
  >('overview');

  /* ── Live updates (polling) ── */
  useEffect(() => {
    /*
     * SSE cannot outlive Vercel's function duration cap,
     * so the dashboard polls a version fingerprint instead
     * and only pulls rows when the data actually changed.
     */
    const POLL_INTERVAL_MS = 10000;

    let cancelled = false;
    let version = '';
    let badgeTimer: ReturnType<typeof setTimeout> | null = null;

    const applyRows = (rows: Submission[]) => {
      setData(rows);
      setLastUpdated(
        new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      );

      if (prevLengthRef.current > 0 && rows.length > prevLengthRef.current) {
        setNewCount(rows.length - prevLengthRef.current);

        /*
         * New leads appear at the top,
         * therefore return to page 1.
         */
        setCurrentPage(1);

        if (badgeTimer) clearTimeout(badgeTimer);
        badgeTimer = setTimeout(() => setNewCount(0), 3500);
      }

      prevLengthRef.current = rows.length;
    };

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/submissions/live?since=${encodeURIComponent(version)}`,
          { cache: 'no-store' }
        );

        if (res.status === 401) {
          window.location.href = '/dashboard/login';
          return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const payload: {
          version: string;
          changed: boolean;
          rows?: Submission[];
        } = await res.json();

        if (cancelled) return;

        if (payload.changed && payload.rows) {
          applyRows(payload.rows);
        }

        version = payload.version;
        setConnected(true);
      } catch {
        if (!cancelled) setConnected(false);
      } finally {
        /* Always clear the spinner, even if the first poll failed. */
        if (!cancelled) setLoading(false);
      }
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
      if (badgeTimer) clearTimeout(badgeTimer);
    };
  }, []);

  /* ── Chat ── */
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const question = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: question }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/analytics/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.answer || data.error || 'Something went wrong.' },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Network error. Please try again.' },
      ]);
    }
    setChatLoading(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  /* ── Filter data based on date range ── */
  const filterByDateRange = (submissions: Submission[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return submissions.filter((s) => {
      const submissionDate = new Date(s.createdAtRaw);
      switch (range) {
        case 'today':
          return submissionDate >= today;
        case 'yesterday': {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return submissionDate >= yesterday && submissionDate < today;
        }
        case '7d': {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return submissionDate >= sevenDaysAgo;
        }
        case '30d': {
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return submissionDate >= thirtyDaysAgo;
        }
        case 'custom': {
          if (!customFromDate && !customToDate) return true;

          const fromDate = customFromDate ? new Date(customFromDate) : null;
          const toDate = customToDate ? new Date(customToDate) : null;

          if (fromDate && toDate) {
            // Set toDate to end of day
            toDate.setHours(23, 59, 59, 999);
            return submissionDate >= fromDate && submissionDate <= toDate;
          } else if (fromDate) {
            return submissionDate >= fromDate;
          } else if (toDate) {
            toDate.setHours(23, 59, 59, 999);
            return submissionDate <= toDate;
          }
          return true;
        }
        case 'all':
        default:
          return true;
      }
    });
  };

  /* ── Apply all filters ── */
  const applyFilters = (submissions: Submission[]) => {
    let filtered = filterByDateRange(submissions);
    if (platformFilter !== 'all') {
      filtered = filtered.filter((s) => s.platform === platformFilter);
    }
    if (campaignFilter !== 'all') {
      filtered = filtered.filter((s) => s.campaign === campaignFilter);
    }
    if (lpFilter !== 'all') {
      filtered = filtered.filter(
        (submission) => {
          const storedUrl =
            submission.landingPageUrl?.trim() ||
            '';

          const storedPath =
            submission.landingPage?.trim() ||
            '';

          const fallbackUrl =
            storedUrl ||
            (
              (!storedPath ||
                storedPath === '/') &&
                submission.referrer?.trim()
                ? submission.referrer.trim()
                : ''
            );

          const displayUrl =
            getLandingPageDisplay(
              fallbackUrl,
              storedPath
            );

          return displayUrl === lpFilter;
        }
      );
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.fullName.toLowerCase().includes(query) ||
          s.phone.includes(query) ||
          s.campaign?.toLowerCase().includes(query) ||
          s.utmCampaign?.toLowerCase().includes(query)
      );
    }
    return filtered;
  };

  const filteredData = applyFilters(data);

  /* Build analytics from touchpoint data */
  const platformMap = filteredData.reduce<Record<string, number>>((acc, submission) => {
    const platform = submission.platform?.trim() || 'Direct';
    acc[platform] = (acc[platform] || 0) + 1;
    return acc;
  }, {});

  const totalPlatformInteractions = Object.values(platformMap).reduce((total, count) => total + count, 0);

  const platforms: PlatformData[] = Object.entries(platformMap)
    .map(([platform, leads]) => ({
      platform,
      leads,
      percentage: totalPlatformInteractions > 0 ? (leads / totalPlatformInteractions) * 100 : 0,
    }))
    .sort((a, b) => b.leads - a.leads);

  const campaignMap = filteredData.reduce<Record<string, { campaign: string; platform: string; leads: number }>>(
    (acc, submission) => {
      const campaign = submission.utmCampaign?.trim() || submission.campaign?.trim() || 'Unassigned Campaign';
      const platform = submission.platform?.trim() || 'Direct';
      const key = `${platform}::${campaign}`;
      if (!acc[key]) {
        acc[key] = { campaign, platform, leads: 0 };
      }
      acc[key].leads += 1;
      return acc;
    },
    {}
  );

  const campaigns: CampaignData[] = Object.values(campaignMap).sort((a, b) => b.leads - a.leads);

  const adMap = filteredData.reduce<Record<string, { ad: string; campaign: string; platform: string; leads: number }>>(
    (acc, submission) => {
      const ad = submission.utmContent?.trim() || 'Unassigned Ad';
      const campaign = submission.utmCampaign?.trim() || submission.campaign?.trim() || 'Unassigned Campaign';
      const platform = submission.platform?.trim() || 'Direct';
      const key = [platform, campaign, ad].join('::');
      if (!acc[key]) {
        acc[key] = { ad, campaign, platform, leads: 0 };
      }
      acc[key].leads += 1;
      return acc;
    },
    {}
  );

  const ads: AdData[] = Object.values(adMap).sort((a, b) => b.leads - a.leads);

  /*
  * Historical imports do not contain genuine landing-page information.
  * Exclude them from Landing Page Performance so that they do not all
  * appear under "/".
  */
  const landingPageSourceRows = filteredData.filter(
    (submission) =>
      submission.sourceType !== 'legacy_import'
  );

  const landingPageMap =
    landingPageSourceRows.reduce<
      Record<string, LandingPageData>
    >((accumulator, submission) => {
      const storedUrl =
        submission.landingPageUrl?.trim() || '';

      const storedPath =
        submission.landingPage?.trim() || '';

      /*
       * Some external integrations may not send landingPageUrl yet,
       * but may send the originating page in referrer.
       *
       * Preferred order:
       * 1. Actual landing-page URL
       * 2. Actual non-root path
       * 3. Referrer URL as fallback
       */
      let sourceUrl = storedUrl;

      if (
        !sourceUrl &&
        (!storedPath || storedPath === '/') &&
        submission.referrer?.trim()
      ) {
        sourceUrl = submission.referrer.trim();
      }

      const displayUrl =
        getLandingPageDisplay(
          sourceUrl,
          storedPath
        );

      /*
       * Skip rows where no useful page information exists.
       * This prevents another meaningless "/" aggregate.
       */
      if (!displayUrl) {
        return accumulator;
      }

      const groupingKey =
        displayUrl.toLowerCase();

      if (!accumulator[groupingKey]) {
        let resolvedPath = storedPath;

        if (sourceUrl) {
          try {
            resolvedPath =
              new URL(sourceUrl).pathname ||
              '/';
          } catch {
            resolvedPath =
              storedPath || '/';
          }
        }

        accumulator[groupingKey] = {
          key: groupingKey,
          path: resolvedPath || '/',
          url: sourceUrl,
          displayUrl,
          leads: 0,
        };
      }

      accumulator[groupingKey].leads += 1;

      return accumulator;
    }, {});

  const landingPages: LandingPageData[] =
    Object.values(landingPageMap).sort(
      (first, second) =>
        second.leads - first.leads
    );

  const uniqueLeadCount = new Set(filteredData.map((s) => s.leadId || s.phone)).size;

  const filteredCampaigns = campaigns.filter((c) => {
    if (platformFilter !== 'all' && c.platform !== platformFilter) return false;
    return true;
  });

  const filteredAds = ads.filter((a) => {
    if (platformFilter !== 'all' && a.platform !== platformFilter) return false;
    if (campaignFilter !== 'all' && a.campaign !== campaignFilter) return false;
    return true;
  });

  /*
   * Sort newest leads first.
   * createdAtRaw is used because timestamp is formatted display text.
   */
  const filteredLeads = [...filteredData].sort((firstLead, secondLead) => {
    const firstTime = new Date(firstLead.createdAtRaw).getTime();

    const secondTime = new Date(secondLead.createdAtRaw).getTime();

    const safeFirstTime = Number.isNaN(firstTime) ? 0 : firstTime;

    const safeSecondTime = Number.isNaN(secondTime) ? 0 : secondTime;

    return safeSecondTime - safeFirstTime;
  });

  /*
   * Pagination
   */
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / LEADS_PER_PAGE));

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * LEADS_PER_PAGE;

  const endIndex = startIndex + LEADS_PER_PAGE;

  const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

  const firstVisibleLead = filteredLeads.length === 0 ? 0 : startIndex + 1;

  const lastVisibleLead = Math.min(endIndex, filteredLeads.length);

  const uniquePlatforms = [...new Set(data.map((d) => d.platform))].filter(Boolean);
  const uniqueCampaigns = [...new Set(data.map((d) => d.campaign))].filter(Boolean);
  const uniqueLPs = [
    ...new Set(
      data
        .filter(
          (submission) =>
            submission.sourceType !==
            'legacy_import'
        )
        .map((submission) => {
          const storedUrl =
            submission.landingPageUrl?.trim() ||
            '';

          const storedPath =
            submission.landingPage?.trim() ||
            '';

          const fallbackUrl =
            storedUrl ||
            (
              (!storedPath ||
                storedPath === '/') &&
                submission.referrer?.trim()
                ? submission.referrer.trim()
                : ''
            );

          return getLandingPageDisplay(
            fallbackUrl,
            storedPath
          );
        })
        .filter(Boolean)
    ),
  ].sort();

  const resetLeadPage = () => {
    setCurrentPage(1);
  };

  const handleDownload = () => {
    const params =
      new URLSearchParams();

    params.set(
      'range',
      range
    );

    if (
      platformFilter !== 'all'
    ) {
      params.set(
        'platform',
        platformFilter
      );
    }

    if (
      campaignFilter !== 'all'
    ) {
      params.set(
        'campaign',
        campaignFilter
      );
    }

    if (
      lpFilter !== 'all'
    ) {
      params.set(
        'landingPage',
        lpFilter
      );
    }

    if (
      searchQuery.trim()
    ) {
      params.set(
        'search',
        searchQuery.trim()
      );
    }

    if (
      range === 'custom'
    ) {
      if (
        customFromDate
      ) {
        params.set(
          'customFrom',
          customFromDate
        );
      }

      if (
        customToDate
      ) {
        params.set(
          'customTo',
          customToDate
        );
      }
    }

    window.location.href =
      `/api/export?${params.toString()}`;
  };

  const toggleSeries = (key: SeriesKey) => {
    setActiveSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ── Time-Series Cumulative Calculation for Chart ── */
  const getChartData = () => {
    const list = [...filteredData].sort((a, b) => {
      const tA = new Date(a.createdAtRaw).getTime();
      const tB = new Date(b.createdAtRaw).getTime();
      return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
    });

    if (list.length === 0) {
      return {
        points: [
          { label: 'Start', Total: 0, Google: 0, Meta: 0, YouTube: 0, Direct: 0, Legacy: 0 },
          { label: 'Current', Total: 0, Google: 0, Meta: 0, YouTube: 0, Direct: 0, Legacy: 0 },
        ],
        maxY: 5,
      };
    }

    let cumTotal = 0,
      cumGoogle = 0,
      cumMeta = 0,
      cumYouTube = 0,
      cumDirect = 0,
      cumLegacy = 0;

    const firstDate = new Date(list[0].createdAtRaw);
    const firstLabel = isNaN(firstDate.getTime())
      ? 'Start'
      : firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const points: ChartPoint[] = [{ label: firstLabel, Total: 0, Google: 0, Meta: 0, YouTube: 0, Direct: 0, Legacy: 0 }];

    list.forEach((sub, i) => {
      cumTotal++;
      const p = (sub.platform || '').toLowerCase();
      if (p.includes('google')) cumGoogle++;
      else if (p.includes('meta') || p.includes('facebook') || p.includes('instagram')) cumMeta++;
      else if (p.includes('youtube')) cumYouTube++;
      else if (p.includes('legacy')) cumLegacy++;
      else cumDirect++;

      const d = new Date(sub.createdAtRaw);
      const lbl = isNaN(d.getTime())
        ? `#${i + 1}`
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      points.push({
        label: lbl,
        Total: cumTotal,
        Google: cumGoogle,
        Meta: cumMeta,
        YouTube: cumYouTube,
        Direct: cumDirect,
        Legacy: cumLegacy,
      });
    });

    let sampledPoints = points;
    if (points.length > 7) {
      const step = (points.length - 1) / 6;
      sampledPoints = [];
      for (let i = 0; i < 7; i++) {
        const idx = Math.round(i * step);
        sampledPoints.push(points[idx]);
      }
    }

    const maxVal = Math.max(1, cumTotal);
    const maxY = Math.max(5, Math.ceil(maxVal * 1.2));

    return {
      points: sampledPoints,
      maxY: maxY <= 5 ? 5 : Math.ceil(maxY / 5) * 5,
    };
  };

  const chartInfo = getChartData();
  const svgWidth = 800;
  const svgHeight = 320;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;
  const graphWidth = svgWidth - padLeft - padRight;
  const graphHeight = svgHeight - padTop - padBottom;

  const numPoints = chartInfo.points.length;
  const getX = (idx: number) => padLeft + (idx / Math.max(1, numPoints - 1)) * graphWidth;
  const getY = (val: number) => padTop + graphHeight - (val / chartInfo.maxY) * graphHeight;

  return (
    <div className="dashboard-shell" style={s.shell}>
      {/* Sidebar */}
      <aside
        className={`dashboard-sidebar ${sidebarCollapsed ? 'is-collapsed' : ''}`}
        style={{
          ...s.sidebar,
          width: sidebarCollapsed ? '84px' : '260px',
          padding: sidebarCollapsed ? '22px 14px' : '24px 20px',
        }}
      >
        <div
          style={{
            ...s.sidebarHeader,
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          }}
        >
          <Image src="/tg-logo.jpeg" alt="TG Levels" width={44} height={44} style={s.logoImage} />

          {!sidebarCollapsed && (
            <div style={s.brandInfo}>
              <div style={s.brandName}>Marketing Intelligence</div>
              <div style={s.brandCaption}>Attribution Dashboard</div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setSidebarCollapsed((value) => !value)}
          style={{
            ...s.collapseButton,
            alignSelf: sidebarCollapsed ? 'center' : 'flex-end',
          }}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name={sidebarCollapsed ? 'expand' : 'collapse'} size={17} />
        </button>

        <button
          type="button"
          onClick={handleDownload}
          style={{
            ...s.btnPrimary,
            padding: sidebarCollapsed ? '12px' : '12px 16px',
            justifyContent: 'center',
          }}
          title="Export report"
        >
          <Icon name="download" size={18} />
          {!sidebarCollapsed && <span>Export Report</span>}
        </button>

        <nav style={s.nav}>
          {[
            { key: 'overview', label: 'Overview', icon: 'overview' as IconName },
            { key: 'platforms', label: 'Platforms', icon: 'platforms' as IconName },
            { key: 'campaigns', label: 'Campaigns', icon: 'campaigns' as IconName },
            { key: 'ads', label: 'Ads', icon: 'ads' as IconName },
            { key: 'pages', label: 'Pages', icon: 'pages' as IconName },
            { key: 'leads', label: 'Leads', icon: 'leads' as IconName },
          ].map((item) => {
            const isActive = activeSection === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setActiveSection(item.key as 'overview' | 'platforms' | 'campaigns' | 'ads' | 'pages' | 'leads')
                }
                style={{
                  ...(isActive ? s.navItemActive : s.navItem),
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  padding: sidebarCollapsed ? '12px' : '12px 14px',
                }}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span style={s.navIcon}>
                  <Icon name={item.icon} size={19} />
                </span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div style={s.sidebarFooter}>
          <button
            type="button"
            onClick={() => setChatOpen(!chatOpen)}
            style={{
              ...s.navItem,
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              padding: sidebarCollapsed ? '12px' : '12px 14px',
            }}
            title={sidebarCollapsed ? 'Marketing Assistant' : undefined}
          >
            <span style={s.navIcon}>
              <Icon name="chat" size={19} />
            </span>
            {!sidebarCollapsed && <span>Marketing Assistant</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main" style={s.mainArea}>
        {/* Top Header */}
        <div className="topHeader" style={s.topHeader}>
          <div style={s.searchBox}>
            <span style={s.searchIcon}>
              <Icon name="search" size={18} />
            </span>
            <input
              type="text"
              placeholder="Search leads, campaigns, phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                resetLeadPage();
              }}
              style={s.searchInput}
            />
          </div>

          <div style={s.headerRight}>
            {lastUpdated && <span style={s.lastUpdate}>Updated {lastUpdated}</span>}
            <div style={connected ? s.statusLive : s.statusOff}>
              <span style={s.statusDot} />
              {connected ? 'Live' : 'Reconnecting'}
            </div>
            <div style={s.profileCircle}>MA</div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="contentArea" style={s.contentArea}>
          {/* Page Heading */}
          <div style={s.pageHeading}>
            <div>
              <h1 style={s.pageTitle}>Marketing Overview</h1>
              <p style={s.pageSubtitle}>Track campaign performance, lead sources and attribution</p>
            </div>
          </div>

          {/* New lead notification */}
          {newCount > 0 && (
            <div style={s.notification}>
              +{newCount} new lead{newCount > 1 ? 's' : ''} received
            </div>
          )}

          {/* Filters */}
          <div style={s.filterCard}>
            <div className="filterGrid" style={s.filterGrid}>
              <div style={s.filterGroup}>
                <label style={s.filterLabel}>DATE RANGE</label>
                <select style={s.filterSelect} value={range} onChange={(e) => {
                  setRange(e.target.value);
                  resetLeadPage();
                }}>
                  {RANGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {range === 'custom' && (
                <>
                  <div style={s.filterGroup}>
                    <label style={s.filterLabel}>FROM DATE</label>
                    <div style={s.dateInputWrapper}>
                      <Icon name="calendar" size={16} />
                      <input
                        type="date"
                        value={customFromDate}
                        onChange={(e) => {
                          setCustomFromDate(e.target.value);
                          resetLeadPage();
                        }}
                        style={s.dateInput}
                        max={customToDate || undefined}
                      />
                    </div>
                  </div>
                  <div style={s.filterGroup}>
                    <label style={s.filterLabel}>TO DATE</label>
                    <div style={s.dateInputWrapper}>
                      <Icon name="calendar" size={16} />
                      <input
                        type="date"
                        value={customToDate}
                        onChange={(e) => {
                          setCustomToDate(e.target.value);
                          resetLeadPage();
                        }}
                        style={s.dateInput}
                        min={customFromDate || undefined}
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={s.filterGroup}>
                <label style={s.filterLabel}>PLATFORM</label>
                <select
                  style={s.filterSelect}
                  value={platformFilter}
                  onChange={(e) => {
                    setPlatformFilter(e.target.value);
                    resetLeadPage();
                  }}
                >
                  <option value="all">All Platforms</option>
                  {uniquePlatforms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div style={s.filterGroup}>
                <label style={s.filterLabel}>CAMPAIGN</label>
                <select
                  style={s.filterSelect}
                  value={campaignFilter}
                  onChange={(e) => {
                    setCampaignFilter(e.target.value);
                    resetLeadPage();
                  }}
                >
                  <option value="all">All Campaigns</option>
                  {uniqueCampaigns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div style={s.filterGroup}>
                <label style={s.filterLabel}>LANDING PAGE</label>
                <select style={s.filterSelect} value={lpFilter} onChange={(e) => {
                  setLpFilter(e.target.value);
                  resetLeadPage();
                }}>
                  <option value="all">All Pages</option>
                  {uniqueLPs.map((lp) => (
                    <option key={lp} value={lp}>
                      {lp}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Overview Section */}
          {activeSection === 'overview' && (
            <>
              {/* Metric Cards */}
              {loading ? (
                <div className="metricsGrid" style={s.metricsGrid}>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} style={s.metricCard}>
                      <div style={{ ...s.skeletonCell, width: '44px', height: '44px', borderRadius: '10px', marginBottom: '16px', animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />
                      <div style={{ ...s.skeletonCell, width: '60%', height: '28px', marginBottom: '8px', animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />
                      <div style={{ ...s.skeletonCell, width: '80%', height: '14px', animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="metricsGrid" style={s.metricsGrid}>
                  <div style={s.metricCard}>
                    <div style={s.metricHeader}>
                      <div style={{ ...s.metricIcon, background: '#e7f5f3' }}>
                        <span style={{ color: '#0f766e', display: 'flex' }}>
                          <Icon name="interactions" size={20} />
                        </span>
                      </div>
                    </div>
                    <div style={s.metricValue}>{filteredData.length}</div>
                    <div style={s.metricLabel}>Total Interactions</div>
                  </div>

                  <div style={s.metricCard}>
                    <div style={s.metricHeader}>
                      <div style={{ ...s.metricIcon, background: '#e9f8ff' }}>
                        <span style={{ color: '#38bdf8', display: 'flex' }}>
                          <Icon name="users" size={20} />
                        </span>
                      </div>
                    </div>
                    <div style={s.metricValue}>{uniqueLeadCount}</div>
                    <div style={s.metricLabel}>Unique Leads</div>
                  </div>

                  <div style={s.metricCard}>
                    <div style={s.metricHeader}>
                      <div style={{ ...s.metricIcon, background: '#fff0ea' }}>
                        <span style={{ color: '#ff8153', display: 'flex' }}>
                          <Icon name="target" size={20} />
                        </span>
                      </div>
                    </div>
                    <div style={s.metricValue}>{campaigns[0]?.campaign?.substring(0, 15) || 'N/A'}</div>
                    <div style={s.metricLabel}>
                      Top Campaign · {campaigns[0]?.leads || 0} {campaigns[0]?.leads === 1 ? 'lead' : 'leads'}
                    </div>
                  </div>

                  <div style={s.metricCard}>
                    <div style={s.metricHeader}>
                      <div style={{ ...s.metricIcon, background: '#ffeaf1' }}>
                        <span style={{ color: '#ff5f91', display: 'flex' }}>
                          <Icon name="globe" size={20} />
                        </span>
                      </div>
                    </div>
                    <div style={s.metricValue}>{platforms[0]?.platform || 'N/A'}</div>
                    <div style={s.metricLabel}>
                      Top Platform · {platforms[0]?.leads || 0} {platforms[0]?.leads === 1 ? 'lead' : 'leads'}
                    </div>
                  </div>
                </div>
              )}

              {/* Analytics Grid */}
              <div className="analyticsGrid" style={s.analyticsGrid}>
                {/* Lead Growth Chart */}
                <div style={s.chartCard}>
                  <div style={s.chartCardHeader}>
                    <div>
                      <h3 style={s.cardTitle}>Lead Growth Trend</h3>
                      <p style={s.cardSubtitle}>Marketing interactions by platform</p>
                    </div>
                    <div style={s.chartFilters}>
                      {(
                        Object.entries(SERIES_CONFIG) as Array<
                          [SeriesKey, { label: string; color: string }]
                        >
                      ).map(([key, item]) => {
                        const isSelected = activeSeries[key];
                        return (
                          <button
                            key={key}
                            onClick={() => toggleSeries(key)}
                            style={{
                              ...s.chartFilterBtn,
                              ...(isSelected ? { background: '#f8fafc', color: '#172033' } : {}),
                            }}
                          >
                            <span style={{ ...s.chartFilterDot, background: item.color }} />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={s.chartWrapper}>
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto' }}>
                      <defs>
                        {Object.entries(SERIES_CONFIG).map(([key, item]) => (
                          <linearGradient key={`grad-${key}`} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={item.color} stopOpacity="0.12" />
                            <stop offset="100%" stopColor={item.color} stopOpacity="0" />
                          </linearGradient>
                        ))}
                      </defs>

                      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const yVal = Math.round(chartInfo.maxY * (1 - ratio));
                        const yPos = padTop + ratio * graphHeight;
                        return (
                          <g key={`grid-${ratio}`}>
                            <line
                              x1={padLeft}
                              y1={yPos}
                              x2={padLeft + graphWidth}
                              y2={yPos}
                              stroke="#e6eaf0"
                              strokeWidth="1"
                            />
                            <text x={padLeft - 8} y={yPos + 4} textAnchor="end" fontSize="10" fill="#9aa1b2">
                              {yVal}
                            </text>
                          </g>
                        );
                      })}

                      {chartInfo.points.map((pt, idx) => {
                        const xPos = getX(idx);
                        return (
                          <text
                            key={`x-${idx}`}
                            x={xPos}
                            y={padTop + graphHeight + 20}
                            textAnchor="middle"
                            fontSize="10"
                            fill="#687086"
                          >
                            {pt.label}
                          </text>
                        );
                      })}

                      {(
                        Object.entries(SERIES_CONFIG) as Array<
                          [SeriesKey, { label: string; color: string }]
                        >
                      ).map(([key, item]) => {
                        if (!activeSeries[key]) return null;
                        const coords = chartInfo.points.map((pt, idx) => ({
                          x: getX(idx),
                          y: getY(pt[key]),
                        }));
                        const linePath = getSmoothPath(coords);
                        const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${padTop + graphHeight} L ${coords[0].x} ${padTop + graphHeight} Z`;
                        return (
                          <g key={`series-${key}`}>
                            <path d={areaPath} fill={`url(#grad-${key})`} />
                            <path
                              d={linePath}
                              fill="none"
                              stroke={item.color}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {coords.map((c, i) => (
                              <circle
                                key={`dot-${i}`}
                                cx={c.x}
                                cy={c.y}
                                r="3.5"
                                fill="#fff"
                                stroke={item.color}
                                strokeWidth="2"
                              />
                            ))}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Platform Distribution */}
                <div style={s.donutCard}>
                  <h3 style={s.cardTitle}>Leads by Platform</h3>
                  <div style={s.donutCenter}>
                    <div style={s.donutValue}>{filteredData.length}</div>
                    <div style={s.donutLabel}>Total</div>
                  </div>
                  <div style={s.platformList}>
                    {platforms.slice(0, 4).map((p) => (
                      <div key={p.platform} style={s.platformRow}>
                        <div style={s.platformLeft}>
                          <span
                            style={{
                              ...s.platformDot,
                              background: PLATFORM_COLORS[p.platform] || '#9aa1b2',
                            }}
                          />
                          <span style={s.platformName}>{p.platform}</span>
                        </div>
                        <div style={s.platformRight}>
                          <span style={s.platformCount}>{p.leads}</span>
                          <span style={s.platformPercent}>{p.percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Leads */}
              <div style={s.tableCard}>
                <h3 style={s.cardTitle}>Recent Leads</h3>
                <div style={s.tableWrapper}>
                  <table style={s.table} className="dash-table">
                    <thead>
                      <tr>
                        <th style={s.th}>Name</th>
                        <th style={s.th}>Phone</th>
                        <th style={s.th}>Platform</th>
                        <th style={s.th}>Campaign</th>
                        <th style={s.th}>Time</th>
                        <th style={s.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.slice(0, 5).map((row) => (
                        <tr
                          key={
                            row.touchpointId ||
                            `${row.leadId}-${row.createdAtRaw}` ||
                            `${row.phone}-${row.index}`
                          }
                        >
                          <td style={s.td}>
                            <div style={s.leadCell}>
                              <div style={s.avatar}>
                                {getAvatarText(row)}
                              </div>
                              <span>{getDisplayName(row)}</span>
                            </div>
                          </td>
                          <td style={s.td}>{row.phone}</td>
                          <td style={s.td}>
                            <span
                              style={{
                                ...s.platformBadge,
                                background: PLATFORM_COLORS[row.platform] || '#9aa1b2',
                              }}
                            >
                              {row.platform}
                            </span>
                          </td>
                          <td style={s.td}>
                            {row.sourceType === 'legacy_import'
                              ? 'Historical Lead'
                              : row.utmCampaign || row.campaign || 'Organic'}
                          </td>
                          <td style={s.tdMuted}>{row.timestamp}</td>
                          <td style={s.td}>
                            <button onClick={() => setSelectedLead(row)} style={s.btnView}>
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Platforms Section */}
          {activeSection === 'platforms' && (
            <>
              <h2 style={s.sectionTitle}>Platform Performance</h2>
              {platforms.length === 0 ? (
                <div style={s.emptyState}>No platform data found</div>
              ) : (
                <div style={s.platformCardsGrid}>
                  {platforms.map((p) => (
                    <div key={p.platform} style={s.platformPerformanceCard}>
                      <div style={s.platformCardHeader}>
                        <div
                          style={{
                            ...s.platformCardIcon,
                            background: PLATFORM_COLORS[p.platform] || '#9aa1b2',
                          }}
                        >
                          {p.platform.charAt(0)}
                        </div>
                        <div>
                          <div style={s.platformCardName}>{p.platform}</div>
                          <div style={s.platformCardMeta}>
                            {campaigns.filter((c) => c.platform === p.platform).length} campaigns
                          </div>
                        </div>
                      </div>
                      <div style={s.platformCardValue}>{p.leads}</div>
                      <div style={s.platformCardLabel}>interactions</div>
                      <div style={s.platformCardBar}>
                        <div
                          style={{
                            ...s.platformCardBarFill,
                            width: `${p.percentage}%`,
                            background: PLATFORM_COLORS[p.platform] || '#9aa1b2',
                          }}
                        />
                      </div>
                      <div style={s.platformCardPercent}>{p.percentage.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Campaigns Section */}
          {activeSection === 'campaigns' && (
            <>
              <h2 style={s.sectionTitle}>Campaign Performance</h2>
              {filteredCampaigns.length === 0 ? (
                <div style={s.emptyState}>No campaign data found</div>
              ) : (
                <div style={s.tableCard}>
                  <div style={s.tableWrapper}>
                    <table style={s.table} className="dash-table">
                      <thead>
                        <tr>
                          <th style={s.th}>Campaign</th>
                          <th style={s.th}>Platform</th>
                          <th style={s.th}>Interactions</th>
                          <th style={s.th}>Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCampaigns.map((c) => {
                          const share = (c.leads / filteredData.length) * 100;
                          return (
                            <tr key={c.campaign}>
                              <td style={s.tdBold}>{c.campaign}</td>
                              <td style={s.td}>
                                <span
                                  style={{
                                    ...s.platformBadge,
                                    background: PLATFORM_COLORS[c.platform] || '#9aa1b2',
                                  }}
                                >
                                  {c.platform}
                                </span>
                              </td>
                              <td style={s.tdNum}>{c.leads}</td>
                              <td style={s.td}>
                                <div style={s.progressWrapper}>
                                  <div
                                    style={{
                                      ...s.progressBar,
                                      width: `${share}%`,
                                      background: PLATFORM_COLORS[c.platform] || '#9aa1b2',
                                    }}
                                  />
                                </div>
                                <span style={s.progressText}>{share.toFixed(1)}%</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Ads Section */}
          {activeSection === 'ads' && (
            <>
              <h2 style={s.sectionTitle}>Ad Performance</h2>
              {filteredAds.length === 0 ? (
                <div style={s.emptyState}>No ad data found</div>
              ) : (
                <div style={s.tableCard}>
                  <div style={s.tableWrapper}>
                    <table style={s.table} className="dash-table">
                      <thead>
                        <tr>
                          <th style={s.th}>Ad Content</th>
                          <th style={s.th}>Campaign</th>
                          <th style={s.th}>Platform</th>
                          <th style={s.th}>Interactions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAds.map((a, index) => {
                          const adRowKey = [
                            a.platform,
                            a.campaign,
                            a.ad,
                            index,
                          ].join('::');

                          return (
                            <tr key={adRowKey}>
                              <td style={s.tdBold}>
                                {a.ad}
                              </td>

                              <td style={s.td}>
                                {a.campaign}
                              </td>

                              <td style={s.td}>
                                <span
                                  style={{
                                    ...s.platformBadge,
                                    background:
                                      PLATFORM_COLORS[
                                      a.platform
                                      ] || '#9aa1b2',
                                  }}
                                >
                                  {a.platform}
                                </span>
                              </td>

                              <td style={s.tdNum}>
                                {a.leads}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Pages Section */}
          {activeSection === 'pages' && (
            <>
              <h2 style={s.sectionTitle}>
                Landing Page Performance
              </h2>

              {landingPages.length === 0 ? (
                <div style={s.emptyState}>
                  No tracked landing-page data found
                </div>
              ) : (
                <div style={s.tableCard}>
                  <div style={s.tableWrapper}>
                    <table
                      style={s.table}
                      className="dash-table"
                    >
                      <thead>
                        <tr>
                          <th style={s.th}>
                            Landing Page
                          </th>

                          <th style={s.th}>
                            Page Path
                          </th>

                          <th style={s.th}>
                            Interactions
                          </th>

                          <th style={s.th}>
                            Share
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {landingPages.map((lp) => {
                          const totalTrackedPageInteractions =
                            landingPages.reduce(
                              (
                                total,
                                landingPage
                              ) =>
                                total +
                                landingPage.leads,
                              0
                            );

                          const share =
                            totalTrackedPageInteractions > 0
                              ? (
                                lp.leads /
                                totalTrackedPageInteractions
                              ) * 100
                              : 0;

                          return (
                            <tr key={lp.key}>
                              <td style={s.td}>
                                {lp.url ? (
                                  <a
                                    href={lp.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={lp.url}
                                    style={{
                                      color: '#0f766e',
                                      fontSize: '13px',
                                      fontWeight: 600,
                                      textDecoration:
                                        'none',
                                      overflowWrap:
                                        'anywhere',
                                    }}
                                  >
                                    {lp.displayUrl}
                                  </a>
                                ) : (
                                  <span
                                    style={{
                                      color: '#172033',
                                      fontSize: '13px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {lp.displayUrl}
                                  </span>
                                )}
                              </td>

                              <td style={s.tdCode}>
                                <code style={s.code}>
                                  {lp.path || '/'}
                                </code>
                              </td>

                              <td style={s.tdNum}>
                                {lp.leads.toLocaleString()}
                              </td>

                              <td style={s.td}>
                                <div
                                  style={
                                    s.progressWrapper
                                  }
                                >
                                  <div
                                    style={{
                                      ...s.progressBar,
                                      width: `${Math.min(
                                        share,
                                        100
                                      )}%`,
                                      background:
                                        '#0f766e',
                                    }}
                                  />
                                </div>

                                <span
                                  style={s.progressText}
                                >
                                  {share.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Leads Section */}
          {activeSection === 'leads' && (
            <>
              <div style={s.leadsHeader}>
                <div>
                  <h2 style={s.sectionTitle}>Lead Details</h2>

                  <p style={s.sectionSubtitle}>Newest leads are displayed first</p>
                </div>
              </div>

              {loading ? (
                <div style={s.skeletonContainer}>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} style={s.skeletonRow}>
                      <div style={{ ...s.skeletonCell, width: '40%' }} />
                      <div style={{ ...s.skeletonCell, width: '18%' }} />
                      <div style={{ ...s.skeletonCell, width: '14%' }} />
                      <div style={{ ...s.skeletonCell, width: '18%' }} />
                    </div>
                  ))}
                </div>
              ) : filteredLeads.length === 0 ? (
                <div style={s.emptyState}>
                  <div style={s.emptyIcon}>📭</div>
                  <div style={s.emptyTitle}>No leads found</div>
                  <div style={s.emptyMessage}>Try adjusting your filters or date range</div>
                </div>
              ) : (
                <>
                  <div style={s.tableCard}>
                    <div style={s.tableWrapper}>
                      <table style={s.table} className="dash-table">
                        <thead>
                          <tr>
                            <th style={s.th}>Lead</th>
                            <th style={s.th}>Phone</th>
                            <th style={s.th}>Platform</th>
                            <th style={s.th}>Campaign</th>
                            <th style={s.th}>Medium</th>
                            <th style={s.th}>Landing Page</th>
                            <th style={s.th}>Time</th>
                            <th style={s.th}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedLeads.map((row) => (
                            <tr
                              key={
                                row.touchpointId ||
                                `${row.leadId}-${row.createdAtRaw}` ||
                                `${row.phone}-${row.index}`
                              }
                            >
                              <td style={s.td}>
                                <div style={s.leadCell}>
                                  <div style={s.avatar}>
                                    {getAvatarText(row)}
                                  </div>
                                  <div>
                                    <div style={s.leadName}>{getDisplayName(row)}</div>
                                    {row.sourceType && <div style={s.leadMeta}>{row.sourceType}</div>}
                                  </div>
                                </div>
                              </td>
                              <td style={s.td}>{row.phone}</td>
                              <td style={s.td}>
                                <span
                                  style={{
                                    ...s.platformBadge,
                                    background: PLATFORM_COLORS[row.platform] || '#9aa1b2',
                                  }}
                                >
                                  {row.platform}
                                </span>
                              </td>
                              <td style={s.td}>
                                {row.sourceType === 'legacy_import'
                                  ? 'Historical Lead'
                                  : row.utmCampaign || row.campaign || 'Organic'}
                              </td>
                              <td style={s.td}>
                                {row.sourceType === 'legacy_import' ? '—' : row.utmMedium || '—'}
                              </td>
                              <td style={s.tdCode}>
                                {row.sourceType === 'legacy_import' ? (
                                  <span style={s.notAvailable}>Not available</span>
                                ) : (
                                  <code style={s.code}>{row.landingPage || '/'}</code>
                                )}
                              </td>
                              <td style={s.tdMuted}>{row.timestamp}</td>
                              <td style={s.td}>
                                <button onClick={() => setSelectedLead(row)} style={s.btnView}>
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="desktop-pagination">
                    <LeadsPagination
                      currentPage={safeCurrentPage}
                      totalPages={totalPages}
                      firstVisibleLead={firstVisibleLead}
                      lastVisibleLead={lastVisibleLead}
                      totalLeads={filteredLeads.length}
                      onPageChange={(page) => {
                        setCurrentPage(page);

                        window.scrollTo({
                          top: 0,
                          behavior: 'smooth',
                        });
                      }}
                    />
                  </div>

                  {/* Mobile cards */}
                  <div className="dash-cards">
                    {paginatedLeads.map((row) => (
                      <div
                        key={
                          row.touchpointId ||
                          `${row.leadId}-${row.createdAtRaw}` ||
                          `${row.phone}-${row.index}`
                        }
                        style={s.mobileCard}
                      >
                        <div style={s.mobileCardHeader}>
                          <div style={s.avatar}>
                            {getAvatarText(row)}
                          </div>
                          <div style={s.mobileCardInfo}>
                            <div style={s.mobileName}>{getDisplayName(row)}</div>
                            <div style={s.mobilePhone}>{row.phone}</div>
                          </div>
                          <span
                            style={{
                              ...s.platformBadge,
                              background: PLATFORM_COLORS[row.platform] || '#9aa1b2',
                            }}
                          >
                            {row.platform}
                          </span>
                        </div>
                        <div style={s.mobileCardBody}>
                          {(row.utmCampaign || row.campaign) && (
                            <div style={s.mobileMeta}>
                              Campaign:{' '}
                              <strong>
                                {row.sourceType === 'legacy_import'
                                  ? 'Historical Lead'
                                  : row.utmCampaign || row.campaign || 'Organic'}
                              </strong>
                            </div>
                          )}
                          <div style={s.mobileTime}>{row.timestamp}</div>
                        </div>
                        <button onClick={() => setSelectedLead(row)} style={s.mobileViewButton}>
                          View Details
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="dash-cards">
                    <LeadsPagination
                      currentPage={safeCurrentPage}
                      totalPages={totalPages}
                      firstVisibleLead={firstVisibleLead}
                      lastVisibleLead={lastVisibleLead}
                      totalLeads={filteredLeads.length}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* Lead Details Drawer */}
      {selectedLead && (
        <div style={s.drawerOverlay} onClick={() => setSelectedLead(null)}>
          <div style={s.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={s.drawerHeader}>
              <div>
                <h3 style={s.drawerTitle}>Lead Attribution Details</h3>
                <p style={s.drawerSubtitle}>
                  {getDisplayName(selectedLead)} · {selectedLead.phone}
                </p>
              </div>
              <button onClick={() => setSelectedLead(null)} style={s.drawerClose}>
                ×
              </button>
            </div>

            <div style={s.drawerBody}>
              {selectedLead.sourceType === 'legacy_import' && (
                <div style={s.legacyNotice}>
                  This historical lead was imported from the previous database. The original record did not contain campaign, UTM, landing-page, browser, or device attribution.
                </div>
              )}
              <div style={s.drawerSection}>
                <h4 style={s.drawerSectionTitle}>Lead Information</h4>
                <div style={s.detailsGrid}>
                  <DetailItem
                    label="Full Name"
                    value={
                      selectedLead.fullName?.trim() ||
                      'Not collected'
                    }
                  />
                  <DetailItem label="Phone" value={selectedLead.phone} />
                  <DetailItem label="Lead ID" value={selectedLead.leadId} />
                  <DetailItem label="Touchpoint ID" value={selectedLead.touchpointId} />
                </div>
              </div>

              <div style={s.drawerSection}>
                <h4 style={s.drawerSectionTitle}>Marketing Attribution</h4>
                <div style={s.detailsGrid}>
                  <DetailItem label="Platform" value={selectedLead.platform} />
                  <DetailItem label="UTM Source" value={selectedLead.utmSource} />
                  <DetailItem label="UTM Medium" value={selectedLead.utmMedium} />
                  <DetailItem label="UTM Campaign" value={selectedLead.utmCampaign || selectedLead.campaign} />
                  <DetailItem label="UTM Content" value={selectedLead.utmContent} />
                  <DetailItem label="UTM Term" value={selectedLead.utmTerm} />
                  <DetailItem label="UTM ID" value={getUtmId(selectedLead)} copyable />
                  <DetailItem label="GCLID" value={selectedLead.gclid} copyable />
                  <DetailItem label="FBCLID" value={selectedLead.fbclid} copyable />
                </div>
              </div>

              <div style={s.drawerSection}>
                <h4 style={s.drawerSectionTitle}>Page Information</h4>
                <div style={s.detailsGrid}>
                  <DetailItem label="Landing Page" value={selectedLead.landingPage} wide />
                  <DetailItem label="Landing Page URL" value={selectedLead.landingPageUrl} wide copyable />
                  <DetailItem label="Referrer" value={selectedLead.referrer} wide copyable />
                  <DetailItem label="Form Source" value={selectedLead.formSource} />
                  <DetailItem label="Source Type" value={selectedLead.sourceType} />
                </div>
              </div>

              <div style={s.drawerSection}>
                <h4 style={s.drawerSectionTitle}>Device Information</h4>
                <div style={s.detailsGrid}>
                  <DetailItem label="Browser" value={selectedLead.browserName} />
                  <DetailItem label="OS" value={selectedLead.osName} />
                  <DetailItem label="Device Type" value={selectedLead.deviceType} />
                  <DetailItem label="IP Address" value={selectedLead.ipAddress} copyable />
                  <DetailItem label="Language" value={selectedLead.language} />
                  <DetailItem label="Timezone" value={selectedLead.timezone} />
                </div>
              </div>

              <div style={s.drawerSection}>
                <h4 style={s.drawerSectionTitle}>Journey</h4>
                <div style={s.detailsGrid}>
                  <DetailItem label="First Touch" value={selectedLead.firstTouchAt} />
                  <DetailItem label="Last Touch" value={selectedLead.lastTouchAt} />
                  <DetailItem label="Total Touchpoints" value={selectedLead.totalTouchpoints?.toString()} />
                  <DetailItem label="Submitted At" value={selectedLead.timestamp} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Panel */}
      {chatOpen && (
        <div style={s.chatPanel}>
          <div style={s.chatHeader}>
            <span style={s.chatTitle}>Marketing Assistant</span>
            <button onClick={() => setChatOpen(false)} style={s.chatHeaderClose}>
              ×
            </button>
          </div>

          <div style={s.chatBody}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={msg.role === 'user' ? s.msgUser : s.msgBot}>
                <div style={msg.role === 'user' ? s.bubbleUser : s.bubbleBot}>{msg.text}</div>
              </div>
            ))}
            {chatLoading && (
              <div style={s.msgBot}>
                <div style={s.bubbleBot}>Thinking...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={s.chatQuick}>
            {[
              'How many Meta leads?',
              'Top campaign',
              'Today\'s report',
              'Google vs Meta',
              'Export report',
              'Best landing page',
            ].map((q) => (
              <button key={q} style={s.quickBtn} onClick={() => { setChatInput(q); }}>
                {q}
              </button>
            ))}
          </div>

          <div style={s.chatInputArea}>
            <input
              style={s.chatInput}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder="Ask about your data..."
              disabled={chatLoading}
            />
            <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={s.btnSend}>
              Send
            </button>
          </div>
        </div>
      )}

      {/* Chat FAB */}
      <button onClick={() => setChatOpen(!chatOpen)} style={s.chatFab}>
        <Icon name={chatOpen ? 'close' : 'chat'} size={21} />
      </button>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Inter, Arial, sans-serif; }
        .dash-table { display: table; }
        .dash-cards { display: none; }

        button, input, select { font: inherit; }
        button:focus-visible, input:focus-visible, select:focus-visible {
          outline: 2px solid #0f766e;
          outline-offset: 2px;
        }
        .dashboard-sidebar button:hover {
          filter: brightness(0.98);
        }
        .dash-table tbody tr:hover {
          background: #f8fafc;
        }

        /* Skeleton pulse animation */
        @keyframes skeletonPulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        .skeleton-pulse {
          animation: skeletonPulse 1.4s ease-in-out infinite;
        }

        /* ── Desktop Responsive ── */

        /* Large desktops 1920px+ */
        @media (min-width: 1920px) {
          .contentArea {
            padding: 36px 48px !important;
          }
        }

        /* Standard desktops 1600–1919px */
        @media (max-width: 1900px) {
          .metricsGrid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
        }

        /* Laptops 1280–1599px */
        @media (max-width: 1599px) {
          .contentArea {
            padding: 24px 28px !important;
          }
          .topHeader {
            padding: 0 24px !important;
          }
        }

        /* Small laptops 1366px and below */
        @media (max-width: 1440px) {
          .metricsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .analyticsGrid {
            grid-template-columns: minmax(0, 2fr) minmax(260px, 0.75fr) !important;
          }
        }

        @media (max-width: 1280px) {
          .analyticsGrid {
            grid-template-columns: 1fr !important;
          }
          .filterGrid {
            grid-template-columns: repeat(2, minmax(180px, 1fr)) !important;
          }
        }

        /* Compact desktop – auto-collapse sidebar */
        @media (max-width: 1100px) {
          .dashboard-sidebar {
            width: 84px !important;
            padding: 22px 14px !important;
          }
          .dashboard-sidebar > div:first-child > div,
          .dashboard-sidebar nav button > span:last-child,
          .dashboard-sidebar > button:nth-of-type(2) > span,
          .dashboard-sidebar > div:last-child button > span:last-child {
            display: none !important;
          }
          .dashboard-sidebar nav button,
          .dashboard-sidebar > div:last-child button {
            justify-content: center !important;
            padding: 12px !important;
          }
          .metricsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 768px) {
          .dashboard-shell { display: block !important; }
          .dashboard-sidebar {
            position: fixed !important;
            left: 0;
            bottom: 0;
            top: auto !important;
            width: 100% !important;
            height: 68px !important;
            padding: 8px 12px !important;
            border-right: none !important;
            border-top: 1px solid #e6eaf0;
            flex-direction: row !important;
            align-items: center;
            overflow-x: auto;
          }
          .dashboard-sidebar > div:first-child,
          .dashboard-sidebar > button,
          .dashboard-sidebar > div:last-child {
            display: none !important;
          }
          .dashboard-sidebar nav {
            flex-direction: row !important;
            justify-content: space-between;
            width: 100%;
            gap: 4px !important;
          }
          .dashboard-sidebar nav button {
            min-width: 44px;
          }
          .dashboard-main {
            padding-bottom: 76px;
          }
          .dash-table { display: none !important; }
          .dash-cards { display: flex !important; flex-direction: column; gap: 12px; }
          .desktop-pagination { display: none !important; }
          
          .metricsGrid {
            grid-template-columns: 1fr !important;
          }
          
          .filterGrid {
            grid-template-columns: 1fr !important;
          }
          
          .topHeader {
            padding: 0 16px !important;
            height: auto !important;
            min-height: 68px;
            flex-wrap: wrap;
            gap: 12px;
          }
          
          .searchBox {
            order: 2;
            width: 100% !important;
            max-width: 100% !important;
          }
          
          .headerRight {
            order: 1;
            width: 100%;
            justify-content: space-between;
          }
          
          .contentArea {
            padding: 20px 16px !important;
          }
        }

        @media (max-width: 640px) {
          .platformCardsGrid {
            grid-template-columns: 1fr !important;
          }
          
          .chartFilters {
            width: 100%;
            justify-content: flex-start !important;
          }
        }
      `}</style>
    </div>
  );
}

function DetailItem({
  label,
  value,
  wide = false,
  copyable = false,
}: {
  label: string;
  value?: string;
  wide?: boolean;
  copyable?: boolean;
}) {
  const displayValue = value?.trim() || 'Not available';
  const copyValue = async () => {
    if (!value?.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  return (
    <div style={{ ...s.detailItem, ...(wide ? s.detailItemWide : {}) }}>
      <div style={s.detailLabel}>{label}</div>
      <div style={s.detailValueRow}>
        <div style={value?.trim() ? s.detailValue : s.detailValueEmpty}>{displayValue}</div>
        {copyable && value?.trim() && (
          <button onClick={copyValue} style={s.copyButton}>
            Copy
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   STYLES
   ═══════════════════════════════════════ */
const s: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f5f7fa',
    fontFamily: 'Inter, Arial, sans-serif',
  },

  // Sidebar
  sidebar: {
    background: '#ffffff',
    borderRight: '1px solid #e6eaf0',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    height: '100vh',
    flexShrink: 0,
    transition: 'width 220ms ease, padding 220ms ease',
    zIndex: 120,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  logoImage: {
    width: '44px',
    height: '44px',
    objectFit: 'contain',
    borderRadius: '10px',
    flexShrink: 0,
  },
  brandCaption: {
    marginTop: '3px',
    fontSize: '11px',
    color: '#9aa1b2',
    whiteSpace: 'nowrap',
  },
  collapseButton: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    border: '1px solid #e6eaf0',
    background: '#ffffff',
    color: '#687086',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    marginBottom: '14px',
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#172033',
  },
  btnPrimary: {
    width: '100%',
    background: '#0f766e',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    transition: 'background 160ms ease',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#687086',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },
  navItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    background: '#e7f5f3',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#0f766e',
    cursor: 'pointer',
    textAlign: 'left',
  },
  navIcon: {
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarFooter: {
    marginTop: 'auto',
    borderTop: '1px solid #e6eaf0',
    paddingTop: '16px',
  },

  // Top Header
  mainArea: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    minWidth: 0,
    flex: 1,
    overflow: 'hidden',
  },
  topHeader: {
    minHeight: '68px',
    background: '#ffffff',
    borderBottom: '1px solid #e6eaf0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    gap: '16px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    flexWrap: 'nowrap',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    maxWidth: '500px',
  },
  searchIcon: {
    fontSize: '18px',
    color: '#687086',
    display: 'flex',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #e6eaf0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#172033',
    background: '#f8fafc',
    outline: 'none',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  lastUpdate: {
    fontSize: '13px',
    color: '#687086',
  },
  statusLive: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '999px',
    background: '#e7fbf5',
    color: '#09c99b',
    fontSize: '12px',
    fontWeight: 600,
  },
  statusOff: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '999px',
    background: '#fff0ea',
    color: '#ff8153',
    fontSize: '12px',
    fontWeight: 600,
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'currentColor',
  },
  profileCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#e7f5f3',
    color: '#0f766e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
  },

  // Content Area
  contentArea: {
    padding: '30px 32px',
    flex: 1,
  },
  pageHeading: {
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#172033',
    marginBottom: '4px',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#687086',
  },
  notification: {
    padding: '12px 20px',
    background: '#fff0ea',
    color: '#ff8153',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '24px',
  },

  // Filter Card
  filterCard: {
    background: '#ffffff',
    border: '1px solid #e6eaf0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    boxShadow: '0 4px 18px rgba(31, 38, 67, 0.04)',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#9aa1b2',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  filterSelect: {
    padding: '10px 12px',
    border: '1px solid #e6eaf0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#172033',
    background: '#ffffff',
    outline: 'none',
    cursor: 'pointer',
  },

  dateInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #e6eaf0',
    borderRadius: '8px',
    background: '#ffffff',
    padding: '0 12px',
    color: '#687086',
  },

  dateInput: {
    flex: 1,
    padding: '10px 8px',
    border: 'none',
    fontSize: '14px',
    color: '#172033',
    background: 'transparent',
    outline: 'none',
    cursor: 'pointer',
  },

  // Metric Cards
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  metricCard: {
    background: '#ffffff',
    border: '1px solid #e6eaf0',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 18px rgba(31, 38, 67, 0.04)',
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: '16px',
  },
  metricIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  metricValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#172033',
    marginBottom: '6px',
  },
  metricLabel: {
    fontSize: '13px',
    color: '#687086',
  },

  // Analytics Grid
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 0.75fr)',
    gap: '24px',
    marginBottom: '24px',
    minWidth: 0,
  },

  // Chart Card
  chartCard: {
    background: '#ffffff',
    border: '1px solid #e6eaf0',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 18px rgba(31, 38, 67, 0.04)',
  },
  chartCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#172033',
    marginBottom: '4px',
  },
  cardSubtitle: {
    fontSize: '13px',
    color: '#687086',
  },
  chartFilters: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  chartFilterBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'transparent',
    border: '1px solid #e6eaf0',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#687086',
    cursor: 'pointer',
  },
  chartFilterDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  chartWrapper: {
    width: '100%',
    overflowX: 'auto',
  },

  // Donut Card
  donutCard: {
    background: '#ffffff',
    border: '1px solid #e6eaf0',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 18px rgba(31, 38, 67, 0.04)',
  },
  donutCenter: {
    textAlign: 'center',
    margin: '24px 0',
  },
  donutValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#172033',
  },
  donutLabel: {
    fontSize: '13px',
    color: '#687086',
    marginTop: '4px',
  },
  platformList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  platformRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
  },
  platformLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  platformDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  platformName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#172033',
  },
  platformRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  platformCount: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#172033',
  },
  platformPercent: {
    fontSize: '13px',
    color: '#687086',
  },

  // Table Card
  tableCard: {
    background: '#ffffff',
    border: '1px solid #e6eaf0',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 18px rgba(31, 38, 67, 0.04)',
    marginBottom: '24px',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 600,
    color: '#9aa1b2',
    background: '#f8fafc',
    borderBottom: '1px solid #e6eaf0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#172033',
    borderBottom: '1px solid #f8fafc',
  },
  tdBold: {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#172033',
    fontWeight: 600,
    borderBottom: '1px solid #f8fafc',
  },
  tdNum: {
    padding: '14px 16px',
    fontSize: '15px',
    color: '#172033',
    fontWeight: 700,
    borderBottom: '1px solid #f8fafc',
  },
  tdMuted: {
    padding: '14px 16px',
    fontSize: '13px',
    color: '#687086',
    borderBottom: '1px solid #f8fafc',
  },
  tdCode: {
    padding: '14px 16px',
    borderBottom: '1px solid #f8fafc',
  },
  code: {
    padding: '4px 8px',
    background: '#f8fafc',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#0f766e',
  },
  leadCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: '#0f766e',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    flexShrink: 0,
  },
  leadName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#172033',
  },
  leadMeta: {
    fontSize: '11px',
    color: '#9aa1b2',
  },
  platformBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
  },
  btnView: {
    padding: '6px 14px',
    background: 'transparent',
    border: '1px solid #e6eaf0',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#0f766e',
    cursor: 'pointer',
  },
  progressWrapper: {
    height: '6px',
    background: '#f8fafc',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  progressBar: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  progressText: {
    fontSize: '12px',
    color: '#687086',
    fontWeight: 600,
  },

  // Platform Cards Grid
  platformCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '20px',
  },
  platformPerformanceCard: {
    background: '#ffffff',
    border: '1px solid #e6eaf0',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 18px rgba(31, 38, 67, 0.04)',
  },
  platformCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  platformCardIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '18px',
    fontWeight: 700,
    flexShrink: 0,
  },
  platformCardName: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#172033',
  },
  platformCardMeta: {
    fontSize: '12px',
    color: '#687086',
  },
  platformCardValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#172033',
    marginBottom: '4px',
  },
  platformCardLabel: {
    fontSize: '13px',
    color: '#687086',
    marginBottom: '12px',
  },
  platformCardBar: {
    height: '6px',
    background: '#f8fafc',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  platformCardBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  platformCardPercent: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#687086',
  },

  // Section Title
  sectionTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#172033',
    marginBottom: '8px',
  },

  sectionSubtitle: {
    margin: '5px 0 0',
    color: '#687086',
    fontSize: '13px',
  },

  // Empty State
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    fontSize: '14px',
    color: '#9aa1b2',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  emptyIcon: {
    fontSize: '40px',
    marginBottom: '8px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#687086',
  },
  emptyMessage: {
    fontSize: '13px',
    color: '#9aa1b2',
  },

  // Skeleton Loader
  skeletonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '24px',
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e6eaf0',
    marginBottom: '24px',
  },
  skeletonRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    animation: 'skeletonPulse 1.4s ease-in-out infinite',
  },
  skeletonCell: {
    height: '16px',
    borderRadius: '6px',
    background: '#e6eaf0',
  },

  // Leads Header
  leadsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },

  // Pagination
  paginationContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '14px',
    width: '100%',
    padding: '14px 0',
  },

  paginationSummary: {
    color: '#687086',
    fontSize: '13px',
    fontWeight: 500,
  },

  pagination: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '6px',
  },

  pageButton: {
    minHeight: '36px',
    padding: '7px 13px',
    border: '1px solid #d8dee8',
    borderRadius: '7px',
    background: '#ffffff',
    color: '#344054',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },

  pageButtonDisabled: {
    minHeight: '36px',
    padding: '7px 13px',
    border: '1px solid #eaecf0',
    borderRadius: '7px',
    background: '#f8fafc',
    color: '#a0a7b4',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'not-allowed',
  },

  pageNumber: {
    width: '36px',
    height: '36px',
    border: '1px solid #d8dee8',
    borderRadius: '7px',
    background: '#ffffff',
    color: '#344054',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },

  pageNumberActive: {
    width: '36px',
    height: '36px',
    border: '1px solid #0f766e',
    borderRadius: '7px',
    background: '#0f766e',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },

  paginationDots: {
    padding: '0 3px',
    color: '#98a2b3',
    fontSize: '14px',
  },

  // Mobile Cards
  mobileCard: {
    background: '#ffffff',
    border: '1px solid #e6eaf0',
    borderRadius: '12px',
    padding: '16px',
  },
  mobileCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  mobileCardInfo: {
    flex: 1,
  },
  mobileName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#172033',
  },
  mobilePhone: {
    fontSize: '13px',
    color: '#687086',
  },
  mobileCardBody: {
    marginBottom: '12px',
  },
  mobileMeta: {
    fontSize: '13px',
    color: '#687086',
    marginBottom: '6px',
  },
  mobileTime: {
    fontSize: '12px',
    color: '#9aa1b2',
  },
  mobileViewButton: {
    width: '100%',
    padding: '10px',
    background: '#0f766e',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },

  // Drawer
  drawerOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(32, 36, 58, 0.5)',
    zIndex: 2000,
  },
  drawer: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '520px',
    height: '100vh',
    background: '#ffffff',
    boxShadow: '-4px 0 24px rgba(31, 38, 67, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '100vw',
  },
  drawerHeader: {
    padding: '24px',
    borderBottom: '1px solid #e6eaf0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  drawerTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#172033',
  },
  drawerSubtitle: {
    fontSize: '13px',
    color: '#687086',
    marginTop: '4px',
  },
  drawerClose: {
    width: '32px',
    height: '32px',
    background: '#f8fafc',
    border: '1px solid #e6eaf0',
    borderRadius: '6px',
    color: '#687086',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  drawerBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  },
  drawerSection: {
    marginBottom: '28px',
  },
  drawerSectionTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#172033',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  detailItem: {
    padding: '12px',
    background: '#f8fafc',
    border: '1px solid #e6eaf0',
    borderRadius: '8px',
  },
  detailItemWide: {
    gridColumn: '1 / -1',
  },
  detailLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#9aa1b2',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  detailValueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '10px',
  },
  detailValue: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#172033',
    wordBreak: 'break-word',
  },
  detailValueEmpty: {
    fontSize: '13px',
    color: '#9aa1b2',
    fontStyle: 'italic',
  },
  copyButton: {
    padding: '4px 8px',
    background: '#e7f5f3',
    color: '#0f766e',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },

  // Chat
  chatFab: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: '#0f766e',
    color: '#fff',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    boxShadow: '0 4px 18px rgba(15, 118, 110, 0.3)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatPanel: {
    position: 'fixed',
    bottom: '24px',
    right: '90px',
    width: '380px',
    maxWidth: 'calc(100vw - 120px)',
    height: '520px',
    maxHeight: 'calc(100vh - 100px)',
    background: '#ffffff',
    borderRadius: '14px',
    boxShadow: '0 8px 32px rgba(31, 38, 67, 0.15)',
    border: '1px solid #e6eaf0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 1500,
  },
  chatHeader: {
    padding: '16px 20px',
    background: '#172033',
    color: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatTitle: {
    fontSize: '15px',
    fontWeight: 600,
  },
  chatHeaderClose: {
    width: '28px',
    height: '28px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  chatBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: '#f8fafc',
  },
  msgUser: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  msgBot: {
    display: 'flex',
    justifyContent: 'flex-start',
  },
  bubbleUser: {
    background: '#0f766e',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: '12px 12px 2px 12px',
    fontSize: '14px',
    maxWidth: '80%',
    lineHeight: 1.5,
  },
  bubbleBot: {
    background: '#ffffff',
    color: '#172033',
    padding: '10px 14px',
    borderRadius: '12px 12px 12px 2px',
    fontSize: '14px',
    maxWidth: '85%',
    lineHeight: 1.5,
    border: '1px solid #e6eaf0',
  },
  chatQuick: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '12px 16px',
    background: '#ffffff',
    borderTop: '1px solid #e6eaf0',
  },
  quickBtn: {
    padding: '8px 12px',
    background: '#f8fafc',
    border: '1px solid #e6eaf0',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#687086',
    cursor: 'pointer',
    textAlign: 'left',
  },
  chatInputArea: {
    display: 'flex',
    padding: '12px 16px',
    gap: '8px',
    background: '#ffffff',
    borderTop: '1px solid #e6eaf0',
  },
  chatInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #e6eaf0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#172033',
    outline: 'none',
  },
  btnSend: {
    padding: '8px 16px',
    background: '#0f766e',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};