import type { FHIRSlot, Practice, SlotStatus, TriageRequest } from '@gpnow/types';
import type { Env } from '../env';

interface SlotRow {
  id: string;
  ods_code: string;
  start_time: string;
  practitioner_role: string;
  status: SlotStatus;
}

interface PracticeRow {
  ods_code: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  opening_hours: string | null;
}

export async function getNearbySlots(odsCode: string, env: Env): Promise<FHIRSlot[]> {
  const result = await env.DB.prepare(
    `SELECT id, ods_code, start_time, practitioner_role, status
     FROM slots
     WHERE ods_code = ?1 AND status = 'FREE' AND start_time >= datetime('now')
     ORDER BY start_time ASC
     LIMIT 30`
  )
    .bind(odsCode)
    .all<SlotRow>();

  return result.results.map((slot) => ({
    id: slot.id,
    odsCode: slot.ods_code,
    startTime: slot.start_time,
    practitionerRole: slot.practitioner_role,
    status: slot.status
  }));
}

export async function getPractices(env: Env): Promise<Practice[]> {
  const result = await env.DB.prepare(
    `SELECT ods_code, name, address, latitude, longitude, phone, opening_hours
     FROM practices ORDER BY name ASC`
  ).all<PracticeRow>();
  return result.results.map((practice) => ({
    odsCode: practice.ods_code,
    name: practice.name,
    address: practice.address,
    latitude: practice.latitude,
    longitude: practice.longitude,
    phone: practice.phone ?? undefined,
    openingHours: practice.opening_hours ?? undefined
  }));
}

export async function saveTriageLog(request: TriageRequest, result: string, env: Env) {
  await env.DB.prepare(
    `INSERT INTO triage_logs (id, patient_id, ods_code, symptom_text, result_json, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))`
  )
    .bind(crypto.randomUUID(), request.patientId, request.odsCode ?? null, request.symptoms, result)
    .run();
}
