import type { AIConfig, ArticleSummary } from '../types.js';
import { callAnthropic, callOpenAI, callGemini } from './providers/index.js';

function buildPrompt(title: string, content: string, url: string, language: string): string {
  const koreanRule = language === '한국어'
    ? '\n6. KOREAN ONLY: Use formal polite speech (존댓말/합쇼체) consistently. End sentences with -습니다, -입니다, -됩니다. NEVER use casual speech (반말).'
    : '';

  return `You are a SENIOR TECH JOURNALIST at a prestigious developer magazine.
Your job is to create compelling, newspaper-style briefings that developers actually want to read.

---

INPUT:
- Title: ${title}
- URL: ${url}
- Content: ${content.substring(0, 6000)}

---

TASK: Create a briefing in JSON format.

{
  "headline": "Catchy, newspaper-style headline (max 15 words)",
  "tldr": "One-sentence summary for busy readers",
  "keyPoints": [
    "First key point (one sentence)",
    "Second key point (one sentence)", 
    "Third key point (one sentence)"
  ],
  "whyItMatters": "Why this matters to developers/readers (1-2 sentences)",
  "keyQuote": "Most impactful quote from the article (if any, otherwise empty string)",
  "tags": ["tag1", "tag2", "tag3"],
  "difficulty": "beginner|intermediate|advanced"
}

---

CRITICAL RULES:
1. WRITE EVERYTHING IN ${language}. This is NOT optional. The output MUST be in ${language}.
2. Headline should be ATTENTION-GRABBING but accurate—no clickbait lies.
3. Key points should be ACTIONABLE insights, not just descriptions.
4. Tags: use technical topics (frontend, backend, ai, devops, database, security, career, etc.)
5. Difficulty: beginner (anyone can understand), intermediate (some experience needed), advanced (experts only)${koreanRule}

OUTPUT: JSON only, no explanation outside JSON.`;
}

function getDefaultSummary(title: string, url: string): ArticleSummary {
  let hostname = '';
  try {
    hostname = new URL(url).hostname.replace('www.', '');
  } catch {
    hostname = 'unknown';
  }

  const tags: string[] = [];
  const urlLower = url.toLowerCase();

  if (urlLower.includes('github.com')) tags.push('github');
  if (urlLower.includes('medium.com')) tags.push('blog');
  if (urlLower.includes('dev.to')) tags.push('blog');
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) tags.push('video');
  if (urlLower.includes('linkedin.com')) tags.push('linkedin');
  if (urlLower.includes('news.hada.io')) tags.push('news');

  return {
    headline: title || `Article from ${hostname}`,
    tldr: title || `Content from ${hostname}`,
    keyPoints: [],
    whyItMatters: '',
    tags,
    difficulty: 'intermediate',
  };
}

export async function summarizeArticle(
  title: string,
  content: string,
  url: string,
  config: AIConfig
): Promise<ArticleSummary> {
  if (!config.apiKey) {
    return getDefaultSummary(title, url);
  }

  const language = config.language || 'English';
  const prompt = buildPrompt(title, content, url, language);

  try {
    let text = '';

    switch (config.provider) {
      case 'anthropic':
        text = await callAnthropic(config.apiKey, config.model, prompt);
        break;
      case 'openai':
        text = await callOpenAI(config.apiKey, config.model, prompt);
        break;
      case 'gemini':
        text = await callGemini(config.apiKey, config.model, prompt);
        break;
      default:
        return getDefaultSummary(title, url);
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getDefaultSummary(title, url);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      headline: parsed.headline || title,
      tldr: parsed.tldr || '',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 3) : [],
      whyItMatters: parsed.whyItMatters || '',
      keyQuote: parsed.keyQuote || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
      difficulty: ['beginner', 'intermediate', 'advanced'].includes(parsed.difficulty)
        ? parsed.difficulty
        : 'intermediate',
    };
  } catch {
    return getDefaultSummary(title, url);
  }
}

export function serializeSummary(summary: ArticleSummary): string {
  return JSON.stringify(summary);
}

export function parseSummary(summaryStr: string | undefined): ArticleSummary | null {
  if (!summaryStr) return null;
  try {
    const parsed = JSON.parse(summaryStr);
    if (parsed.headline && parsed.tldr) {
      return parsed as ArticleSummary;
    }
    return {
      headline: parsed.hook || summaryStr,
      tldr: parsed.summary || summaryStr,
      keyPoints: [],
      whyItMatters: '',
      tags: parsed.tags || [],
      difficulty: parsed.difficulty || 'intermediate',
    };
  } catch {
    return {
      headline: summaryStr,
      tldr: summaryStr,
      keyPoints: [],
      whyItMatters: '',
      tags: [],
      difficulty: 'intermediate',
    };
  }
}
