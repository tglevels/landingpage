/**
 * Generate natural language responses from analytics data.
 * Uses PRECISE language — says "most leads" not "best performing".
 */

import { AnalyticsIntent } from './intent';
import { normalizePlatform } from '../analytics/normalizePlatform';
import type {
  AdData,
  CampaignData,
  LandingPageData,
  OverviewData,
  PlatformData,
} from '../analytics/analyticsTypes';

interface AnalyticsContext {
  overview?: OverviewData;
  platforms?: PlatformData[];
  campaigns?: CampaignData[];
  ads?: AdData[];
  landingPages?: LandingPageData[];
  entity?: string;
  filteredCount?: number;
}

export function generateResponse(
  intent: AnalyticsIntent,
  ctx: AnalyticsContext
): string {
  switch (intent) {
    case 'GENERAL_OVERVIEW': {
      const o = ctx.overview;
      if (!o || o.totalLeads === 0) return "No data available yet.";

      let response = `📊 Here's your marketing overview:\n\n`;
      response += `• **Total Leads:** ${o.totalLeads.toLocaleString()}\n`;

      const platformEntries = Object.entries(o.platforms)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a);

      for (const [name, count] of platformEntries) {
        response += `• **${name}:** ${count.toLocaleString()} leads\n`;
      }

      if (o.topCampaign) {
        response += `\n🏆 **Top Campaign by lead volume:** ${o.topCampaign.name} (${o.topCampaign.leads} leads)`;
      }
      if (o.topLandingPage) {
        response += `\n🔗 **Top Landing Page by lead volume:** ${o.topLandingPage.path} (${o.topLandingPage.leads} leads)`;
      }

      return response;
    }

    case 'TOP_PLATFORM': {
      const platforms = ctx.platforms;
      if (!platforms || platforms.length === 0)
        return "No data available yet.";

      const top = platforms[0];
      let response = `📈 **${top.platform}** is currently the top platform by lead volume with **${top.leads.toLocaleString()}** leads (${top.percentage}% of total).\n\n`;
      response += `Full breakdown:\n`;
      for (const p of platforms) {
        response += `• ${p.platform}: ${p.leads.toLocaleString()} leads (${p.percentage}%)\n`;
      }
      return response;
    }

    case 'TOP_CAMPAIGN': {
      const campaigns = ctx.campaigns;
      if (!campaigns || campaigns.length === 0)
        return "No data available yet.";

      const top = campaigns[0];
      let response = `🏆 **${top.campaign}** generated **${top.leads.toLocaleString()}** leads (${top.platform}), making it your highest-performing campaign by volume.\n\n`;

      if (campaigns.length > 1) {
        response += `Top campaigns:\n`;
        for (const c of campaigns.slice(0, 5)) {
          response += `• ${c.campaign} — ${c.leads.toLocaleString()} leads (${c.platform})\n`;
        }
      }
      return response;
    }

    case 'TOP_AD': {
      const ads = ctx.ads;
      if (!ads || ads.length === 0)
        return "No data available yet.";

      const top = ads[0];
      let response = `🎯 **${top.ad}** generated **${top.leads.toLocaleString()}** leads (Campaign: ${top.campaign}, Platform: ${top.platform}).\n\n`;

      if (ads.length > 1) {
        response += `Top ads:\n`;
        for (const a of ads.slice(0, 5)) {
          response += `• ${a.ad} — ${a.leads.toLocaleString()} leads\n`;
        }
      }
      return response;
    }

    case 'TOP_LANDING_PAGE': {
      const lps = ctx.landingPages;
      if (!lps || lps.length === 0)
        return "No data available yet.";

      const top = lps[0];
      let response = `🔗 **${top.path}** generated **${top.leads.toLocaleString()}** leads, receiving the most traffic.\n\n`;

      if (lps.length > 1) {
        response += `All landing pages:\n`;
        for (const lp of lps) {
          response += `• ${lp.path} — ${lp.leads.toLocaleString()} leads\n`;
        }
      }
      return response;
    }

    case 'PLATFORM_LEADS': {
      const platforms = ctx.platforms;
      if (!platforms || platforms.length === 0) return "No data available yet.";

      const entityNormalized = normalizePlatform(ctx.entity);
      const found = platforms.find(
        (p) => p.platform.toLowerCase() === entityNormalized.toLowerCase()
      );

      if (found) {
        return `📊 **${found.platform}** generated **${found.leads.toLocaleString()}** leads (${found.percentage}% of total).`;
      }

      return `I couldn't find data for "${ctx.entity}". Available platforms: ${platforms.map((p) => p.platform).join(', ')}.`;
    }

    case 'ORGANIC_LEADS': {
      const platforms = ctx.platforms;
      if (!platforms) return "No data available yet.";

      const direct = platforms.find((p) => p.platform.toLowerCase() === 'direct');
      const count = direct ? direct.leads : 0;
      return `🌱 **Direct / Organic** traffic generated **${count.toLocaleString()}** leads.`;
    }

    case 'TODAY_LEADS': {
      const count = ctx.filteredCount ?? 0;
      return `📅 Today's activity generated **${count.toLocaleString()}** new leads.`;
    }

    case 'LAST_7_DAYS': {
      const count = ctx.filteredCount ?? 0;
      return `🗓️ In the last 7 days, your marketing campaigns captured **${count.toLocaleString()}** leads.`;
    }

    case 'TOTAL_LEADS_COUNT': {
      const count = ctx.overview?.totalLeads ?? ctx.filteredCount ?? 0;
      return `👥 You currently have **${count.toLocaleString()}** total unique leads registered in the database.`;
    }

    case 'EXPORT_REPORT': {
      return `📥 You can download your concise Excel report at any time by clicking the **Export Excel** button at the top right of the dashboard.`;
    }

    case 'CAMPAIGN_LEADS': {
      const campaigns = ctx.campaigns;
      if (!campaigns || campaigns.length === 0)
        return "No data available yet.";

      let response = `📋 Campaign lead counts:\n\n`;
      for (const c of campaigns.slice(0, 10)) {
        response += `• **${c.campaign}** — ${c.leads.toLocaleString()} leads (${c.platform})\n`;
      }
      return response;
    }

    case 'PLATFORM_COMPARISON': {
      const platforms = ctx.platforms;
      if (!platforms || platforms.length < 2)
        return "Not enough platform data to compare. Need at least 2 platforms with leads.";

      let response = `⚖️ **Platform Comparison by Lead Volume:**\n\n`;
      for (const p of platforms) {
        const bar = '█'.repeat(Math.max(1, Math.round(p.percentage / 5)));
        response += `${p.platform}: ${bar} ${p.leads.toLocaleString()} leads (${p.percentage}%)\n`;
      }

      const top = platforms[0];
      const second = platforms[1];
      const diff = top.leads - second.leads;
      response += `\n**${top.platform}** leads by **${diff.toLocaleString()}** more leads than **${second.platform}**.`;

      return response;
    }

    default:
      return "I can help you with platform performance, campaign analytics, ad performance, and landing page data. Try asking something like 'How many Meta leads?'";
  }
}
