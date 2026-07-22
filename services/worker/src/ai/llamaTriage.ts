import type { PatientLanguage, TriageRecommendation } from '@gpnow/types';
import type { Env } from '../env';

export type TriageModelResult = TriageRecommendation;

const languageNames: Record<PatientLanguage, string> = {
  en: 'English',
  cy: 'Welsh (Cymraeg)',
  pl: 'Polish (Polski)'
};

function buildTriageSystemPrompt(language: PatientLanguage): string {
  return `You are a cautious NHS care-navigation assistant. Summarise symptoms without diagnosing.
Return JSON with exactly these keys: summary, urgency (ROUTINE, SOON, or URGENT), suggestedAction.
The urgency value must stay in English as one of ROUTINE, SOON, or URGENT.
Write the summary and suggestedAction text in ${languageNames[language]}.
Never downplay chest pain, severe breathing difficulty, loss of consciousness, stroke symptoms, or self-harm risk.
Tell the patient to use 999 or NHS 111 when appropriate.`;
}

function safeFallback(text: string): TriageModelResult {
  return {
    summary: text.trim() || 'No symptom narrative was provided.',
    urgency: 'SOON',
    suggestedAction: 'Arrange a GP or NHS 111 assessment based on clinical advice.'
  };
}

export async function transcribeAudio(
  audio: ArrayBuffer,
  env: Env,
  language?: PatientLanguage
): Promise<string> {
  if (!env.AI) throw new Error('Workers AI is not configured');
  if (audio.byteLength === 0) throw new Error('Audio payload is empty');
  const result = (await env.AI.run('@cf/openai/whisper', {
    audio: [...new Uint8Array(audio)],
    // ISO-639-1 hint; ignored by models that only auto-detect, honoured otherwise.
    ...(language ? { language } : {})
  })) as { text?: string };
  const text = result.text?.trim();
  if (!text) throw new Error('Whisper returned no transcript');
  return text;
}

export async function analyzeSymptoms(
  text: string,
  env: Env,
  language: PatientLanguage = 'en'
): Promise<TriageModelResult> {
  const fallback = safeFallback(text);
  try {
    if (!env.AI || !text.trim()) return fallback;
    const result = (await env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: buildTriageSystemPrompt(language) },
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
