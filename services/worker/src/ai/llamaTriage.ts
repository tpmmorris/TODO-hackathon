import type { TriageRecommendation } from '@gpnow/types';
import type { Env } from '../env';

export type TriageModelResult = TriageRecommendation;

const triageSystemPrompt = `You are a cautious NHS care-navigation assistant. Summarise symptoms without diagnosing.
Return JSON with exactly these keys: summary, urgency (ROUTINE, SOON, or URGENT), recommendedRoute (GP_APPOINTMENT, WALK_IN_CENTRE, URGENT_CARE, PHARMACY_ADVICE, NHS_111, or 999_EMERGENCY), suggestedAction, generalAdvice (an array of 2 to 4 safe, non-diagnostic advice strings).
Never downplay chest pain, severe breathing difficulty, loss of consciousness, stroke symptoms, or self-harm risk.
Tell the patient to use 999 or NHS 111 when appropriate. Do not prescribe, provide medication doses, or claim a diagnosis.`;

function safeFallback(text: string): TriageModelResult {
  return {
    summary: text.trim() || 'No symptom narrative was provided.',
    urgency: 'SOON',
    recommendedRoute: 'GP_APPOINTMENT',
    suggestedAction: 'Arrange a GP or NHS 111 assessment based on clinical advice.',
    generalAdvice: ['Rest and monitor how your symptoms change.', 'Seek urgent help if symptoms become severe or rapidly worsen.']
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
    if (typeof parsed.summary !== 'string' || typeof parsed.suggestedAction !== 'string' || !Array.isArray(parsed.generalAdvice)) return fallback;
    const urgency = parsed.urgency === 'ROUTINE' || parsed.urgency === 'URGENT' ? parsed.urgency : 'SOON';
    const routes = ['GP_APPOINTMENT', 'WALK_IN_CENTRE', 'URGENT_CARE', 'PHARMACY_ADVICE', 'NHS_111', '999_EMERGENCY'] as const;
    const recommendedRoute = routes.includes(parsed.recommendedRoute as (typeof routes)[number])
      ? parsed.recommendedRoute as (typeof routes)[number]
      : 'GP_APPOINTMENT';
    const generalAdvice = parsed.generalAdvice.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 4);
    if (generalAdvice.length < 2) return fallback;
    return { summary: parsed.summary, urgency, recommendedRoute, suggestedAction: parsed.suggestedAction, generalAdvice };
  } catch {
    return fallback;
  }
}
