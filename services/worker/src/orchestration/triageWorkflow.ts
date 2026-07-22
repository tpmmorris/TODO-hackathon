import type { TriageRequest, TriageResponse } from '@gpnow/types';
import { WorkflowEntrypoint } from 'cloudflare:workers';
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { checkRedFlags } from '../ai/vectorizeGuard';
import { getNearbySlots } from '../data/d1Db';
import type { Env } from '../env';

export interface TriageWorkflowParams {
  request: TriageRequest;
}

export class TriageWorkflow extends WorkflowEntrypoint<Env, TriageWorkflowParams> {
  async run(event: WorkflowEvent<TriageWorkflowParams>, step: WorkflowStep): Promise<TriageResponse> {
    const redFlag = await step.do('run clinical safety guardrail', async () =>
      checkRedFlags(event.payload.request.symptoms, this.env)
    );
    const slots = await step.do('aggregate available GP slots', async () =>
      getNearbySlots(event.payload.request.odsCode ?? 'G82001', this.env)
    );

    const status = redFlag.actionRequired === '999_EMERGENCY'
      ? 'REQUIRES_EMERGENCY_CARE'
      : redFlag.actionRequired === '111_TRANSFER'
        ? 'TRANSFERRED_TO_111'
        : 'READY_TO_BOOK';

    return {
      requestId: crypto.randomUUID(),
      redFlag,
      slots,
      status,
      disclaimer: 'This service supports care navigation and is not a diagnosis.'
    };
  }
}
