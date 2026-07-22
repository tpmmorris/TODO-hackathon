import type { FHIRSlot, Practice, TriageRequest, TriageResponse } from '@gpnow/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function getEndpoint(path: string): string {
  if (API_BASE) return `${API_BASE}${path}`;
  if (import.meta.env.DEV) return path;
  throw new Error('VITE_API_BASE_URL must be configured outside local development');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getEndpoint(path), init);
  if (!response.ok) throw new Error(`GPNow API returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getPractices(): Promise<Practice[]> {
  return request<Practice[]>('/api/practices');
}

export async function getSlots(odsCode?: string): Promise<FHIRSlot[]> {
  const query = odsCode ? `?odsCode=${encodeURIComponent(odsCode)}` : '';
  return request<FHIRSlot[]>(`/api/slots${query}`);
}

export async function submitTriage(input: TriageRequest): Promise<TriageResponse> {
  return request<TriageResponse>('/api/triage', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input)
  });
}
