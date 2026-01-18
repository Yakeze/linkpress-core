export interface Article {
  id: string;
  url: string;
  title: string;
  description?: string;
  content?: string;
  summary?: string;
  tags: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  readingTimeMinutes?: number;
  image?: string;
  sourceLabel?: string;
  sourceType: 'slack' | 'manual' | 'import';
  sourceId?: string;
  createdAt: Date;
  processedAt?: Date;
  readAt?: Date;
}

export type AIProvider = 'anthropic' | 'openai' | 'gemini';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  language?: string;
}

export interface ArticleSummary {
  headline: string;
  tldr: string;
  keyPoints: string[];
  whyItMatters: string;
  keyQuote?: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export type ContentType = 'article' | 'announcement' | 'discussion' | 'reference' | 'social' | 'media' | 'internal' | 'other';
export type TechnicalDepth = 'none' | 'shallow' | 'moderate' | 'deep' | 'expert' | 'unknown';
export type Actionability = 'none' | 'awareness' | 'applicable' | 'reference';

export interface ContentClassification {
  contentType: ContentType;
  technicalDepth: TechnicalDepth;
  actionability: Actionability;
  shouldCollect: boolean;
  reasoning: string;
}

export interface ModelInfo {
  id: string;
  name: string;
}

export interface SlackAuthConfig {
  token: string;
  cookie: string;
}

export interface SlackUser {
  id: string;
  name: string;
  realName: string;
  team: string;
}

export interface SlackConversation {
  id: string;
  name: string;
  isPrivate: boolean;
  isIm: boolean;
  isMpim: boolean;
  user?: string;
}

export interface SlackMessage {
  ts: string;
  text: string;
  user?: string;
  type: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isSelfDM: boolean;
}

export interface SlackSource {
  id: string;
  workspace: string;
  token: string;
  cookie: string;
  channels: SlackChannel[];
  addedAt: Date;
}

export interface ExtractedLink {
  url: string;
  messageText: string;
}

export interface ScrapedContent {
  title: string;
  description: string;
  content: string;
  siteName?: string;
  image?: string;
  sourceLabel?: string;
}
