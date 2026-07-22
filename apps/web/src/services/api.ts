import type { FHIRSlot, PharmacyWithStock, Practice, TriageRequest, TriageResponse } from '@gpnow/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

const mockPractices: Practice[] = [
  {
    odsCode: 'G82001',
    name: 'Riverside Medical Centre',
    address: '14 Mill Road, Cambridge',
    postcode: 'CB1 2AA',
    type: 'GP',
    acceptsOutOfArea: false,
    latitude: 52.2053,
    longitude: 0.1218,
    phone: '01223 555 010',
    openingHours: '08:00 - 18:30'
  },
  {
    odsCode: 'G82002',
    name: 'Parker Street Health',
    address: '82 Parker Street, Cambridge',
    postcode: 'CB2 1DP',
    type: 'GP',
    acceptsOutOfArea: false,
    latitude: 52.1975,
    longitude: 0.1282,
    phone: '01223 555 011',
    openingHours: '08:00 - 17:00'
  },
  {
    odsCode: 'G82003',
    name: 'Chesterton Family Practice',
    address: '6 Green Lane, Cambridge',
    postcode: 'CB4 1LL',
    type: 'GP',
    acceptsOutOfArea: false,
    latitude: 52.222,
    longitude: 0.141,
    phone: '01223 555 012',
    openingHours: '08:00 - 18:00'
  },
  {
    odsCode: 'G82004',
    name: 'Trumpington Health Centre',
    address: '2 Anstey Way, Cambridge',
    postcode: 'CB2 9JE',
    type: 'GP',
    acceptsOutOfArea: true,
    latitude: 52.176,
    longitude: 0.1155,
    phone: '01223 555 013',
    openingHours: '08:00 - 18:00'
  },
  {
    odsCode: 'G82005',
    name: 'Milton Surgery',
    address: '48 Coles Road, Cambridge',
    postcode: 'CB24 6BL',
    type: 'GP',
    acceptsOutOfArea: false,
    latitude: 52.245,
    longitude: 0.155,
    phone: '01223 555 014',
    openingHours: '08:00 - 17:30'
  },
  {
    odsCode: 'G82006',
    name: 'Newnham Walk Practice',
    address: '11 Newnham Walk, Cambridge',
    postcode: 'CB3 9LN',
    type: 'GP',
    acceptsOutOfArea: true,
    latitude: 52.2,
    longitude: 0.11,
    phone: '01223 555 015',
    openingHours: '08:00 - 18:30'
  },
  {
    odsCode: 'WIC001',
    name: 'Cambridge Walk-in Centre',
    address: '35-37 Brooks Road, Cambridge',
    postcode: 'CB1 3HR',
    type: 'WALK_IN',
    acceptsOutOfArea: true,
    latitude: 52.198,
    longitude: 0.145,
    phone: '01223 555 020',
    openingHours: '08:00 - 20:00'
  },
  {
    odsCode: 'UC001',
    name: "Addenbrooke's Urgent Treatment Centre",
    address: 'Hills Road, Cambridge',
    postcode: 'CB2 0QQ',
    type: 'URGENT_CARE',
    acceptsOutOfArea: true,
    latitude: 52.1755,
    longitude: 0.1405,
    phone: '01223 555 030',
    openingHours: '24 hours'
  },
  {
    odsCode: 'WIC002',
    name: 'North Cambridge Minor Injuries',
    address: '100 Arbury Road, Cambridge',
    postcode: 'CB4 2LD',
    type: 'WALK_IN',
    acceptsOutOfArea: true,
    latitude: 52.232,
    longitude: 0.138,
    phone: '01223 555 021',
    openingHours: '09:00 - 18:00'
  }
];

const mockSlots: FHIRSlot[] = [
  { id: 'slot-101', odsCode: 'G82001', startTime: '2026-07-22T14:20:00Z', practitionerRole: 'GP', status: 'FREE', locationName: 'Riverside Medical Centre', locationAddress: '14 Mill Road, Cambridge', locationPostcode: 'CB1 2AA', locationType: 'GP', requiresRegistration: true, phone: '01223 555 010' },
  { id: 'slot-102', odsCode: 'G82001', startTime: '2026-07-22T15:10:00Z', practitionerRole: 'Advanced Nurse Practitioner', status: 'FREE', locationName: 'Riverside Medical Centre', locationAddress: '14 Mill Road, Cambridge', locationPostcode: 'CB1 2AA', locationType: 'GP', requiresRegistration: true, phone: '01223 555 010' },
  { id: 'slot-103', odsCode: 'G82002', startTime: '2026-07-22T16:00:00Z', practitionerRole: 'GP', status: 'FREE', locationName: 'Parker Street Health', locationAddress: '82 Parker Street, Cambridge', locationPostcode: 'CB2 1DP', locationType: 'GP', requiresRegistration: true, phone: '01223 555 011' },
  { id: 'slot-104', odsCode: 'G82003', startTime: '2026-07-23T09:30:00Z', practitionerRole: 'GP', status: 'FREE', locationName: 'Chesterton Family Practice', locationAddress: '6 Green Lane, Cambridge', locationPostcode: 'CB4 1LL', locationType: 'GP', requiresRegistration: true, phone: '01223 555 012' },
  { id: 'slot-105', odsCode: 'G82004', startTime: '2026-07-22T17:00:00Z', practitionerRole: 'GP', status: 'FREE', locationName: 'Trumpington Health Centre', locationAddress: '2 Anstey Way, Cambridge', locationPostcode: 'CB2 9JE', locationType: 'GP', requiresRegistration: true, acceptsOutOfArea: true, phone: '01223 555 013' },
  { id: 'slot-106', odsCode: 'G82006', startTime: '2026-07-23T10:00:00Z', practitionerRole: 'GP', status: 'FREE', locationName: 'Newnham Walk Practice', locationAddress: '11 Newnham Walk, Cambridge', locationPostcode: 'CB3 9LN', locationType: 'GP', requiresRegistration: true, acceptsOutOfArea: true, phone: '01223 555 015' },
  { id: 'slot-wic-01', odsCode: 'WIC001', startTime: '2026-07-22T13:00:00Z', practitionerRole: 'Nurse Practitioner', status: 'FREE', locationName: 'Cambridge Walk-in Centre', locationAddress: '35-37 Brooks Road, Cambridge', locationPostcode: 'CB1 3HR', locationType: 'WALK_IN', requiresRegistration: false, phone: '01223 555 020' },
  { id: 'slot-wic-02', odsCode: 'WIC001', startTime: '2026-07-22T14:00:00Z', practitionerRole: 'Nurse Practitioner', status: 'FREE', locationName: 'Cambridge Walk-in Centre', locationAddress: '35-37 Brooks Road, Cambridge', locationPostcode: 'CB1 3HR', locationType: 'WALK_IN', requiresRegistration: false, phone: '01223 555 020' },
  { id: 'slot-uc-01', odsCode: 'UC001', startTime: '2026-07-22T12:30:00Z', practitionerRole: 'Emergency Nurse', status: 'FREE', locationName: "Addenbrooke's Urgent Treatment Centre", locationAddress: 'Hills Road, Cambridge', locationPostcode: 'CB2 0QQ', locationType: 'URGENT_CARE', requiresRegistration: false, phone: '01223 555 030' },
  { id: 'slot-uc-02', odsCode: 'UC001', startTime: '2026-07-22T14:30:00Z', practitionerRole: 'Emergency Nurse', status: 'FREE', locationName: "Addenbrooke's Urgent Treatment Centre", locationAddress: 'Hills Road, Cambridge', locationPostcode: 'CB2 0QQ', locationType: 'URGENT_CARE', requiresRegistration: false, phone: '01223 555 030' },
  { id: 'slot-wic-03', odsCode: 'WIC002', startTime: '2026-07-22T13:30:00Z', practitionerRole: 'Practice Nurse', status: 'FREE', locationName: 'North Cambridge Minor Injuries', locationAddress: '100 Arbury Road, Cambridge', locationPostcode: 'CB4 2LD', locationType: 'WALK_IN', requiresRegistration: false, phone: '01223 555 021' }
];

const mockPharmacyStock: PharmacyWithStock[] = [
  {
    pharmacyId: 'pharm-01',
    name: 'Boots Cambridge Grand Arcade',
    address: '1 Grand Arcade, Cambridge CB2 3QA',
    latitude: 52.2055,
    longitude: 0.1220,
    stock: {
      paracetamol: { quantity: 42, lastChecked: '2026-07-22T08:00:00Z' },
      ibuprofen: { quantity: 15, lastChecked: '2026-07-22T08:00:00Z' },
      amoxicillin: { quantity: 8, lastChecked: '2026-07-22T08:00:00Z' }
    }
  },
  {
    pharmacyId: 'pharm-02',
    name: 'LloydsPharmacy Mill Road',
    address: '189 Mill Road, Cambridge CB1 3BA',
    latitude: 52.2020,
    longitude: 0.1400,
    stock: {
      paracetamol: { quantity: 120, lastChecked: '2026-07-22T08:00:00Z' },
      ibuprofen: { quantity: 67, lastChecked: '2026-07-22T08:00:00Z' }
    }
  },
  {
    pharmacyId: 'pharm-03',
    name: 'Tesco Pharmacy Newmarket Road',
    address: 'Newmarket Road, Cambridge CB5 8JJ',
    latitude: 52.2100,
    longitude: 0.1380,
    stock: {
      paracetamol: { quantity: 250, lastChecked: '2026-07-22T08:00:00Z' },
      ibuprofen: { quantity: 180, lastChecked: '2026-07-22T08:00:00Z' }
    }
  }
];

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) throw new Error(`GPNow API returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getPractices(postcode?: string): Promise<Practice[]> {
  try {
    const query = postcode ? `?postcode=${encodeURIComponent(postcode)}` : '';
    const result = await request<Practice[]>(`/api/practices${query}`);
    // Fallback to mock data if the API returns empty (e.g. stale dev server cache)
    return result.length > 0 ? result : mockPractices;
  } catch {
    return mockPractices;
  }
}

export async function getSlots(odsCode?: string): Promise<FHIRSlot[]> {
  try {
    const query = odsCode ? `?odsCode=${encodeURIComponent(odsCode)}` : '';
    const result = await request<FHIRSlot[]>(`/api/slots${query}`);
    return result.length > 0 ? result : (odsCode ? mockSlots.filter((slot) => slot.odsCode === odsCode) : mockSlots);
  } catch {
    return odsCode ? mockSlots.filter((slot) => slot.odsCode === odsCode) : mockSlots;
  }
}

export async function getPharmacyStock(postcode: string, medicine: string): Promise<PharmacyWithStock[]> {
  try {
    const query = `?postcode=${encodeURIComponent(postcode)}&medicine=${encodeURIComponent(medicine)}`;
    return await request<PharmacyWithStock[]>(`/api/pharmacy-stock${query}`);
  } catch {
    const searchTerm = medicine.toLowerCase();
    return mockPharmacyStock.filter((p) =>
      Object.keys(p.stock).some((key) => key.toLowerCase().includes(searchTerm))
    );
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
