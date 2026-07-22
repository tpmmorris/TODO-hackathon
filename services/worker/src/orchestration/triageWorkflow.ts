import type {
  FHIRSlot,
  PatientLanguage,
  RedFlagResult,
  TriageRecommendation,
  TriageRequest,
  TriageResponse
} from '@gpnow/types';
import { WorkflowEntrypoint } from 'cloudflare:workers';
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { analyzeSymptoms } from '../ai/llamaTriage';
import { checkRedFlags } from '../ai/vectorizeGuard';
import { getNearbySlots, getWalkInAndUrgentCareSlots } from '../data/d1Db';
import { createSbarReport } from '../data/r2Storage';
import type { Env } from '../env';

export interface TriageWorkflowParams {
  request: TriageRequest;
}

function statusFor(redFlag: RedFlagResult): TriageResponse['status'] {
  return redFlag.actionRequired === '999_EMERGENCY'
    ? 'REQUIRES_EMERGENCY_CARE'
    : redFlag.actionRequired === '111_TRANSFER'
      ? 'TRANSFERRED_TO_111'
      : 'READY_TO_BOOK';
}

interface SafetyMessages {
  emergency999: string;
  transfer111: string;
  urgentRedFlag: string;
}

/**
 * Deterministic, translator-independent safety copy. These override any model
 * output on a red flag, so they must be authored directly per language.
 */
const safetyMessages: Record<PatientLanguage, SafetyMessages> = {
  en: {
    emergency999: 'Call 999 now. Do not wait for a GP appointment.',
    transfer111: 'Contact NHS 111 now for urgent clinical assessment.',
    urgentRedFlag: 'Seek urgent clinical advice through NHS 111.'
  },
  cy: {
    emergency999: 'Ffoniwch 999 nawr. Peidiwch ag aros am apwyntiad meddyg teulu.',
    transfer111: 'Cysylltwch â GIG 111 nawr am asesiad clinigol brys.',
    urgentRedFlag: 'Ceisiwch gyngor clinigol brys drwy GIG 111.'
  },
  pl: {
    emergency999: 'Zadzwoń teraz pod 999. Nie czekaj na wizytę u lekarza.',
    transfer111: 'Skontaktuj się teraz z NHS 111 w celu pilnej oceny klinicznej.',
    urgentRedFlag: 'Zasięgnij pilnej porady klinicznej przez NHS 111.'
  }
};

function enforceSafety(
  redFlag: RedFlagResult,
  recommendation: TriageRecommendation,
  language: PatientLanguage
): TriageRecommendation {
  const messages = safetyMessages[language] ?? safetyMessages.en;
  if (redFlag.actionRequired === '999_EMERGENCY') {
    return { summary: recommendation.summary, urgency: 'URGENT', suggestedAction: messages.emergency999 };
  }
  if (redFlag.actionRequired === '111_TRANSFER') {
    return { summary: recommendation.summary, urgency: 'URGENT', suggestedAction: messages.transfer111 };
  }
  if (redFlag.isRedFlag) {
    return { summary: recommendation.summary, urgency: 'URGENT', suggestedAction: messages.urgentRedFlag };
  }
  return recommendation;
}

async function aggregateSlots(request: TriageRequest, redFlag: RedFlagResult, env: Env): Promise<FHIRSlot[]> {
  if (redFlag.isRedFlag) return [];
  const slotQueries: Promise<FHIRSlot[]>[] = [getWalkInAndUrgentCareSlots(env)];
  if (request.registeredOdsCode) slotQueries.push(getNearbySlots(request.registeredOdsCode, env));
  const slotArrays = await Promise.all(slotQueries);
  return slotArrays
    .flat()
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

function buildResponse(
  request: TriageRequest,
  redFlag: RedFlagResult,
  recommendation: TriageRecommendation,
  slots: FHIRSlot[]
): TriageResponse {
  const language = request.language ?? 'en';
  const safeRecommendation = enforceSafety(redFlag, recommendation, language);
  return {
    requestId: crypto.randomUUID(),
    redFlag,
    recommendation: safeRecommendation,
    slots,
    report: createSbarReport(request.patientId, request.symptoms, safeRecommendation.suggestedAction),
    status: statusFor(redFlag),
    disclaimer: 'This service supports care navigation and is not a diagnosis.'
  };
}

/** Synchronous HTTP path used by the API while sharing the Workflow stages. */
export async function executeTriage(request: TriageRequest, env: Env): Promise<TriageResponse> {
  const language = request.language ?? 'en';
  const redFlag = await checkRedFlags(request.symptoms, env);
  const recommendation = redFlag.actionRequired === '999_EMERGENCY'
    ? { summary: request.symptoms, urgency: 'URGENT' as const, suggestedAction: 'Call 999 now.' }
    : await analyzeSymptoms(request.symptoms, env, language);
  const slots = await aggregateSlots(request, redFlag, env);
  return buildResponse(request, redFlag, recommendation, slots);
}

export class TriageWorkflow extends WorkflowEntrypoint<Env, TriageWorkflowParams> {
  async run(event: WorkflowEvent<TriageWorkflowParams>, step: WorkflowStep): Promise<TriageResponse> {
    const request = event.payload.request;
    const language = request.language ?? 'en';
    const redFlag = await step.do('run clinical safety guardrail', async () => checkRedFlags(request.symptoms, this.env));
    const recommendation = await step.do('generate care-navigation recommendation', async () =>
      redFlag.actionRequired === '999_EMERGENCY'
        ? { summary: request.symptoms, urgency: 'URGENT' as const, suggestedAction: 'Call 999 now.' }
        : analyzeSymptoms(request.symptoms, this.env, language)
    );
    const slots = await step.do('aggregate registration-aware care options', async () =>
      aggregateSlots(request, redFlag, this.env)
    );
    return buildResponse(request, redFlag, recommendation, slots);
  }
}
