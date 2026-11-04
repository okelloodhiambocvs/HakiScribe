# Deployment Guide — HakiScribe-AI public demo

## Recommended: Render Blueprint (full-stack, persistent)

Why Render: one Docker service runs the Express API + production Vite build +
realtime WebSocket together; a 1 GB disk keeps SQLite + uploads + exports alive
across restarts. The `render.yaml` Blueprint in this repo encodes all of it.

Caveat: Render disks require a paid instance (Starter, ~$7/mo). You can cancel
after judging. On the Free plan the app still works, but the database and
uploads reset on every restart — acceptable for a single judge session, not for
a standing demo.

### Exact steps (about 10 minutes)

1. Push this repo to GitHub (private is fine).
2. Create an account at https://render.com (GitHub sign-in is fastest).
3. Dashboard → **New +** → **Blueprint** → connect the repo → Render reads `render.yaml`.
4. When prompted for the `META_API_KEY` value:
   - With a key: paste it (from https://dev.meta.ai → Model API dashboard → API keys). Key format: `LLM_...`.
   - Without a key: leave it empty — the app runs in honest MOCK mode (ledger shows `MOCK`).
5. Plan: confirm **Starter** (needed for the disk) → **Apply**.
6. Wait for build + deploy (~5 min). Open the service URL, e.g. `https://hakiscribe-ai.onrender.com`.
7. Smoke test: `GET https://<your-url>/api/v1/audit/health` should return `"status":"HEALTHY"` with `metaMode` `REAL` (key set) or `MOCK` (no key).
8. In the app: Dashboard → Load Demo (CR 123/2026) → Transcribe → Review → Export. Download the DOCX to confirm the watermark.

### Alternative: Railway (volumes, similar cost)

1. https://railway.app → New Project → Deploy from GitHub repo.
2. Add a Volume mounted at `/data`; set variables: `HAKISCRIBE_DB_PATH=/data/hakiscribe.db`, `STORAGE_DIR=/data/storage`, `NODE_ENV=production`, `META_API_KEY=<key or empty>`.
3. Build: `npm ci && npm run build`. Start: `npm start`. Railway assigns a public URL automatically.

### Environment variables (all server-side; none reach the browser)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `META_API_KEY` or `MODEL_API_KEY` | No (MOCK without) | empty | Meta Model API key (`LLM_...`) |
| `HAKISCRIBE_DB_PATH` | No | `data/hakiscribe.db` | SQLite file (point at persistent disk) |
| `STORAGE_DIR` | No | `<repo>/storage` | Uploads/exports base (point at persistent disk) |
| `PORT` | No | `3000` | Injected by hosts automatically |
| `META_API_BASE` | No | `https://api.meta.ai/v1` | Override only if Meta says so |
| `META_*_MODEL` | No | voice-1.0 / spark-1.3 / wonder-1.0 | Pinned model IDs |

### Security notes

- Never commit `.env` (it is git-ignored). Keys live only in the host dashboard.
- The demo WAV and scripts are synthetic and safe to ship (`demo-data/`).
- Judge uploads are their own files; the attestation checkbox + typed-DELETE removal stay enforced.
