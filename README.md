# GPNow

GPNow is an AI-assisted healthcare pre-triage and GP slot aggregation prototype for a Cloudflare hackathon. It collects a patient symptom narrative, applies a safety-first red-flag check, and presents nearby appointment options. It is a care-navigation prototype, not a diagnostic tool.

## Quick Start

Requirements: Node.js 20+, pnpm 9+, and a Cloudflare account for deployed bindings.

```bash
pnpm install
pnpm db:init
pnpm dev
```

This starts the web app at `http://localhost:5173` and the Worker at `http://localhost:8787`. To run them separately:

```bash
pnpm db:init
pnpm dev:worker
```

The Worker runs at `http://localhost:8787` and the Vite development server proxies `/api` to it. The local AI binding uses remote Workers AI and Vectorize is not supported locally; service errors are surfaced as hard errors. The deterministic red-flag guardrail is the only intentional safety fallback.

Useful commands:

```bash
pnpm dev             # Run web and Worker in parallel
pnpm build           # Build every package and application
pnpm typecheck       # Type-check every workspace
pnpm db:init         # Apply services/worker/schema.sql to local D1
```

## Workspace Boundaries

The repository is intentionally split so four developers can work independently with minimal merge collisions:

| Owner | Directory | Contract |
| --- | --- | --- |
| Developer 1: UI and WebRTC | `apps/web/` | Imports from `@gpnow/types`; calls `/api` only |
| Developer 2: AI Shield and Vectorize | `services/worker/src/ai/` | Exports `checkRedFlags` and model helpers |
| Developer 3: State and orchestration | `services/worker/src/orchestration/` | Exports `TriageWorkflow` and `SlotLockDO` |
| Developer 4: Data and NHS APIs | `services/worker/src/data/` | Owns D1, R2, ODS, and OpenPrescribing adapters |

`packages/types/src/` is the shared source of truth. Domain directories should communicate through these contracts and their explicitly exported functions rather than importing implementation details from another developer's directory.

## Cloudflare Architecture

- **Workers AI:** Whisper transcription and Llama 3 symptom summarisation are isolated in `ai/llamaTriage.ts`.
- **Cloudflare Calls:** `apps/web/src/services/cloudflareCalls.ts` publishes microphone audio through a configured WebRTC signaling proxy. A configured Calls signaling endpoint is required for voice sessions.
- **Vectorize:** `ai/vectorizeGuard.ts` embeds symptom text and checks the `nhs-111-guidelines` index. Local, deterministic red-flag patterns fail closed when the index is empty or unavailable.
- **Workflows:** `TriageWorkflow` sequences the clinical safety check and slot aggregation with durable step boundaries.
- **Durable Objects:** `SlotLockDO` exposes a WebSocket lock engine for short-lived appointment holds and broadcasts state changes to connected clients.
- **D1:** `data/d1Db.ts` projects stored records into the shared FHIR slot shape and records triage events.
- **R2:** `data/r2Storage.ts` writes SBAR JSON and audio objects. The storage boundary can be replaced with a PDF renderer without changing the UI contract.
- **NHS integrations:** `data/nhsOdsApi.ts` resolves practice metadata from ODS, while `data/openPrescribing.ts` provides prescribing activity for downstream pharmacy and care-navigation features.

Bindings are declared in `services/worker/wrangler.jsonc`:

- `AI` -> Workers AI
- `DB` -> D1 database `gpnow-db`
- `REPORTS_BUCKET` -> R2 bucket `gpnow-sbar-reports`
- `VECTOR_INDEX` -> Vectorize index `nhs-111-guidelines`
- `SLOT_LOCK_DO` -> `SlotLockDO`
- `TRIAGE_WORKFLOW` -> `TriageWorkflow`

The `database_id` is intentionally `mock-id` in this hackathon scaffold. Replace it with the real D1 database ID before deployment and create the Vectorize index/R2 bucket named in the configuration.

## API Surface

- `GET /api/health`
- `GET /api/practices`
- `GET /api/slots?odsCode=G82001`
- `POST /api/triage` with `{ patientId, symptoms, odsCode, consentToProcess }`
- `POST /api/calls/offer` with a browser WebRTC offer and audio track `mid`

The frontend API client does not provide mock practices, slots, or triage responses. Worker, D1, signaling, and AI errors must be fixed and are surfaced to the user or returned as HTTP errors.

Set `VITE_CALLS_SIGNALING_URL` to a Calls signaling proxy before starting the web app. The proxy must accept a local SDP offer and return `{ type, sdp }` for the Calls answer; no Calls API token is exposed to the browser.

For local Realtime SFU testing, create `apps/web/.env.local` with `VITE_CALLS_SIGNALING_URL=http://localhost:8787/api/calls/offer` and `VITE_CALLS_ICE_SERVERS_URL=http://localhost:8787/api/calls/ice-servers`. Keep the Realtime App ID, App Secret, TURN Token ID, and TURN API token in `services/worker/.dev.vars`; use `services/worker/.dev.vars.example` as the shape, and never place secrets in frontend environment variables. The Worker creates the Realtime session and short-lived TURN credentials server-side.

If the browser reports ICE error `701` or times out while gathering candidates, disable Cloudflare WARP or another VPN while testing locally. WARP can intercept the network interfaces used by WebRTC ICE.

## Safety and Privacy

This code is a hackathon scaffold. It must not be used for clinical care or to make an autonomous diagnosis. Red-flag matches are intentionally conservative and direct users to emergency services. Before handling real patient data, add NHS-approved identity, consent, retention, audit, access-control, threat-model, clinical safety, and data-processing controls.
