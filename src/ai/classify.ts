import type { AIConfig, ContentClassification, ContentType, TechnicalDepth, Actionability } from '../types.js';
import { callAnthropic, callOpenAI, callGemini } from './providers/index.js';

function buildClassificationPrompt(messageText: string, url: string, title: string, description: string): string {
  return `You filter links for a tech newsletter. DEFAULT ACTION: COLLECT.

INPUT:
- URL: ${url}
- Context: ${messageText || '(none)'}
- Title: ${title || '(none)'}  
- Description: ${description || '(none)'}

---

EXCLUDE ONLY these specific categories:

1. INTERNAL TOOLS (workspace/productivity apps, not public content):
   - Google Docs/Sheets/Slides/Drive (docs.google.com, drive.google.com, share.google)
   - Notion workspace pages (notion.so with private content)
   - Figma files (figma.com)
   - Jira/Confluence (atlassian.net)
   - Canva designs (canva.com/design)
   - Slack permalinks

2. VIDEO/AUDIO (reading-focused newsletter):
   - YouTube (youtube.com, youtu.be)
   - Vimeo, Twitch, podcasts

3. TWITTER/X ONLY (not scrapable):
   - x.com, twitter.com
   - NOTE: LinkedIn is NOT excluded. LinkedIn posts ARE scrapable.

4. AUTH/TRANSACTIONAL pages:
   - Login pages, confirmation tokens, password resets
   - URLs with "confirm", "token=", "verify", "unsubscribe"

5. OBVIOUS NON-CONTENT:
   - Image files (.png, .jpg, .gif direct links)
   - File downloads (.zip, .pdf direct links)

---

ALWAYS COLLECT (even without metadata):

- GitHub repos/gists (github.com, gist.github.com) - developers share code there
- LinkedIn posts (linkedin.com) - professionals share knowledge, IS scrapable
- Blog platforms (medium.com, dev.to, substack.com, brunch.co.kr, velog.io, tistory.com)
- Tech news (news.hada.io, news.ycombinator.com, techcrunch.com)
- Any unknown domain - might be interesting, we'll scrape and find out
- Product/tool pages - developers share useful tools

---

CRITICAL: Missing metadata (no title/description) is NOT a reason to exclude.
We will scrape the content later. If someone shared it, it's probably worth checking.

OUTPUT (JSON only):
{
  "content_type": "article|social|reference|internal|media|other",
  "technical_depth": "shallow|moderate|deep|unknown",
  "should_collect": true|false,
  "reasoning": "Brief reason"
}

When uncertain, set should_collect: true.`;
}

function getDefaultClassification(url: string): ContentClassification {
  const urlLower = url.toLowerCase();

  const internalPatterns = [
    'docs.google.com', 'drive.google.com', 'share.google',
    'sheets.google.com', 'slides.google.com',
    'notion.so', 'figma.com', 'canva.com/design',
    'atlassian.net', 'jira', 'confluence',
    'slack.com/archives',
  ];
  if (internalPatterns.some(p => urlLower.includes(p))) {
    return {
      contentType: 'internal',
      technicalDepth: 'none',
      actionability: 'none',
      shouldCollect: false,
      reasoning: 'Internal workspace tool',
    };
  }

  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || urlLower.includes('vimeo.com')) {
    return {
      contentType: 'media',
      technicalDepth: 'moderate',
      actionability: 'awareness',
      shouldCollect: false,
      reasoning: 'Video content excluded',
    };
  }

  if (urlLower.includes('x.com') || urlLower.includes('twitter.com')) {
    return {
      contentType: 'social',
      technicalDepth: 'unknown',
      actionability: 'awareness',
      shouldCollect: false,
      reasoning: 'Twitter/X excluded - not scrapable',
    };
  }

  if (urlLower.includes('/confirm') || urlLower.includes('token=') || urlLower.includes('/verify') || urlLower.includes('/unsubscribe')) {
    return {
      contentType: 'other',
      technicalDepth: 'none',
      actionability: 'none',
      shouldCollect: false,
      reasoning: 'Auth/transactional page',
    };
  }

  return {
    contentType: 'article',
    technicalDepth: 'shallow',
    actionability: 'awareness',
    shouldCollect: true,
    reasoning: 'Default: collect and scrape',
  };
}

export async function classifyContent(
  messageText: string,
  url: string,
  title: string,
  description: string,
  config: AIConfig
): Promise<ContentClassification> {
  if (!config.apiKey) {
    return getDefaultClassification(url);
  }

  const prompt = buildClassificationPrompt(messageText, url, title, description);

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
        return getDefaultClassification(url);
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getDefaultClassification(url);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      contentType: parsed.content_type as ContentType,
      technicalDepth: parsed.technical_depth as TechnicalDepth,
      actionability: parsed.actionability as Actionability || 'awareness',
      shouldCollect: parsed.should_collect === true,
      reasoning: parsed.reasoning || '',
    };
  } catch {
    return getDefaultClassification(url);
  }
}
