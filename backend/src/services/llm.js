import 'dotenv/config';
import OpenAI from 'openai';

const {
  OPENAI_API_KEY,
  OPENAI_MODEL = 'gpt-4.1-mini',
} = process.env;

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Простой шаблон промпта
export function buildPredictionPrompt({ lang = 'ru' } = {}) {
  // Короткое дружелюбное предсказание, 1–2 предложения, без опасных советов
  if (lang.startsWith('ru')) {
    return `Сгенерируй очень краткое, позитивное "предсказание на час" (1–2 предложения), без советов по здоровью, финансам и рисков. Без эмодзи.`;
  }
  return `Generate a very short, positive "hourly fortune" (1–2 sentences), avoiding health/finance/risk advice. No emojis.`;
}

export async function generatePrediction({ lang }) {
  if (!openai) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const prompt = buildPredictionPrompt({ lang });

  // Используем Responses API
  const resp = await openai.responses.create({
    model: OPENAI_MODEL,
    input: prompt,
  });

  // Унифицированный способ достать текст
  const text =
    resp.output_text ??
    resp.content?.[0]?.text ??
    resp.choices?.[0]?.message?.content ??
    '';

  // Токены и финиш-резон если доступны (в разных релизах структура может отличаться)
  const usage = resp.usage ?? resp?.prompt?.usage ?? {};
  const finishReason =
    resp.finish_reason ??
    resp.choices?.[0]?.finish_reason ??
    null;

  return {
    text: text?.trim() || 'Сегодня тебя ждёт тёплый час. Оглянись: хорошее уже рядом.',
    model: OPENAI_MODEL,
    usage_prompt_tokens: usage.prompt_tokens ?? null,
    usage_completion_tokens: usage.completion_tokens ?? null,
    finish_reason: finishReason,
    prompt_version: 'v1',
  };
}
