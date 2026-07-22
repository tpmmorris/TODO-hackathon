import type { FHIRSlot, Practice, TriageRequest, TriageResponse } from '@gpnow/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

const mockPractices: Practice[] = [
  {
    odsCode: 'G82001',
    name: 'Riverside Medical Centre',
    address: '14 Mill Road, Cambridge',
    latitude: 52.2053,
    longitude: 0.1218,
    phone: '01223 555 010',
    openingHours: '08:00 - 18:30'
  },
  {
    odsCode: 'G82002',
    name: 'Parker Street Health',
    address: '82 Parker Street, Cambridge',
    latitude: 52.1975,
    longitude: 0.1282,
    phone: '01223 555 011',
    openingHours: '08:00 - 17:00'
  },
  {
    odsCode: 'G82003',
    name: 'Chesterton Family Practice',
    address: '6 Green Lane, Cambridge',
    latitude: 52.222,
    longitude: 0.141,
    phone: '01223 555 012',
    openingHours: '08:00 - 18:00'
  }
];

const mockSlots: FHIRSlot[] = [
  { id: 'slot-101', odsCode: 'G82001', startTime: '2026-07-22T14:20:00Z', practitionerRole: 'GP', status: 'FREE' },
  { id: 'slot-102', odsCode: 'G82001', startTime: '2026-07-22T15:10:00Z', practitionerRole: 'Advanced Nurse Practitioner', status: 'FREE' },
  { id: 'slot-103', odsCode: 'G82002', startTime: '2026-07-22T16:00:00Z', practitionerRole: 'GP', status: 'FREE' },
  { id: 'slot-104', odsCode: 'G82003', startTime: '2026-07-23T09:30:00Z', practitionerRole: 'GP', status: 'FREE' }
];

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) throw new Error(`GPNow API returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getPractices(): Promise<Practice[]> {
  try {
    return await request<Practice[]>('/api/practices');
  } catch {
    return mockPractices;
  }
}

export async function getSlots(odsCode?: string): Promise<FHIRSlot[]> {
  try {
    const query = odsCode ? `?odsCode=${encodeURIComponent(odsCode)}` : '';
    return await request<FHIRSlot[]>(`/api/slots${query}`);
  } catch {
    return odsCode ? mockSlots.filter((slot) => slot.odsCode === odsCode) : mockSlots;
  }
}

export async function submitTriage(input: TriageRequest): Promise<TriageResponse> {
  try {
    return await request<TriageResponse>('/api/triage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    });
  } catch {
    const isEmergency = /chest pain|can't breathe|cannot breathe|severe bleeding|unconscious/i.test(input.symptoms);
    return {
      requestId: `mock-${Date.now()}`,
      redFlag: {
        isRedFlag: isEmergency,
        severity: isEmergency ? 'HIGH' : 'LOW',
        matchedGuideline: isEmergency ? 'NHS 111 urgent red-flag guidance' : undefined,
        actionRequired: isEmergency ? '999_EMERGENCY' : 'NONE'
      },
      slots: await getSlots(input.odsCode),
      status: isEmergency ? 'REQUIRES_EMERGENCY_CARE' : 'READY_TO_BOOK',
      disclaimer: 'This prototype is not a diagnosis. Call 999 for a life-threatening emergency.'
    };
  }
}

export { mockPractices, mockSlots };
