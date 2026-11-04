# Deployment Guide — HakiScribe-AI public demo

## Recommended: Render Blueprint (full-stack, FREE plan)

Why Render: one Docker service runs the Express API + production Vite build +
realtime WebSocket together. The `render.yaml` Blueprint in this repo encodes
all of it: service `hakiscribe-ai`, Docker runtime, Free plan, health check
`GET /api/v1/audit/health`.

### Free-plan limitations (read before deploying)

- **Ephemeral storage.** The Blueprint sets `HAKISCRIBE_DB_PATH=/tmp/hakiscribe.db`
  and `STORAGE_DIR=/tmp/storage` with no persistent disk. SQLite records,
  uploaded recordings, and generated documents **disappear after restarts,
  redeployments, or instance replacement**.
- **Sleep on idle.** Free services sleep after inactivity; the first visit after
  sleep may take about a minute to wake up. Open the URL a few minutes before
  the judges arrive.
- **Demo only.** This environment must not be presented as reliable permanent
  storage for official or confidential court records.

### Exact steps (about 10 minutes)

1. Push this repo to GitHub (private is fine).
2. Create an account at https://render.com (GitHub sign-in is fastest).
3. Dashboard → **New +** → **Blueprint** → connect the repo → Render reads `render.yaml`.
4. Plan: confirm **Free** → **Apply**. There is no disk to configure.
5. Set the Meta API key securely (see below) and make sure the service
   redeploys with the key. Without a key the app runs in honest
   MOCK mode (ledger shows `MOCK`).
6. Wait for build + deploy (~5 min). Open the service URL, e.g. `https://hakiscribe-ai.onrender.com`.
7. Smoke test: `GET https://<your-url>/api/v1/audit/health` should return `"status":"HEALTHY"` with `metaMode` `REAL` (key set) or `MOCK` (no key).
8. In the app: Dashboard → Load Demo (CR 123/2026) → Transcribe → Review → Export. Download the DOCX to confirm the watermark.

### Configuring META_API_KEY in the Render dashboard

1. Create a key at https://dev.meta.ai → Model API dashboard → API keys → Create API key. Copy it immediately (it is shown once).

2. In Render, open the `hakiscribe-ai` service → **Environment** → find `META_API_KEY` (the Blueprint declares it with `sync: false`, so Render asks for the value instead of reading it from git).

3. Paste the key as the value → **Save Changes**. Then confirm the service redeploys so the new value takes effect (use **Manual Deploy** → **Deploy latest commit** if no deploy starts on its own), and verify `GET /api/v1/audit/health` reports `metaMode` `REAL`.

4. Never paste the key into `render.yaml`, source files, docs, tests, or chat. To rotate, repeat steps 2–3 with a new key.

### Alternative: Railway (ephemeral, no volume)

1. https://railway.app → New Project → Deploy from GitHub repo.
2. Set variables (no volume needed for a demo): `HAKISCRIBE_DB_PATH=/tmp/hakiscribe.db`, `STORAGE_DIR=/tmp/storage`, `NODE_ENV=production`, plus `META_API_KEY` pasted in the Railway dashboard (or leave empty for MOCK mode). Same ephemeral limits as above apply.
3. Build: `npm ci && npm run build`. Start: `npm start`. Railway assigns a public URL automatically.

### Environment variables (all server-side; none reach the browser)

| Variable | Required | Render Free value | Purpose |
|---|---|---|---|
| `META_API_KEY` or `MODEL_API_KEY` | No (MOCK without) | set in dashboard, else empty | Meta Model API key |
| `HAKISCRIBE_DB_PATH` | No | `/tmp/hakiscribe.db` | SQLite file (ephemeral on Free) |
| `STORAGE_DIR` | No | `/tmp/storage` | Uploads/exports base (ephemeral on Free) |
| `PORT` | No | injected by Render | Service port |
| `META_API_BASE` | No | `https://api.meta.ai/v1` | Override only if Meta says so |
| `META_VOICE_MODEL` | No | `muse-voice-transcribe-1.0` | Pinned batch/realtime ASR model |
| `META_SPARK_MODEL` | No | `muse-spark-1.3` | Pinned transcript-review model |
| `META_WONDER_MODEL` | No | `muse-wonder-1.0` | Pinned bilingual-summary model |

Local defaults when the variables are unset: `data/hakiscribe.db` and `<repo>/storage`.

### Security notes

- Never commit `.env` (it is git-ignored). Keys live only in the host dashboard.
- The demo WAV and scripts are synthetic and safe to ship (`demo-data/`).
- Judge uploads are their own files; the attestation checkbox + typed-DELETE removal stay enforced.
- AI proposes, humans review: no transcript is final until a Clerk verifies and a Magistrate certifies. This demo issues drafts only.
