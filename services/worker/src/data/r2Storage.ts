import type { SBARReport } from '@gpnow/types';
import type { Env } from '../env';

export function createSbarReport(patientId: string, symptoms: string, recommendation: string): SBARReport {
  return {
    patientId,
    situation: symptoms.slice(0, 500),
    background: 'Patient-submitted symptom narrative collected through GPNow.',
    assessment: 'AI-assisted pre-triage summary. A clinician must verify this assessment.',
    recommendation,
    timestamp: new Date().toISOString()
  };
}

export async function writeSbarReport(report: SBARReport, env: Env): Promise<string> {
  const key = `sbar/${report.patientId}/${report.timestamp.replaceAll(':', '-')}.json`;
  await env.REPORTS_BUCKET.put(key, JSON.stringify(report, null, 2), {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: { patientId: report.patientId, format: 'sbar' }
  });
  return key;
}

export async function readSbarReport(key: string, env: Env): Promise<SBARReport | null> {
  const object = await env.REPORTS_BUCKET.get(key);
  if (!object) return null;
  return (await object.json()) as SBARReport;
}

export async function writeAudio(key: string, audio: ArrayBuffer, env: Env): Promise<void> {
  await env.REPORTS_BUCKET.put(`audio/${key}`, audio, {
    httpMetadata: { contentType: 'audio/webm' }
  });
}
