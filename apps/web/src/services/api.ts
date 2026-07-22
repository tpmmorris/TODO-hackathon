import type { FHIRSlot, PharmacyWithStock, Practice, TriageRequest, TriageResponse } from '@gpnow/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

function getEndpoint(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getEndpoint(path), init);
  if (!response.ok) throw new Error(`GPNow API returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getPractices(postcode?: string): Promise<Practice[]> {
  const query = postcode ? `?postcode=${encodeURIComponent(postcode)}` : '';
  return request<Practice[]>(`/api/practices${query}`);
}

export async function getSlots(odsCode?: string): Promise<FHIRSlot[]> {
  const query = odsCode ? `?odsCode=${encodeURIComponent(odsCode)}` : '';
  return request<FHIRSlot[]>(`/api/slots${query}`);
}

export async function getPharmacyStock(postcode: string, medicine: string): Promise<PharmacyWithStock[]> {
  const query = `?postcode=${encodeURIComponent(postcode)}&medicine=${encodeURIComponent(medicine)}`;
  return request<PharmacyWithStock[]>(`/api/pharmacy-stock${query}`);
}

export async function submitTriage(input: TriageRequest): Promise<TriageResponse> {
  return request<TriageResponse>('/api/triage', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input)
  });
}

export async function transcribeAudio(audio: Blob, patientId: string): Promise<string> {
  const response = await request<{ text: string }>('/api/transcribe', {
    method: 'POST',
    headers: {
      'content-type': audio.type || 'audio/webm',
      'x-consent-to-process': 'true',
      'x-patient-id': patientId
    },
    body: audio
  });
  if (typeof response.text !== 'string' || !response.text.trim()) {
    throw new Error('Transcription response did not contain text');
  }
  return response.text.trim();
}
