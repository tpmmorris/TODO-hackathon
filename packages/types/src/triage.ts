import type { FHIRSlot } from './slot';
import type { SBARReport } from './sbar';

export interface TriageRequest {
  patientId: string;
  symptoms: string;
  audioKey?: string;
  odsCode?: string;
  registeredOdsCode?: string;
  latitude?: number;
  longitude?: number;
  consentToProcess: boolean;
}

export type RedFlagSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export type RedFlagAction = '999_EMERGENCY' | '111_TRANSFER' | 'NONE';

export interface RedFlagResult {
  isRedFlag: boolean;
  severity: RedFlagSeverity;
  matchedGuideline?: string;
  actionRequired?: RedFlagAction;
}

export interface TriageResponse {
  requestId: string;
  redFlag: RedFlagResult;
  slots: FHIRSlot[];
  report?: SBARReport;
  status: 'REQUIRES_EMERGENCY_CARE' | 'TRANSFERRED_TO_111' | 'READY_TO_BOOK';
  disclaimer: string;
}
