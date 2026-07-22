export interface Practice {
  odsCode: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  openingHours?: string;
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
