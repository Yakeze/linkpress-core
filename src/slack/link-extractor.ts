import type { SlackMessage, ExtractedLink } from '../types.js';

const URL_REGEX = /https?:\/\/[^\s<>|]+/g;

const IGNORED_DOMAINS = [
  'slack.com',
  'slack-edge.com',
  'slack-imgs.com',
  'giphy.com',
  'tenor.com',
  'emoji.slack-edge.com',
];

export function extractUrls(text: string): string[] {
  const urls = new Set<string>();

  const slackMatches = text.matchAll(/<(https?:\/\/[^|>]+)(?:\|[^>]*)?>/g);
  for (const match of slackMatches) {
    urls.add(match[1]);
  }

  const plainMatches = text.matchAll(URL_REGEX);
  for (const match of plainMatches) {
    let url = match[0];
    url = url.replace(/[.,;:!?)]+$/, '');
    urls.add(url);
  }

  return Array.from(urls).filter(url => {
    try {
      const parsed = new URL(url);
      return !IGNORED_DOMAINS.some(domain => parsed.hostname.includes(domain));
    } catch {
      return false;
    }
  });
}

export function isArticleUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();

    const nonArticlePatterns = [
      /\.(png|jpg|jpeg|gif|webp|svg|ico|pdf|zip|tar|gz)$/i,
      /^\/?(favicon|robots\.txt|sitemap)/i,
    ];

    for (const pattern of nonArticlePatterns) {
      if (pattern.test(path)) {
        return false;
      }
    }

    const articleDomains = [
      'medium.com',
      'dev.to',
      'hashnode.dev',
      'substack.com',
      'github.com',
      'twitter.com',
      'x.com',
      'linkedin.com',
      'youtube.com',
      'youtu.be',
      'notion.so',
      'notion.site',
      'velog.io',
      'tistory.com',
      'brunch.co.kr',
    ];

    if (articleDomains.some(d => parsed.hostname.includes(d))) {
      return true;
    }

    if (path.length > 10 || path.includes('/blog') || path.includes('/post') || path.includes('/article')) {
      return true;
    }

    return true;
  } catch {
    return false;
  }
}

export function extractLinksFromMessages(messages: SlackMessage[]): ExtractedLink[] {
  const extractedLinks: ExtractedLink[] = [];

  for (const message of messages) {
    if (message.text) {
      const urls = extractUrls(message.text);
      for (const url of urls.filter(isArticleUrl)) {
        extractedLinks.push({ url, messageText: message.text });
      }
    }
  }

  return extractedLinks.reduce((acc, link) => {
    if (!acc.some(l => l.url === link.url)) {
      acc.push(link);
    }
    return acc;
  }, [] as ExtractedLink[]);
}
