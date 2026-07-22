import type { RedFlagResult } from '@gpnow/types';
import type { Env } from '../env';

interface GuidelineSignal {
  pattern: RegExp;
  severity: RedFlagResult['severity'];
  guideline: string;
  action: NonNullable<RedFlagResult['actionRequired']>;
}

const localSignals: GuidelineSignal[] = [
  {
    pattern: /chest pain|pressure in (my|the) chest|heart attack/i,
    severity: 'HIGH',
    guideline: 'NHS 111: possible cardiac emergency',
    action: '999_EMERGENCY'
  },
  {
    pattern: /cannot breathe|can not breathe|can't breathe|difficulty breathing|severe breathlessness/i,
    severity: 'HIGH',
    guideline: 'NHS 111: severe breathing difficulty',
    action: '999_EMERGENCY'
  },
  {
    pattern: /unconscious|not responding|severe bleeding|stroke symptoms|face drooping|weakness on one side/i,
    severity: 'HIGH',
    guideline: 'NHS 111: immediate emergency symptoms',
    action: '999_EMERGENCY'
  },
  {
    pattern: /overdose|taken too many|poisoned|suicid|harm myself|self harm/i,
    severity: 'HIGH',
    guideline: 'NHS 111: immediate safety support',
    action: '999_EMERGENCY'
  },
  {
    pattern: /very high fever|confusion|dehydrated|vomiting blood|blood in stool/i,
    severity: 'MEDIUM',
    guideline: 'NHS 111: urgent clinical assessment',
    action: '111_TRANSFER'
  }
];

function localCheck(text: string): RedFlagResult {
  const signal = localSignals.find(({ pattern }) => pattern.test(text));
  if (!signal) return { isRedFlag: false, severity: 'LOW', actionRequired: 'NONE' };
  return {
    isRedFlag: true,
    severity: signal.severity,
    matchedGuideline: signal.guideline,
    actionRequired: signal.action
  };
}

/**
 * Checks a symptom narrative against NHS guidance embeddings, with a deterministic
 * local safety net for an unseeded Vectorize index or unavailable AI binding.
 */
export async function checkRedFlags(text: string, env: Env): Promise<RedFlagResult> {
  const fallback = localCheck(text);
  if (fallback.isRedFlag) return fallback;

  try {
    if (!env.AI || !env.VECTOR_INDEX || !text.trim()) return fallback;
    const embeddingResult = (await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: [text]
    })) as { data?: number[][] };
    const vector = embeddingResult.data?.[0];
    if (!vector) return fallback;

    const result = await env.VECTOR_INDEX.query(vector, {
      topK: 1,
      returnMetadata: 'all'
    });
    const match = result.matches?.[0];
    if (!match || typeof match.score !== 'number' || match.score < 0.82) return fallback;

    const metadata = match.metadata as Record<string, unknown> | undefined;
    return {
      isRedFlag: true,
      severity: metadata?.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
      matchedGuideline: typeof metadata?.guideline === 'string' ? metadata.guideline : 'NHS 111 clinical guidance',
      actionRequired: metadata?.action === '999_EMERGENCY' ? '999_EMERGENCY' : '111_TRANSFER'
    };
  } catch {
    // A missing index must fail closed to the deterministic keyword guardrail.
    return fallback;
  }
}
