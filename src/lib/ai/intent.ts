/**
 * Intent detection for Marketing Intelligence Assistant.
 * Parses natural language questions into structured intents.
 */

export type AnalyticsIntent =
  | 'TOP_PLATFORM'
  | 'TOP_CAMPAIGN'
  | 'TOP_AD'
  | 'TOP_LANDING_PAGE'
  | 'PLATFORM_LEADS'
  | 'CAMPAIGN_LEADS'
  | 'PLATFORM_COMPARISON'
  | 'GENERAL_OVERVIEW'
  | 'EXPORT_REPORT'
  | 'ORGANIC_LEADS'
  | 'TODAY_LEADS'
  | 'LAST_7_DAYS'
  | 'TOTAL_LEADS_COUNT';

export interface DetectedIntent {
  intent: AnalyticsIntent;
  entity?: string;
}

const PLATFORM_KEYWORDS = ['google', 'meta', 'facebook', 'instagram', 'youtube', 'direct', 'organic'];
const CAMPAIGN_KEYWORDS = ['campaign', 'campaigns'];
const AD_KEYWORDS = ['ad', 'ads', 'creative', 'content', 'video_ad', 'image_ad'];
const LANDING_PAGE_KEYWORDS = ['landing page', 'landing pages', 'page', 'pages', 'url', 'traffic'];

export function detectIntent(question: string): DetectedIntent {
  const q = question.toLowerCase().trim();

  // Export intent
  if (q.includes('export') || q.includes('download') || q.includes('excel') || q.includes('report file')) {
    return { intent: 'EXPORT_REPORT' };
  }

  // Organic / Direct intent
  if (q.includes('organic') || q.includes('direct') || q.includes('direct visitors') || q.includes('direct leads')) {
    return { intent: 'ORGANIC_LEADS' };
  }

  // Today's report
  if (q.includes('today') || q.includes("today's")) {
    return { intent: 'TODAY_LEADS' };
  }

  // Last 7 days report
  if (q.includes('7 days') || q.includes('7d') || q.includes('last week')) {
    return { intent: 'LAST_7_DAYS' };
  }

  // Unique / total lead count
  if (q.includes('how many unique') || q.includes('total leads') || q.includes('how many leads in total') || q.includes('total lead count')) {
    return { intent: 'TOTAL_LEADS_COUNT' };
  }

  // Check for comparison intent
  if (
    (q.includes('compare') || q.includes('vs') || q.includes('versus') || q.includes('difference')) &&
    PLATFORM_KEYWORDS.some((p) => q.includes(p))
  ) {
    return { intent: 'PLATFORM_COMPARISON' };
  }

  // Check for specific platform lead count
  for (const platform of PLATFORM_KEYWORDS) {
    if (q.includes(platform) && (q.includes('how many') || q.includes('leads') || q.includes('count') || q.includes('number'))) {
      return { intent: 'PLATFORM_LEADS', entity: platform };
    }
  }

  // Check for specific campaign lead count
  if (q.includes('how many') && CAMPAIGN_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: 'CAMPAIGN_LEADS' };
  }

  // Top / best platform
  if (
    (q.includes('best') || q.includes('top') || q.includes('most') || q.includes('highest') || q.includes('which platform')) &&
    (q.includes('platform') || PLATFORM_KEYWORDS.some((p) => q.includes(p)) || q.includes('source'))
  ) {
    return { intent: 'TOP_PLATFORM' };
  }

  // Top campaign
  if (
    (q.includes('best') || q.includes('top') || q.includes('most') || q.includes('highest') || q.includes('which campaign')) &&
    CAMPAIGN_KEYWORDS.some((k) => q.includes(k))
  ) {
    return { intent: 'TOP_CAMPAIGN' };
  }

  // Top ad
  if (
    (q.includes('best') || q.includes('top') || q.includes('most') || q.includes('highest') || q.includes('which ad')) &&
    AD_KEYWORDS.some((k) => q.includes(k))
  ) {
    return { intent: 'TOP_AD' };
  }

  // Top landing page
  if (
    (q.includes('best') || q.includes('top') || q.includes('most') || q.includes('highest') || q.includes('which') || q.includes('traffic')) &&
    LANDING_PAGE_KEYWORDS.some((k) => q.includes(k))
  ) {
    return { intent: 'TOP_LANDING_PAGE' };
  }

  // Campaign-related
  if (CAMPAIGN_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: 'TOP_CAMPAIGN' };
  }

  // Ad-related
  if (AD_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: 'TOP_AD' };
  }

  // Landing page related
  if (LANDING_PAGE_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: 'TOP_LANDING_PAGE' };
  }

  // Platform-related
  if (q.includes('platform') || PLATFORM_KEYWORDS.some((p) => q.includes(p))) {
    return { intent: 'TOP_PLATFORM' };
  }

  // Default
  return { intent: 'GENERAL_OVERVIEW' };
}
