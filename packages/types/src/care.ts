import type { FHIRSlot } from './slot';
import type { PharmacyWithStock, Practice, PrescribingActivity } from './nhs';

export interface CareOptionsRequest {
  postcode: string;
  registeredOdsCode?: string;
  medicine?: string;
  includePrescribing?: boolean;
}

export interface CareOptionsResponse {
  practices: Practice[];
  slots: FHIRSlot[];
  pharmacies: PharmacyWithStock[];
  prescribing?: PrescribingActivity;
}
