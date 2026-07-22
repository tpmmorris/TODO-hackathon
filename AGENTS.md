# GPNow Agent Context

## Project

GPNow is a Cloudflare hackathon prototype for AI-assisted healthcare pre-triage and GP appointment aggregation.

The intended flow is:

1. A patient submits a symptom narrative by text or voice.
2. Workers AI and a Vectorize-backed safety guardrail check for red flags.
3. Safe requests are matched to nearby GP appointment slots.
4. Urgent requests are directed to NHS 111 or 999 rather than offered a routine appointment.
5. An SBAR-shaped report can be stored in R2 for clinician handoff.

This is a care-navigation prototype, not a diagnostic or autonomous clinical system. Never describe an AI result as a diagnosis. Emergency safety behavior must remain conservative and fail closed.

## Repository

This is a pnpm workspace monorepo:

```text
packages/types/       Shared TypeScript contracts
apps/web/             React + Vite frontend
services/worker/      Cloudflare Worker and backend domains
```

The workspace package names are:

- `@gpnow/types`
- `@gpnow/web`
- `@gpnow/worker`

The shared types package exports source TypeScript directly during workspace development. Do not replace its source exports with generated-only paths unless the development scripts are updated too.

## Developer Ownership

The directory split is intentional and exists to minimize merge collisions between four developers.

| Developer | Owns | Responsibilities |
| --- | --- | --- |
| 1 | `apps/web/` | React UI, Leaflet map, voice interface, Cloudflare Calls WebRTC client, API client |
| 2 | `services/worker/src/ai/` | Workers AI, Whisper, Llama 3, Vectorize red-flag guardrail, prompts |
| 3 | `services/worker/src/orchestration/` | `TriageWorkflow`, `SlotLockDO`, Workflow state, WebSocket slot locks |
| 4 | `services/worker/src/data/` | D1 queries, R2 reports/audio, NHS ODS, OpenPrescribing |

Shared contract changes belong in `packages/types/src/`. Coordinate changes to contracts before changing consumers. Avoid importing implementation details across the four Worker domains.

## Important Files

```text
AGENTS.md
README.md
package.json
pnpm-workspace.yaml
packages/types/src/index.ts
packages/types/src/triage.ts
packages/types/src/slot.ts
packages/types/src/nhs.ts
packages/types/src/sbar.ts
apps/web/src/App.tsx
apps/web/src/services/api.ts
apps/web/src/services/cloudflareCalls.ts
services/worker/wrangler.jsonc
services/worker/src/index.ts
services/worker/src/env.ts
services/worker/src/ai/vectorizeGuard.ts
services/worker/src/ai/llamaTriage.ts
services/worker/src/orchestration/triageWorkflow.ts
services/worker/src/orchestration/slotLockDO.ts
services/worker/src/data/d1Db.ts
services/worker/src/data/r2Storage.ts
services/worker/src/data/nhsOdsApi.ts
services/worker/src/data/openPrescribing.ts
services/worker/schema.sql
```

## Shared Contracts

`@gpnow/types` is the source of truth for frontend and Worker data shapes.

`TriageRequest` contains:

- `patientId: string`
- `symptoms: string`
- optional `audioKey`, `odsCode`, `latitude`, and `longitude`
- `consentToProcess: boolean`

`RedFlagResult` contains:

- `isRedFlag: boolean`
- `severity: 'HIGH' | 'MEDIUM' | 'LOW'`
- optional `matchedGuideline`
- optional `actionRequired: '999_EMERGENCY' | '111_TRANSFER' | 'NONE'`

`FHIRSlot` contains:

- `id: string`
- `odsCode: string`
- `startTime: string`
- `practitionerRole: string`
- `status: 'FREE' | 'LOCKED' | 'BOOKED'`

`SlotLockState` represents the live lock state of an appointment. `Practice` and `PharmacyStock` represent NHS data projections. `SBARReport` contains `patientId`, `situation`, `background`, `assessment`, `recommendation`, and `timestamp`.

## Worker API

The Worker is an API and does not serve the frontend HTML.

- `GET /` returns Worker status and local UI guidance.
- `GET /api/health` returns service health.
- `GET /api/practices` returns D1-backed practices.
- `GET /api/slots?odsCode=G82001` returns free FHIR slot projections.
- `POST /api/triage` accepts a consented `TriageRequest` and returns red-flag status, slots, an SBAR report, and a care-navigation status.

The Worker has permissive CORS for hackathon development. Tighten origins and authentication before production use.

The frontend API client uses `/api` through Vite's development proxy. If the Worker is unavailable, it falls back to deterministic mock practices and slots so frontend development can proceed independently.

## Cloudflare Bindings

Bindings are declared in `services/worker/wrangler.jsonc`:

| Binding | Cloudflare resource | Purpose |
| --- | --- | --- |
| `AI` | Workers AI | Whisper and Llama 3 inference |
| `DB` | D1 `gpnow-db` | Practices, pharmacies, slots, triage logs |
| `REPORTS_BUCKET` | R2 `gpnow-sbar-reports` | SBAR JSON and audio objects |
| `VECTOR_INDEX` | Vectorize `nhs-111-guidelines` | Semantic red-flag guideline matching |
| `SLOT_LOCK_DO` | Durable Object `SlotLockDO` | WebSocket slot lock coordination |
| `TRIAGE_WORKFLOW` | Workflow `TriageWorkflow` | Durable triage orchestration |

The configured D1 `database_id` is the intentional placeholder `mock-id`. Replace it before deployment. The configured R2 bucket and Vectorize index must exist before production deployment.

## AI and Safety Behavior

`services/worker/src/ai/vectorizeGuard.ts` exports:

```ts
checkRedFlags(text: string, env: Env): Promise<RedFlagResult>
```

The function first checks deterministic emergency patterns, then attempts Workers AI embeddings and a Vectorize query. If AI or Vectorize is unavailable or unseeded, it returns the local safety result. Do not remove the local fallback or make an unavailable safety service silently return a positive clinical conclusion.

`services/worker/src/ai/llamaTriage.ts` contains the Llama 3 prompt and Whisper transcription boundary. Model output is treated as untrusted text and has a safe fallback. Model output must not override the red-flag guardrail.

The current emergency examples include chest pain, severe breathing difficulty, unconsciousness, severe bleeding, stroke symptoms, overdose/poisoning, and self-harm language. Any changes to these patterns need careful review and tests.

## Orchestration

`TriageWorkflow` sequences the clinical safety check and D1 slot aggregation using Workflow steps. Keep external calls inside Workflow steps so retries and durable execution remain explicit.

`SlotLockDO` accepts WebSocket upgrades and handles `LOCK` and `RELEASE` commands. It broadcasts lock state to connected clients and persists the current lock map in Durable Object storage. Lock expiry defaults to 600 seconds.

Do not move slot locking into the frontend. The frontend may request a lock, but the Durable Object is the source of truth for concurrent booking holds.

## Data Layer

`services/worker/schema.sql` creates and seeds:

- `practices`
- `pharmacies`
- `slots`
- `triage_logs`

`d1Db.ts` maps SQL snake_case rows to shared camelCase contracts. Keep this mapping at the data boundary instead of leaking database column names to the UI.

`r2Storage.ts` currently stores SBAR reports as JSON. It is intentionally a storage boundary; a PDF renderer can be added without changing the shared `SBARReport` shape.

`nhsOdsApi.ts` integrates the NHS ODS FHIR organization endpoint. `openPrescribing.ts` integrates OpenPrescribing prescribing activity. External API failures should be handled at the caller boundary and must not bypass safety checks.

## Frontend

The web app is a split-pane dashboard:

- symptom text and voice input on the left
- practice map and selected practice on the right
- available slot cards below
- emergency modal for high-severity red flags

`PracticeMap.tsx` uses Leaflet and OpenStreetMap tiles. Keep map cleanup in the React effect to avoid duplicate maps during Vite hot reload.

`VoiceRecorder.tsx` uses browser `MediaRecorder` locally. `services/cloudflareCalls.ts` publishes the microphone stream through a configured WebRTC signaling proxy when `VITE_CALLS_SIGNALING_URL` is set. The browser must never receive a Cloudflare Calls API token.

The UI is prototype-oriented but must remain usable on desktop and mobile. Preserve the existing visual language unless a deliberate design change is requested.

## Local Development

Requirements: Node.js 20 or newer and pnpm 9 or newer.

Install dependencies:

```bash
pnpm install
```

Initialize local D1:

```bash
pnpm db:init
```

Run frontend and Worker together:

```bash
pnpm dev
```

Open the UI at `http://localhost:5173`. The Worker is at `http://localhost:8787`.

Run services separately when debugging:

```bash
pnpm dev:web
pnpm dev:worker
```

Local Wrangler behavior:

- D1, R2, Durable Objects, and Workflows run in local mode.
- AI uses remote Workers AI and may incur usage charges.
- Vectorize is not supported locally unless configured as a remote binding.
- The UI and deterministic red-flag fallback work without seeded AI or Vectorize.

Optional frontend environment variables:

- `VITE_API_BASE_URL` changes the Worker API base URL.
- `VITE_CALLS_SIGNALING_URL` enables the Cloudflare Calls WebRTC signaling boundary.

## Validation

Run the complete validation suite before handing off changes:

```bash
pnpm typecheck
pnpm build
pnpm db:init
```

`pnpm build` includes a Vite production build and `wrangler deploy --dry-run`. The dry run must show `AI`, `DB`, `REPORTS_BUCKET`, `VECTOR_INDEX`, `SLOT_LOCK_DO`, and `TRIAGE_WORKFLOW` bindings.

Useful manual checks:

```bash
curl http://localhost:8787/
curl http://localhost:8787/api/health
curl http://localhost:8787/api/practices
curl 'http://localhost:8787/api/slots?odsCode=G82001'
```

In the UI, test both a routine symptom narrative and an emergency phrase such as `I have chest pain`.

## Change Rules

- Keep changes inside the owning domain whenever possible.
- Change shared contracts only in `packages/types/src/` and update all consumers in the same change.
- Do not add production patient data, credentials, API tokens, or real NHS identifiers to the repository.
- Do not commit `.env`, `.dev.vars`, `.wrangler`, `node_modules`, or build output.
- Do not weaken emergency escalation to make a demo flow look smoother.
- Do not expose Cloudflare Calls or NHS API secrets in browser code.
- Prefer small, typed changes over compatibility layers or speculative abstractions.
- Run typecheck and the relevant build after edits.
- Inspect the worktree before committing and stage only intended files.
