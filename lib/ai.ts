import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '',
  dangerouslyAllowBrowser: true,
});

type Message = { role: 'user' | 'assistant'; content: string };

export async function generateText({
  messages,
}: {
  messages: Message[];
}): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
  });
  return response.choices[0]?.message?.content ?? '';
}

export async function generateObject<T>({
  messages,
  schema,
}: {
  messages: Message[];
  schema: z.ZodType<T>;
}): Promise<T> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      ...messages,
      { role: 'user' as const, content: 'Respond with valid JSON matching the requested schema exactly.' },
    ],
    response_format: { type: 'json_object' },
  });
  const text = response.choices[0]?.message?.content ?? '{}';
  return schema.parse(JSON.parse(text));
}
