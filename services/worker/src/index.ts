import type { TriageRequest } from '@gpnow/types';
import { checkRedFlags } from './ai/vectorizeGuard';
import { getNearbySlots, getPractices, saveTriageLog } from './data/d1Db';
import { createSbarReport } from './data/r2Storage';
import type { Env } from './env';

export { SlotLockDO } from './orchestration/slotLockDO';
export { TriageWorkflow } from './orchestration/triageWorkflow';

const disclaimer = 'This service supports care navigation and is not a diagnosis. Call 999 for a life-threatening emergency.';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-headers', 'content-type, authorization');
  headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
  return new Response(response.body, { status: response.status, headers });
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (url.pathname === '/' && request.method === 'GET') {
    return json({
      service: 'gpnow-worker',
      status: 'ok',
      message: 'Worker API is running. Open http://localhost:5173 for the GPNow UI.',
      endpoints: ['/api/health', '/api/practices', '/api/slots', '/api/triage']
    });
  }
  if (url.pathname === '/api/health') return json({ service: 'gpnow-worker', status: 'ok' });

  if (url.pathname === '/api/practices' && request.method === 'GET') {
    return json(await getPractices(env));
  }

  if (url.pathname === '/api/slots' && request.method === 'GET') {
    const odsCode = url.searchParams.get('odsCode') ?? 'G82001';
    return json(await getNearbySlots(odsCode, env));
  }

  if (url.pathname === '/api/triage' && request.method === 'POST') {
    const body = (await request.json()) as Partial<TriageRequest>;
    if (typeof body.patientId !== 'string' || typeof body.symptoms !== 'string' || body.consentToProcess !== true) {
      return json({ error: 'patientId, symptoms, and consentToProcess are required' }, 400);
    }
    const triageRequest: TriageRequest = {
      patientId: body.patientId,
      symptoms: body.symptoms,
      audioKey: body.audioKey,
      odsCode: body.odsCode,
      latitude: body.latitude,
      longitude: body.longitude,
      consentToProcess: true
    };
    const redFlag = await checkRedFlags(triageRequest.symptoms, env);
    const slots = await getNearbySlots(triageRequest.odsCode ?? 'G82001', env);
    const actionRequired = redFlag.actionRequired ?? 'NONE';
    const status = redFlag.actionRequired === '999_EMERGENCY'
      ? 'REQUIRES_EMERGENCY_CARE'
      : redFlag.actionRequired === '111_TRANSFER'
        ? 'TRANSFERRED_TO_111'
        : 'READY_TO_BOOK';
    const report = createSbarReport(
      triageRequest.patientId,
      triageRequest.symptoms,
      actionRequired === 'NONE' ? 'Offer a suitable GP appointment.' : actionRequired
    );
    const response = {
      requestId: crypto.randomUUID(),
      redFlag,
      slots,
      report,
      status,
      disclaimer
    } as const;
    try {
      await saveTriageLog(triageRequest, JSON.stringify(response), env);
    } catch {
      // Logging must not block a safety response when D1 is unavailable locally.
    }
    return json(response);
  }

  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return withCors(await route(request, env));
    } catch {
      return withCors(json({ error: 'The GPNow service is temporarily unavailable' }, 503));
    }
  }
};
