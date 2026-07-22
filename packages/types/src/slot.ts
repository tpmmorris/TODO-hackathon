export type SlotStatus = 'FREE' | 'LOCKED' | 'BOOKED';

/** A deliberately small FHIR Slot projection shared by the UI and Worker. */
export interface FHIRSlot {
  id: string;
  odsCode: string;
  startTime: string;
  practitionerRole: string;
  status: SlotStatus;
}

export interface SlotLockState {
  slotId: string;
  status: 'AVAILABLE' | 'LOCKED' | 'EXPIRED' | 'BOOKED';
  lockedBy?: string;
  expiresAt?: string;
}
