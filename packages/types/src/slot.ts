export type SlotStatus = 'FREE' | 'LOCKED' | 'BOOKED';

export type LocationType = 'GP' | 'WALK_IN' | 'URGENT_CARE';

/** A deliberately small FHIR Slot projection shared by the UI and Worker. */
export interface FHIRSlot {
  id: string;
  odsCode: string;
  startTime: string;
  practitionerRole: string;
  status: SlotStatus;
  locationName: string;
  locationAddress: string;
  locationPostcode?: string;
  locationType: LocationType;
  requiresRegistration: boolean;
  acceptsOutOfArea?: boolean;
  phone?: string;
}

export interface SlotLockState {
  slotId: string;
  status: 'AVAILABLE' | 'LOCKED' | 'EXPIRED' | 'BOOKED';
  lockedBy?: string;
  expiresAt?: string;
}
