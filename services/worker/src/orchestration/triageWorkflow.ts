import type { FHIRSlot, RedFlagResult, TriageRecommendation, TriageRequest, TriageResponse } from '@gpnow/types';
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

function enforceSafety(redFlag: RedFlagResult, recommendation: TriageRecommendation): TriageRecommendation {
  if (redFlag.actionRequired === '999_EMERGENCY') {
    return {
      summary: recommendation.summary,
      urgency: 'URGENT',
      recommendedRoute: '999_EMERGENCY',
      suggestedAction: 'Call 999 now. Do not wait for a GP appointment.',
      generalAdvice: ['Do not drive yourself to hospital.', 'Keep your phone nearby and follow the emergency operator instructions.']
    };
  }
  if (redFlag.actionRequired === '111_TRANSFER') {
    return {
      summary: recommendation.summary,
      urgency: 'URGENT',
      recommendedRoute: 'NHS_111',
      suggestedAction: 'Contact NHS 111 now for urgent clinical assessment.',
      generalAdvice: ['Contact NHS 111 now.', 'Do not wait for a routine appointment if symptoms worsen.']
    };
  }
  if (redFlag.isRedFlag) {
    return {
      summary: recommendation.summary,
      urgency: 'URGENT',
      recommendedRoute: 'NHS_111',
      suggestedAction: 'Seek urgent clinical advice through NHS 111.',
      generalAdvice: ['Contact NHS 111 for urgent advice.', 'Seek emergency help if symptoms become life-threatening.']
    };
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
  const safeRecommendation = enforceSafety(redFlag, recommendation);
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
  const redFlag = await checkRedFlags(request.symptoms, env);
  const recommendation = redFlag.actionRequired === '999_EMERGENCY'
    ? { summary: request.symptoms, urgency: 'URGENT' as const, recommendedRoute: '999_EMERGENCY' as const, suggestedAction: 'Call 999 now.', generalAdvice: ['Do not drive yourself to hospital.', 'Follow the emergency operator instructions.'] }
    : await analyzeSymptoms(request.symptoms, env);
  const slots = await aggregateSlots(request, redFlag, env);
  return buildResponse(request, redFlag, recommendation, slots);
}

export class TriageWorkflow extends WorkflowEntrypoint<Env, TriageWorkflowParams> {
  async run(event: WorkflowEvent<TriageWorkflowParams>, step: WorkflowStep): Promise<TriageResponse> {
    const request = event.payload.request;
    const redFlag = await step.do('run clinical safety guardrail', async () => checkRedFlags(request.symptoms, this.env));
    const recommendation = await step.do('generate care-navigation recommendation', async () =>
      redFlag.actionRequired === '999_EMERGENCY'
        ? { summary: request.symptoms, urgency: 'URGENT' as const, recommendedRoute: '999_EMERGENCY' as const, suggestedAction: 'Call 999 now.', generalAdvice: ['Do not drive yourself to hospital.', 'Follow the emergency operator instructions.'] }
        : analyzeSymptoms(request.symptoms, this.env)
    );
    const slots = await step.do('aggregate registration-aware care options', async () =>
      aggregateSlots(request, redFlag, this.env)
    );
    return buildResponse(request, redFlag, recommendation, slots);
  }
}
