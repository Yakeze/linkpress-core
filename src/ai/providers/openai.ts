import OpenAI from 'openai';

export async function callOpenAI(apiKey: string, model: string, prompt: string): Promise<string> {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model,
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.choices[0]?.message?.content || '';
}
