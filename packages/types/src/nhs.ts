export interface Practice {
  odsCode: string;
  name: string;
  address: string;
  postcode?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  openingHours?: string;
  acceptsOutOfArea?: boolean;
  distanceKm?: number;
  type?: 'GP' | 'WALK_IN' | 'URGENT_CARE';
}

export interface PharmacyStock {
  pharmacyId: string;
  odsCode?: string;
  name: string;
  address: string;
  medicine: string;
  quantity: number;
  lastChecked: string;
}

export interface PharmacyWithStock {
  pharmacyId: string;
  odsCode?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  stock: Record<string, { quantity: number; lastChecked: string }>;
  distanceKm?: number;
}

export interface PrescribingActivity {
  organisation: string;
  month: string;
  items: Array<{ bnfCode: string; items: number; cost: number }>;
}
