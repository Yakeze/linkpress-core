import Anthropic from '@anthropic-ai/sdk';

export async function callAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model,
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.content[0].type === 'text' ? response.content[0].text : '';
}
