import type { ScrapedContent } from '../types.js';
import { parseHtml } from './html-parser.js';

export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    return parseHtml(html, url);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to scrape ${url}: ${error.message}`);
    }
    throw error;
  }
}

export { parseHtml } from './html-parser.js';
