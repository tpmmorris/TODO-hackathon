import type { FHIRSlot, PatientLanguage, RedFlagResult, TriageRecommendation, TriageRequest, TriageResponse } from '@gpnow/types';
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

interface SafetyMessages {
  emergency999: string;
  transfer111: string;
  urgentRedFlag: string;
  emergencyAdvice: string[];
  transferAdvice: string[];
  urgentAdvice: string[];
}

const safetyMessages: Record<PatientLanguage, SafetyMessages> = {
  en: {
    emergency999: 'Call 999 now. Do not wait for a GP appointment.',
    transfer111: 'Contact NHS 111 now for urgent clinical assessment.',
    urgentRedFlag: 'Seek urgent clinical advice through NHS 111.',
    emergencyAdvice: ['Do not drive yourself to hospital.', 'Keep your phone nearby and follow emergency operator instructions.'],
    transferAdvice: ['Contact NHS 111 now.', 'Do not wait for a routine appointment if symptoms worsen.'],
    urgentAdvice: ['Contact NHS 111 for urgent advice.', 'Seek emergency help if symptoms become life-threatening.']
  },
  cy: {
    emergency999: 'Ffoniwch 999 nawr. Peidiwch ag aros am apwyntiad meddyg teulu.',
    transfer111: 'Cysylltwch â GIG 111 nawr am asesiad clinigol brys.',
    urgentRedFlag: 'Ceisiwch gyngor clinigol brys drwy GIG 111.',
    emergencyAdvice: ['Peidiwch â gyrru eich hun i’r ysbyty.', 'Dilynwch gyfarwyddiadau’r gweithredwr brys.'],
    transferAdvice: ['Cysylltwch â GIG 111 nawr.', 'Peidiwch ag aros os bydd y symptomau’n gwaethygu.'],
    urgentAdvice: ['Cysylltwch â GIG 111 am gyngor brys.', 'Ceisiwch gymorth brys os bydd y symptomau’n peryglu bywyd.']
  },
  pl: {
    emergency999: 'Zadzwoń teraz pod 999. Nie czekaj na wizytę u lekarza.',
    transfer111: 'Skontaktuj się teraz z NHS 111 w celu pilnej oceny klinicznej.',
    urgentRedFlag: 'Zasięgnij pilnej porady klinicznej przez NHS 111.',
    emergencyAdvice: ['Nie prowadź samodzielnie do szpitala.', 'Postępuj zgodnie z instrukcjami operatora alarmowego.'],
    transferAdvice: ['Skontaktuj się teraz z NHS 111.', 'Nie czekaj, jeśli objawy się nasilą.'],
    urgentAdvice: ['Skontaktuj się z NHS 111 po pilną poradę.', 'Jeśli objawy zagrażają życiu, wezwij pomoc ratunkową.']
  }
};

function statusFor(redFlag: RedFlagResult): TriageResponse['status'] {
  return redFlag.actionRequired === '999_EMERGENCY'
    ? 'REQUIRES_EMERGENCY_CARE'
    : redFlag.actionRequired === '111_TRANSFER'
      ? 'TRANSFERRED_TO_111'
      : 'READY_TO_BOOK';
}

function enforceSafety(redFlag: RedFlagResult, recommendation: TriageRecommendation, language: PatientLanguage): TriageRecommendation {
  const messages = safetyMessages[language] ?? safetyMessages.en;
  if (redFlag.actionRequired === '999_EMERGENCY') {
    return { summary: recommendation.summary, urgency: 'URGENT', recommendedRoute: '999_EMERGENCY', suggestedAction: messages.emergency999, generalAdvice: messages.emergencyAdvice };
  }
  if (redFlag.actionRequired === '111_TRANSFER') {
    return { summary: recommendation.summary, urgency: 'URGENT', recommendedRoute: 'NHS_111', suggestedAction: messages.transfer111, generalAdvice: messages.transferAdvice };
  }
  if (redFlag.isRedFlag) {
    return { summary: recommendation.summary, urgency: 'URGENT', recommendedRoute: 'NHS_111', suggestedAction: messages.urgentRedFlag, generalAdvice: messages.urgentAdvice };
  }
  return recommendation;
}

async function aggregateSlots(request: TriageRequest, redFlag: RedFlagResult, env: Env): Promise<FHIRSlot[]> {
  if (redFlag.isRedFlag) return [];
  const slotQueries: Promise<FHIRSlot[]>[] = [getWalkInAndUrgentCareSlots(env)];
  if (request.registeredOdsCode) slotQueries.push(getNearbySlots(request.registeredOdsCode, env));
  const slotArrays = await Promise.all(slotQueries);
  return slotArrays.flat().sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

function buildResponse(request: TriageRequest, redFlag: RedFlagResult, recommendation: TriageRecommendation, slots: FHIRSlot[]): TriageResponse {
  const safeRecommendation = enforceSafety(redFlag, recommendation, request.language ?? 'en');
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

export async function executeTriage(request: TriageRequest, env: Env): Promise<TriageResponse> {
  const redFlag = await checkRedFlags(request.symptoms, env);
  const recommendation = redFlag.actionRequired === '999_EMERGENCY'
    ? { summary: request.symptoms, urgency: 'URGENT' as const, recommendedRoute: '999_EMERGENCY' as const, suggestedAction: 'Call 999 now.', generalAdvice: ['Do not drive yourself to hospital.', 'Follow the emergency operator instructions.'] }
    : await analyzeSymptoms(request.symptoms, env, request.language ?? 'en');
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
        : analyzeSymptoms(request.symptoms, this.env, request.language ?? 'en')
    );
    const slots = await step.do('aggregate registration-aware care options', async () => aggregateSlots(request, redFlag, this.env));
    return buildResponse(request, redFlag, recommendation, slots);
  }
}
