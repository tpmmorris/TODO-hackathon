# GPNow Deployment Guide

This guide deploys GPNow to Cloudflare so anyone with a `@cloudflare.com` email can access it.

## Architecture

| Component | Cloudflare Service | Domain |
|-----------|-------------------|--------|
| Frontend | Cloudflare Pages | `gpnow.yourdomain.com` |
| Backend API | Cloudflare Worker | `gpnow-api.yourdomain.com` |
| Database | Cloudflare D1 | — |
| Storage | Cloudflare R2 | — |
| Access Control | Cloudflare Zero Trust | Restricts both services |

---

## Prerequisites

1. A Cloudflare account (you already have this)
2. A domain in your Cloudflare account (e.g. `yourdomain.com` or a subdomain)
3. Wrangler CLI authenticated: `npx wrangler login`

---

## Step 1: Create Cloudflare Resources

### 1.1 Create the D1 Database

```bash
cd services/worker
npx wrangler d1 create gpnow-db
```

Copy the returned `database_id` and paste it into `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "gpnow-db",
    "database_id": "YOUR-REAL-DATABASE-ID-HERE"  // <-- replace mock-id
  }
]
```

### 1.2 Create the R2 Bucket

```bash
npx wrangler r2 bucket create gpnow-sbar-reports
```

### 1.3 Create the Vectorize Index (optional)

The red-flag guardrail has a deterministic fallback, so Vectorize is optional.

```bash
npx wrangler vectorize create nhs-111-guidelines --dimensions=768 --metric=cosine
```

### 1.4 Set Worker Secrets

If you are using Cloudflare Calls / WebRTC voice:

```bash
npx wrangler secret put CALLS_APP_ID
npx wrangler secret put CALLS_APP_SECRET
npx wrangler secret put TURN_TOKEN_ID
npx wrangler secret put TURN_API_TOKEN
```

If you are **not** using voice, you can skip these — the Worker will return 503 for the calls endpoints but triage will still work.

---

## Step 2: Deploy the Worker (Backend)

### 2.1 Update the API Origin in the Frontend

The frontend needs to know where the Worker API lives in production.

Open `apps/web/src/services/api.ts` and find:

```ts
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
```

For production, set the environment variable when building Pages (see Step 3.2).

Alternatively, hardcode for hackathon simplicity:

```ts
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'https://gpnow-api.yourdomain.com';
```

### 2.2 Deploy the Worker

```bash
cd services/worker
npx wrangler deploy
```

This gives you a Worker URL like:
- `https://gpnow-worker.YOUR_SUBDOMAIN.workers.dev`
- Or your custom domain if configured

### 2.3 Seed the Remote D1 Database

```bash
npx wrangler d1 execute gpnow-db --remote --file=schema.sql
```

### 2.4 Verify the Worker

```bash
curl https://gpnow-worker.YOUR_SUBDOMAIN.workers.dev/api/health
```

Should return: `{"service":"gpnow-worker","status":"ok"}`

---

## Step 3: Deploy the Frontend (Cloudflare Pages)

### 3.1 Build the Frontend

```bash
# From repo root
pnpm build
```

This creates `apps/web/dist/` with the production bundle.

### 3.2 Deploy to Pages (Direct Upload)

```bash
cd apps/web
npx wrangler pages deploy dist --project-name=gpnow-web
```

Or create a new project first:

```bash
npx wrangler pages project create gpnow-web --production-branch=main
npx wrangler pages deploy dist --project-name=gpnow-web
```

### 3.3 Add Environment Variables in Pages Dashboard

Go to **Cloudflare Dashboard → Pages → gpnow-web → Settings → Environment Variables**

Add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_API_BASE_URL` | `https://gpnow-api.yourdomain.com` or Worker URL | Production |

Then trigger a redeploy.

### 3.4 Configure Custom Domain for Pages

In the Pages dashboard:
1. Go to **Custom domains**
2. Add `gpnow.yourdomain.com`
3. Follow DNS instructions (usually automatic if domain is in Cloudflare)

---

## Step 4: Restrict Access to @cloudflare.com (Cloudflare Access / Zero Trust)

You will apply Access policies to **both** the Pages site and the Worker API.

### 4.1 Enable Cloudflare Access

Go to **Cloudflare Dashboard → Zero Trust → Access → Applications**

### 4.2 Protect the Frontend (Pages)

1. Click **Add an application**
2. Choose **Self-hosted**
3. Configure:
   - **Application name**: `GPNow Web`
   - **Session duration**: `24 hours`
   - **Domain**: `gpnow.yourdomain.com`
   
4. Add an **Access policy**:
   - **Policy name**: `Cloudflare employees only`
   - **Action**: `Allow`
   - **Selector**: `Emails ending in`
   - **Value**: `@cloudflare.com`

5. Save

Now anyone visiting `gpnow.yourdomain.com` who is not signed in with a `@cloudflare.com` email will see a Cloudflare Access login page.

### 4.3 Protect the Worker API

Repeat the same for the API subdomain:

1. Add another **Self-hosted** application
2. Configure:
   - **Application name**: `GPNow API`
   - **Domain**: `gpnow-api.yourdomain.com`

3. Add the **same policy**:
   - **Emails ending in**: `@cloudflare.com`

This prevents unauthorized direct API access.

> **Note**: If Pages and Worker are on the same domain (e.g. Pages at `gpnow.yourdomain.com` and API at `gpnow.yourdomain.com/api`), you only need one Access application. But our architecture uses a separate Worker domain, so two applications is safest.

---

## Step 5: (Optional) Custom Worker Domain

By default your Worker gets a `*.workers.dev` subdomain. To give it a clean custom domain:

1. Cloudflare Dashboard → Workers & Pages → gpnow-worker → Triggers → Custom Domains
2. Add `gpnow-api.yourdomain.com`
3. Add a CNAME in DNS pointing to the Worker

Or use Wrangler:

```bash
npx wrangler deploy --routes '{"pattern":"gpnow-api.yourdomain.com/*","custom_domain":true}'
```

---

## Quick Reference: Full Deploy Command Sequence

```bash
# 1. Login (if not already)
npx wrangler login

# 2. Create resources
cd services/worker
npx wrangler d1 create gpnow-db          # Copy database_id
npx wrangler r2 bucket create gpnow-sbar-reports

# 3. Update wrangler.jsonc with real database_id
# (edit file manually)

# 4. Set secrets (optional if not using voice)
npx wrangler secret put CALLS_APP_ID
npx wrangler secret put CALLS_APP_SECRET
npx wrangler secret put TURN_TOKEN_ID
npx wrangler secret put TURN_API_TOKEN

# 5. Deploy worker
npx wrangler deploy

# 6. Seed remote database
npx wrangler d1 execute gpnow-db --remote --file=schema.sql

# 7. Build and deploy frontend
cd ../../apps/web
pnpm build
npx wrangler pages deploy dist --project-name=gpnow-web

# 8. Configure Access in Cloudflare Dashboard
# (see Step 4 above)
```

---

## Troubleshooting

### "database_id is mock-id"
You must replace `mock-id` in `wrangler.jsonc` with the real UUID from `wrangler d1 create`.

### "Vectorize index not found"
The red-flag guardrail will fall back to deterministic keyword matching. The app is safe to run without Vectorize.

### "CORS errors in production"
The Worker sets `Access-Control-Allow-Origin: *`. If you see CORS issues, check that the Pages domain is making requests to the correct Worker URL.

### "No slots showing after deploy"
Make sure you ran `npx wrangler d1 execute gpnow-db --remote --file=schema.sql` to seed the remote database.
