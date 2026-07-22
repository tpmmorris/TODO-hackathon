import type { FHIRSlot, LocationType, PharmacyWithStock, Practice, SlotStatus, TriageRequest } from '@gpnow/types';
import type { Env } from '../env';
import { haversineDistance } from '../lib/geo';

interface SlotRow {
  id: string;
  ods_code: string;
  start_time: string;
  practitioner_role: string;
  status: SlotStatus;
  name: string;
  address: string;
  postcode: string | null;
  type: string;
  accepts_out_of_area: number;
  phone: string | null;
}

interface PracticeRow {
  ods_code: string;
  name: string;
  address: string;
  postcode: string | null;
  type: string;
  accepts_out_of_area: number;
  latitude: number;
  longitude: number;
  phone: string | null;
  opening_hours: string | null;
}

interface PharmacyRow {
  id: string;
  ods_code: string | null;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  stock_json: string;
}

export async function getNearbySlots(odsCode: string, env: Env): Promise<FHIRSlot[]> {
  try {
    const result = await env.DB.prepare(
      `SELECT
         s.id, s.ods_code, s.start_time, s.practitioner_role, s.status,
         p.name, p.address, p.postcode, p.type, p.accepts_out_of_area, p.phone
       FROM slots s
       JOIN practices p ON p.ods_code = s.ods_code
       WHERE s.ods_code = ?1 AND s.status = 'FREE' AND s.start_time >= datetime('now')
       ORDER BY s.start_time ASC
       LIMIT 30`
    )
      .bind(odsCode)
      .all<SlotRow>();

    return result.results.map((slot) => ({
      id: slot.id,
      odsCode: slot.ods_code,
      startTime: slot.start_time,
      practitionerRole: slot.practitioner_role,
      status: slot.status,
      locationName: slot.name,
      locationAddress: slot.address,
      locationPostcode: slot.postcode ?? undefined,
      locationType: (slot.type as LocationType) ?? 'GP',
      requiresRegistration: slot.type === 'GP',
      acceptsOutOfArea: slot.accepts_out_of_area === 1,
      phone: slot.phone ?? undefined
    }));
  } catch {
    return [];
  }
}

export async function getPractices(env: Env): Promise<Practice[]> {
  try {
    const result = await env.DB.prepare(
      `SELECT ods_code, name, address, postcode, type, accepts_out_of_area, latitude, longitude, phone, opening_hours
       FROM practices ORDER BY name ASC`
    ).all<PracticeRow>();
    return result.results.map((practice) => ({
      odsCode: practice.ods_code,
      name: practice.name,
      address: practice.address,
      postcode: practice.postcode ?? undefined,
      type: (practice.type as Practice['type']) ?? 'GP',
      acceptsOutOfArea: practice.accepts_out_of_area === 1,
      latitude: practice.latitude,
      longitude: practice.longitude,
      phone: practice.phone ?? undefined,
      openingHours: practice.opening_hours ?? undefined
    }));
  } catch {
    return [];
  }
}

export async function getPracticesByLocation(
  lat: number,
  lng: number,
  radiusKm: number,
  env: Env
): Promise<Practice[]> {
  try {
    const result = await env.DB.prepare(
      `SELECT ods_code, name, address, postcode, type, accepts_out_of_area, latitude, longitude, phone, opening_hours
       FROM practices`
    ).all<PracticeRow>();

    const practices = result.results
      .map((practice) => ({
        odsCode: practice.ods_code,
        name: practice.name,
        address: practice.address,
        postcode: practice.postcode ?? undefined,
        type: (practice.type as Practice['type']) ?? 'GP',
        acceptsOutOfArea: practice.accepts_out_of_area === 1,
        latitude: practice.latitude,
        longitude: practice.longitude,
        phone: practice.phone ?? undefined,
        openingHours: practice.opening_hours ?? undefined,
        distanceKm: haversineDistance(lat, lng, practice.latitude, practice.longitude)
      }))
      .filter((p) => p.distanceKm <= radiusKm)
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

    return practices;
  } catch {
    return [];
  }
}

export async function getNearbyPharmacies(
  lat: number,
  lng: number,
  medicine: string,
  radiusKm: number,
  env: Env
): Promise<PharmacyWithStock[]> {
  try {
    const result = await env.DB.prepare(
      `SELECT id, ods_code, name, address, latitude, longitude, stock_json
       FROM pharmacies`
    ).all<PharmacyRow>();

    const searchTerm = medicine.toLowerCase();

    const pharmacies = result.results
      .map((row) => {
        let parsedStock: Record<string, { quantity: number; lastChecked: string }> = {};
        try {
          parsedStock = JSON.parse(row.stock_json) as Record<string, { quantity: number; lastChecked: string }>;
        } catch {
          parsedStock = {};
        }

        const distanceKm = haversineDistance(lat, lng, row.latitude, row.longitude);

        return {
          pharmacyId: row.id,
          odsCode: row.ods_code ?? undefined,
          name: row.name,
          address: row.address,
          latitude: row.latitude,
          longitude: row.longitude,
          stock: parsedStock,
          distanceKm
        };
      })
      .filter((p) => {
        if (p.distanceKm > radiusKm) return false;
        return Object.keys(p.stock).some((key) => key.toLowerCase().includes(searchTerm));
      })
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

    return pharmacies;
  } catch {
    return [];
  }
}

export async function getWalkInAndUrgentCareSlots(env: Env): Promise<FHIRSlot[]> {
  try {
    const result = await env.DB.prepare(
      `SELECT
         s.id, s.ods_code, s.start_time, s.practitioner_role, s.status,
         p.name, p.address, p.postcode, p.type, p.accepts_out_of_area, p.phone
       FROM slots s
       JOIN practices p ON p.ods_code = s.ods_code
       WHERE p.type IN ('WALK_IN', 'URGENT_CARE') AND s.status = 'FREE' AND s.start_time >= datetime('now')
       ORDER BY s.start_time ASC
       LIMIT 30`
    ).all<SlotRow>();

    return result.results.map((slot) => ({
      id: slot.id,
      odsCode: slot.ods_code,
      startTime: slot.start_time,
      practitionerRole: slot.practitioner_role,
      status: slot.status,
      locationName: slot.name,
      locationAddress: slot.address,
      locationPostcode: slot.postcode ?? undefined,
      locationType: (slot.type as LocationType) ?? 'GP',
      requiresRegistration: slot.type === 'GP',
      acceptsOutOfArea: slot.accepts_out_of_area === 1,
      phone: slot.phone ?? undefined
    }));
  } catch {
    return [];
  }
}

export async function saveTriageLog(request: TriageRequest, result: string, env: Env) {
  // Audit logging is best-effort: a persistence failure must never break the
  // triage response the patient depends on.
  try {
    await env.DB.prepare(
      `INSERT INTO triage_logs (id, patient_id, ods_code, symptom_text, result_json, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))`
    )
      .bind(crypto.randomUUID(), request.patientId, request.odsCode ?? null, request.symptoms, result)
      .run();
  } catch (error) {
    console.error('Failed to persist triage log', error);
  }
}
