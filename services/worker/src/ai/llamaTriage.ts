import type { TriageRecommendation } from '@gpnow/types';
import type { Env } from '../env';

export type TriageModelResult = TriageRecommendation;

const triageSystemPrompt = `You are a cautious NHS care-navigation assistant. Summarise symptoms without diagnosing.
Return JSON with exactly these keys: summary, urgency (ROUTINE, SOON, or URGENT), suggestedAction.
Never downplay chest pain, severe breathing difficulty, loss of consciousness, stroke symptoms, or self-harm risk.
Tell the patient to use 999 or NHS 111 when appropriate.`;

function safeFallback(text: string): TriageModelResult {
  return {
    summary: text.trim() || 'No symptom narrative was provided.',
    urgency: 'SOON',
    suggestedAction: 'Arrange a GP or NHS 111 assessment based on clinical advice.'
  };
}

export async function transcribeAudio(audio: ArrayBuffer, env: Env): Promise<string> {
  if (!env.AI) throw new Error('Workers AI is not configured');
  if (audio.byteLength === 0) throw new Error('Audio payload is empty');
  const result = (await env.AI.run('@cf/openai/whisper', {
    audio: [...new Uint8Array(audio)]
  })) as { text?: string };
  const text = result.text?.trim();
  if (!text) throw new Error('Whisper returned no transcript');
  return text;
}

export async function analyzeSymptoms(text: string, env: Env): Promise<TriageModelResult> {
  const fallback = safeFallback(text);
  try {
    if (!env.AI || !text.trim()) return fallback;
    const result = (await env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: triageSystemPrompt },
        { role: 'user', content: text }
      ],
      max_tokens: 300,
      temperature: 0.1
    })) as { response?: string };
    const response = result.response?.trim();
    if (!response) return fallback;
    const parsed = JSON.parse(response) as Partial<TriageModelResult>;
    if (typeof parsed.summary !== 'string' || typeof parsed.suggestedAction !== 'string') return fallback;
    const urgency = parsed.urgency === 'ROUTINE' || parsed.urgency === 'URGENT' ? parsed.urgency : 'SOON';
    return { summary: parsed.summary, urgency, suggestedAction: parsed.suggestedAction };
  } catch {
    return fallback;
  }
}
