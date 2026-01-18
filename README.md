# @linkpress/core

Core library for [LinkPress](https://github.com/mindori/linkpress) — the building blocks for AI-powered article processing.

[![npm version](https://img.shields.io/npm/v/@linkpress/core.svg)](https://www.npmjs.com/package/@linkpress/core)
[![license](https://img.shields.io/github/license/mindori/linkpress-core)](./LICENSE)

## What's Inside

| Module | Description |
|--------|-------------|
| **ai** | Multi-provider AI summarization & classification (Anthropic, OpenAI, Gemini) |
| **scraper** | URL content extraction with Cheerio |
| **slack** | Slack API client & link extraction utilities |

## Installation

```bash
npm install @linkpress/core
```

## Quick Start

### AI Summarization

```typescript
import { summarizeArticle } from '@linkpress/core';

const summary = await summarizeArticle(
  'Article Title',
  'Full article content...',
  'https://example.com/article',
  {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-5-20250929',
    language: 'English',
  }
);

console.log(summary.headline);    // Catchy headline
console.log(summary.tldr);        // 2-3 sentence summary
console.log(summary.keyPoints);   // Array of key points
console.log(summary.tags);        // ['AI', 'TypeScript', ...]
console.log(summary.difficulty);  // 'beginner' | 'intermediate' | 'advanced'
```

### Content Classification

```typescript
import { classifyContent } from '@linkpress/core';

const classification = await classifyContent(
  'Check out this great article about React hooks!',
  'https://blog.example.com/react-hooks',
  'Understanding React Hooks',
  'A deep dive into useState and useEffect',
  {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-5-20250929',
  }
);

if (classification.shouldCollect) {
  // Process the article
}
```

### URL Scraping

```typescript
import { scrapeUrl } from '@linkpress/core';

const content = await scrapeUrl('https://example.com/article');

console.log(content.title);       // Page title
console.log(content.description); // Meta description
console.log(content.content);     // Main text content
console.log(content.image);       // og:image URL
console.log(content.sourceLabel); // 'Blog' | 'GitHub' | 'Newsletter' | ...
```

### Slack Integration

```typescript
import { SlackClient, extractLinksFromMessages } from '@linkpress/core';

const client = new SlackClient({
  token: 'xoxc-...',
  cookie: 'xoxd-...',
});

// Get user info
const user = await client.getAuthUser();

// List conversations
const conversations = await client.getConversationsList();

// Get messages from a channel
const messages = await client.getConversationHistory('C01234567');

// Extract links from messages
const links = extractLinksFromMessages(messages);
// → [{ url: 'https://...', messageText: '...' }, ...]
```

## Module Imports

Import specific modules for tree-shaking:

```typescript
// Everything
import { summarizeArticle, scrapeUrl, SlackClient } from '@linkpress/core';

// AI only
import { summarizeArticle, classifyContent, fetchModels } from '@linkpress/core/ai';

// Scraper only
import { scrapeUrl, parseHtml } from '@linkpress/core/scraper';

// Slack only
import { SlackClient, extractLinksFromMessages } from '@linkpress/core/slack';
```

## API Reference

### AI Module

#### `summarizeArticle(title, content, url, config): Promise<ArticleSummary>`

Generate a magazine-style summary of an article.

**Returns:**
```typescript
interface ArticleSummary {
  headline: string;      // Catchy headline
  tldr: string;          // 2-3 sentence summary
  keyPoints: string[];   // 3-5 bullet points
  whyItMatters: string;  // Developer perspective
  keyQuote?: string;     // Memorable quote
  tags: string[];        // Topic tags
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}
```

#### `classifyContent(messageText, url, title, description, config): Promise<ContentClassification>`

Classify content for filtering decisions.

**Returns:**
```typescript
interface ContentClassification {
  contentType: 'article' | 'announcement' | 'discussion' | 'reference' | 'social' | 'media' | 'internal' | 'other';
  technicalDepth: 'none' | 'shallow' | 'moderate' | 'deep' | 'expert';
  actionability: 'none' | 'awareness' | 'applicable' | 'reference';
  shouldCollect: boolean;
  reasoning: string;
}
```

#### `fetchModels(provider, apiKey): Promise<ModelInfo[]>`

Fetch available models from an AI provider.

### Scraper Module

#### `scrapeUrl(url): Promise<ScrapedContent>`

Extract content from a URL.

**Returns:**
```typescript
interface ScrapedContent {
  title: string;
  description: string;
  content: string;
  siteName?: string;
  image?: string;
  sourceLabel?: string;  // 'Blog' | 'GitHub' | 'LinkedIn' | 'Newsletter' | 'Article'
}
```

### Slack Module

#### `SlackClient`

```typescript
const client = new SlackClient({ token, cookie });

await client.getAuthUser();                    // Get current user
await client.getConversationsList();           // List all conversations
await client.getConversationHistory(channelId); // Get messages
await client.searchConversations(query);       // Search channels
```

#### `extractLinksFromMessages(messages): ExtractedLink[]`

Extract URLs from Slack messages, filtering out internal tools and non-article links.


## Used By

[LinkPress CLI](https://github.com/mindori/linkpress) — Turn Slack links into a personal tech magazine


## Author

[Changmin (Chris) Kang](https://github.com/mindori)
