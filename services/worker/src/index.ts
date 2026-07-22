import type { TriageRequest } from '@gpnow/types';
import { checkRedFlags } from './ai/vectorizeGuard';
import { getNearbySlots, getPractices, saveTriageLog } from './data/d1Db';
import { createSbarReport } from './data/r2Storage';
import type { Env } from './env';

export { SlotLockDO } from './orchestration/slotLockDO';
export { TriageWorkflow } from './orchestration/triageWorkflow';

const disclaimer = 'This service supports care navigation and is not a diagnosis. Call 999 for a life-threatening emergency.';
const realtimeApi = 'https://rtc.live.cloudflare.com/v1';

interface SessionDescription {
  type: 'offer' | 'answer';
  sdp: string;
}

interface CallsOfferRequest {
  sessionDescription?: SessionDescription;
  mid?: string;
}

interface CallsSessionResponse {
  sessionId?: string;
}

interface CallsTracksResponse {
  sessionDescription?: SessionDescription;
}

interface IceServersResponse {
  iceServers?: unknown;
}

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

function isSessionDescription(value: unknown): value is SessionDescription {
  if (!value || typeof value !== 'object') return false;
  const description = value as Partial<SessionDescription>;
  return (description.type === 'offer' || description.type === 'answer') && typeof description.sdp === 'string';
}

async function negotiateCallsOffer(request: Request, env: Env): Promise<Response> {
  if (!env.CALLS_APP_ID || !env.CALLS_APP_SECRET) {
    throw new Error('CALLS_APP_ID and CALLS_APP_SECRET must be configured');
  }

  const body = (await request.json()) as CallsOfferRequest;
  if (!isSessionDescription(body.sessionDescription) || body.sessionDescription.type !== 'offer') {
    return json({ error: 'A WebRTC offer session description is required' }, 400);
  }
  if (typeof body.mid !== 'string' || body.mid.length === 0) {
    return json({ error: 'The WebRTC audio track mid is required' }, 400);
  }

  const headers = {
    authorization: `Bearer ${env.CALLS_APP_SECRET}`,
    'content-type': 'application/json'
  };
  const sessionResponse = await fetch(`${realtimeApi}/apps/${env.CALLS_APP_ID}/sessions/new`, {
    method: 'POST',
    headers
  });
  if (!sessionResponse.ok) {
    throw new Error(`Cloudflare Realtime session creation failed (${sessionResponse.status})`);
  }
  const session = (await sessionResponse.json()) as CallsSessionResponse;
  if (!session.sessionId) throw new Error('Cloudflare Realtime returned no session ID');

  const tracksResponse = await fetch(
    `${realtimeApi}/apps/${env.CALLS_APP_ID}/sessions/${session.sessionId}/tracks/new`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sessionDescription: body.sessionDescription,
        tracks: [
          {
            location: 'local',
            mid: body.mid,
            trackName: `gpnow-audio-${crypto.randomUUID()}`,
            kind: 'audio'
          }
        ]
      })
    }
  );
  if (!tracksResponse.ok) {
    throw new Error(`Cloudflare Realtime track negotiation failed (${tracksResponse.status})`);
  }
  const tracks = (await tracksResponse.json()) as CallsTracksResponse;
  if (!isSessionDescription(tracks.sessionDescription) || tracks.sessionDescription.type !== 'answer') {
    throw new Error('Cloudflare Realtime returned no valid SDP answer');
  }
  return json(tracks.sessionDescription);
}

async function getTurnCredentials(env: Env): Promise<Response> {
  if (!env.TURN_TOKEN_ID || !env.TURN_API_TOKEN) {
    throw new Error('TURN_TOKEN_ID and TURN_API_TOKEN must be configured');
  }
  const response = await fetch(
    `${realtimeApi}/turn/keys/${encodeURIComponent(env.TURN_TOKEN_ID)}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.TURN_API_TOKEN}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ ttl: 3600 })
    }
  );
  if (!response.ok) throw new Error(`Cloudflare TURN credential generation failed (${response.status})`);
  const payload = (await response.json()) as IceServersResponse;
  if (!Array.isArray(payload.iceServers) || payload.iceServers.length === 0) {
    throw new Error('Cloudflare TURN returned no ICE servers');
  }
  return json({ iceServers: payload.iceServers });
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (url.pathname === '/' && request.method === 'GET') {
    return json({
      service: 'gpnow-worker',
      status: 'ok',
      message: 'Worker API is running. Open http://localhost:5173 for the GPNow UI.',
      endpoints: ['/api/health', '/api/practices', '/api/slots', '/api/triage', '/api/calls/ice-servers', '/api/calls/offer']
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

  if (url.pathname === '/api/calls/offer' && request.method === 'POST') {
    return negotiateCallsOffer(request, env);
  }

  if (url.pathname === '/api/calls/ice-servers' && request.method === 'GET') {
    return getTurnCredentials(env);
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
    await saveTriageLog(triageRequest, JSON.stringify(response), env);
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
