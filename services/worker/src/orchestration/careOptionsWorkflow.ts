import type { CareOptionsRequest, CareOptionsResponse, FHIRSlot } from '@gpnow/types';
import { WorkflowEntrypoint } from 'cloudflare:workers';
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { getNearbyPharmacies, getNearbySlots, getPractices, getPracticesByLocation, getWalkInAndUrgentCareSlots } from '../data/d1Db';
import { getPrescribingSummary } from '../data/openPrescribing';
import { geocodePostcode } from '../lib/geo';
import type { Env } from '../env';

export interface CareOptionsWorkflowParams {
  request: CareOptionsRequest;
}

async function getSlots(request: CareOptionsRequest, env: Env): Promise<FHIRSlot[]> {
  const slotQueries: Promise<FHIRSlot[]>[] = [getWalkInAndUrgentCareSlots(env)];
  if (request.registeredOdsCode) slotQueries.push(getNearbySlots(request.registeredOdsCode, env));
  const slotArrays = await Promise.all(slotQueries);
  return slotArrays.flat().sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

export async function executeCareOptions(request: CareOptionsRequest, env: Env): Promise<CareOptionsResponse> {
  const { latitude, longitude } = await geocodePostcode(request.postcode);
  const [practices, slots, pharmacies, prescribing] = await Promise.all([
    getPracticesByLocation(latitude, longitude, 5, env),
    getSlots(request, env),
    request.medicine?.trim()
      ? getNearbyPharmacies(latitude, longitude, request.medicine, 5, env)
      : Promise.resolve([]),
    request.includePrescribing && request.registeredOdsCode
      ? getPrescribingSummary(request.registeredOdsCode)
      : Promise.resolve(undefined)
  ]);
  return { practices, slots, pharmacies, prescribing };
}

export class CareOptionsWorkflow extends WorkflowEntrypoint<Env, CareOptionsWorkflowParams> {
  async run(event: WorkflowEvent<CareOptionsWorkflowParams>, step: WorkflowStep): Promise<CareOptionsResponse> {
    const request = event.payload.request;
    const coordinates = await step.do('resolve postcode location', async () => geocodePostcode(request.postcode));
    const practices = await step.do('find nearby care locations', async () =>
      getPracticesByLocation(coordinates.latitude, coordinates.longitude, 5, this.env)
    );
    const slots = await step.do('aggregate GP and urgent care slots', async () => getSlots(request, this.env));
    const pharmacies = await step.do('find nearby medicine stock', async () =>
      request.medicine?.trim()
        ? getNearbyPharmacies(coordinates.latitude, coordinates.longitude, request.medicine, 5, this.env)
        : []
    );
    const prescribing = await step.do('load prescribing activity', async () =>
      request.includePrescribing && request.registeredOdsCode
        ? getPrescribingSummary(request.registeredOdsCode)
        : undefined
    );
    return { practices, slots, pharmacies, prescribing };
  }
}
