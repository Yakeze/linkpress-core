import * as cheerio from 'cheerio';
import type { ScrapedContent } from '../types.js';

export function parseHtml(html: string, url: string): ScrapedContent {
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').text() ||
    '';

  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content') ||
    '';

  const fullBodyText = $('body').text();
  const outdatedCheck = detectOutdated(fullBodyText, title, description);

  $('script, style, nav, footer, header, aside, .ads, .advertisement, .sidebar').remove();

  const siteName =
    $('meta[property="og:site_name"]').attr('content') ||
    new URL(url).hostname.replace('www.', '');

  const image = extractImage($, url);
  const sourceLabel = detectSourceLabel(url);
  const publishedAt = extractPublishedDate($);

  let content = '';

  const articleSelectors = [
    'article',
    '[role="main"]',
    'main',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '#content',
  ];

  for (const selector of articleSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      content = element.text();
      break;
    }
  }

  if (!content) {
    content = $('body').text();
  }

  content = content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()
    .substring(0, 10000);

  return {
    title: title.trim(),
    description: description.trim(),
    content,
    siteName,
    image,
    sourceLabel,
    publishedAt,
    isOutdated: outdatedCheck.isOutdated,
    outdatedReason: outdatedCheck.reason,
  };
}

function extractImage($: cheerio.CheerioAPI, url: string): string | undefined {
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) {
    return resolveUrl(ogImage, url);
  }

  const twitterImage = $('meta[name="twitter:image"]').attr('content');
  if (twitterImage) {
    return resolveUrl(twitterImage, url);
  }

  const articleSelectors = ['article', '[role="main"]', 'main', '.post-content', '.article-content'];
  for (const selector of articleSelectors) {
    const img = $(`${selector} img`).first();
    const src = img.attr('src') || img.attr('data-src');
    if (src && !isIconOrLogo(src)) {
      return resolveUrl(src, url);
    }
  }

  return undefined;
}

function resolveUrl(imgUrl: string, baseUrl: string): string {
  if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
    return imgUrl;
  }
  if (imgUrl.startsWith('//')) {
    return 'https:' + imgUrl;
  }
  try {
    return new URL(imgUrl, baseUrl).href;
  } catch {
    return imgUrl;
  }
}

function isIconOrLogo(src: string): boolean {
  const lower = src.toLowerCase();
  return lower.includes('logo') ||
    lower.includes('icon') ||
    lower.includes('avatar') ||
    lower.includes('favicon') ||
    lower.includes('badge') ||
    lower.endsWith('.svg') ||
    lower.includes('1x1') ||
    lower.includes('pixel');
}

function extractPublishedDate($: cheerio.CheerioAPI): string | undefined {
  const dateSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="pubdate"]',
    'meta[name="publishdate"]',
    'meta[name="date"]',
    'meta[property="og:published_time"]',
    'time[datetime]',
    'time[pubdate]',
    '.published',
    '.post-date',
    '.article-date',
    '.entry-date',
    '[itemprop="datePublished"]',
  ];

  for (const selector of dateSelectors) {
    const el = $(selector).first();
    const dateStr = el.attr('content') || el.attr('datetime') || el.text();
    if (dateStr) {
      const parsed = parseDate(dateStr);
      if (parsed) return parsed;
    }
  }

  return undefined;
}

function parseDate(dateStr: string): string | undefined {
  const cleaned = dateStr.trim();
  if (!cleaned) return undefined;

  try {
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function detectOutdated(content: string, title: string, description: string): { isOutdated: boolean; reason?: string } {
  const textToCheck = `${title} ${description} ${content}`.toLowerCase();

  // Explicit deprecation patterns - must be clear declarations
  const patterns: { regex: RegExp; reason: string }[] = [
    { regex: /\b(this|it) (is|has been) deprecated\b/i, reason: 'Article declares deprecation' },
    { regex: /\bdeprecated[.!]?\s/i, reason: 'Content marked as deprecated' },
    { regex: /\bno longer (maintained|recommended|supported)\b/i, reason: 'No longer maintained/supported' },
    { regex: /\bend[- ]of[- ]life\b/i, reason: 'End of life' },
    { regex: /\bhas been (sunset|discontinued|archived)\b/i, reason: 'Project discontinued' },
    { regex: /\buse .{1,30} instead\b/i, reason: 'Recommends alternative' },
    { regex: /\bmigrate[d]? to .{1,30}\b/i, reason: 'Migration recommended' },
    { regex: /\breplace[d]? by .{1,30}\b/i, reason: 'Replaced by newer solution' },
    { regex: /\b(this|the) (project|tool|library|package|framework) is (deprecated|archived)\b/i, reason: 'Project deprecated/archived' },
  ];

  for (const { regex, reason } of patterns) {
    if (regex.test(textToCheck)) {
      return { isOutdated: true, reason };
    }
  }

  return { isOutdated: false };
}

function detectSourceLabel(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();

  const labelMap: Record<string, string> = {
    'medium.com': 'Blog',
    'dev.to': 'Blog',
    'hashnode.dev': 'Blog',
    'velog.io': 'Blog',
    'tistory.com': 'Blog',
    'brunch.co.kr': 'Blog',
    'substack.com': 'Newsletter',
    'github.com': 'GitHub',
    'github.io': 'Blog',
    'linkedin.com': 'LinkedIn',
    'twitter.com': 'Twitter',
    'x.com': 'Twitter',
    'reddit.com': 'Reddit',
    'news.ycombinator.com': 'HackerNews',
    'stackoverflow.com': 'StackOverflow',
    'youtube.com': 'YouTube',
    'youtu.be': 'YouTube',
    'notion.so': 'Notion',
    'notion.site': 'Notion',
    'news.hada.io': 'News',
  };

  for (const [domain, label] of Object.entries(labelMap)) {
    if (hostname.includes(domain)) {
      return label;
    }
  }

  if (hostname.includes('blog') || url.includes('/blog/')) {
    return 'Blog';
  }

  return 'Article';
}
