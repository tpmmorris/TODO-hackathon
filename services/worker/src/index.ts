import type { TriageRequest } from '@gpnow/types';
import { transcribeAudio } from './ai/llamaTriage';
import { getNearbySlots, getPractices, getPracticesByLocation, saveTriageLog } from './data/d1Db';
import { getPrescribingSummary } from './data/openPrescribing';
import type { Env } from './env';
import { geocodePostcode } from './lib/geo';
import { executeCareOptions } from './orchestration/careOptionsWorkflow';
import { executeTriage } from './orchestration/triageWorkflow';

export { SlotLockDO } from './orchestration/slotLockDO';
export { CareOptionsWorkflow } from './orchestration/careOptionsWorkflow';
export { TriageWorkflow } from './orchestration/triageWorkflow';

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
  if (url.pathname === '/api/health') return json({ service: 'gpnow-worker', status: 'ok' });

  if (url.pathname === '/api/practices' && request.method === 'GET') {
    const postcode = url.searchParams.get('postcode');
    const radiusKm = parseFloat(url.searchParams.get('radiusKm') ?? '5');

    if (postcode) {
      const { latitude, longitude } = await geocodePostcode(postcode);
      const practices = await getPracticesByLocation(latitude, longitude, radiusKm, env);
      return json(practices);
    }

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

  if (url.pathname === '/api/pharmacy-stock' && request.method === 'GET') {
    const postcode = url.searchParams.get('postcode');
    const medicine = url.searchParams.get('medicine') ?? '';

    if (!postcode || !medicine.trim()) {
      return json({ error: 'postcode and medicine are required' }, 400);
    }

    const careOptions = await executeCareOptions({ postcode, medicine }, env);
    return json(careOptions.pharmacies);
  }

  if (url.pathname === '/api/care-options' && request.method === 'GET') {
    const postcode = url.searchParams.get('postcode');
    if (!postcode?.trim()) return json({ error: 'postcode is required' }, 400);
    return json(await executeCareOptions({
      postcode,
      registeredOdsCode: url.searchParams.get('registeredOdsCode') ?? undefined,
      medicine: url.searchParams.get('medicine') ?? undefined,
      includePrescribing: url.searchParams.get('includePrescribing') === 'true'
    }, env));
  }

  if (url.pathname === '/api/prescribing' && request.method === 'GET') {
    const odsCode = url.searchParams.get('odsCode');
    if (!odsCode?.trim()) return json({ error: 'odsCode is required' }, 400);
    return json(await getPrescribingSummary(odsCode));
  }

  if (url.pathname === '/api/transcribe' && request.method === 'POST') {
    if (request.headers.get('x-consent-to-process') !== 'true' || !request.headers.get('x-patient-id')) {
      return json({ error: 'Patient identity and consent are required for transcription' }, 400);
    }
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.startsWith('audio/')) return json({ error: 'An audio payload is required' }, 415);
    const audio = await request.arrayBuffer();
    const text = await transcribeAudio(audio, env);
    return json({ text });
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
      registeredOdsCode: body.registeredOdsCode,
      latitude: body.latitude,
      longitude: body.longitude,
      consentToProcess: true
    };
    const response = await executeTriage(triageRequest, env);
    await saveTriageLog(triageRequest, JSON.stringify(response), env);
    return json(response);
  }

  if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
  return env.ASSETS.fetch(request);
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
