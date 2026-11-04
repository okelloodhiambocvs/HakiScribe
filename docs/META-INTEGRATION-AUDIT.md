# Meta Model Integration Audit (2026-11-04)

Verified against official docs at https://dev.meta.ai/docs (Models, Chat
Completions, Speech-to-text, Authentication, Structured output). A model counts
as integrated only if it calls the real Meta Model API with the documented
endpoint, auth, request shape, and response parsing — name mentions do not count.

## Integration matrix

| Model / capability | Status | Evidence |
|---|---|---|
| Muse Voice Transcribe (batch `/asr/transcribe`) | IMPLEMENTED BUT NOT VERIFIED | `server/integrations/meta/voiceTranscribe.ts`: multipart `request`+`audio` parts, `DIARIZATION`, `muse-voice-transcribe-1.0`, `WAV` encoding, `sessionId` param, `languageBias` + court `keywords`; parses documented `turns[]` (`turnId/startMs/endMs/transcript/speaker`). WAV pre-check enforces mono 16-bit PCM 16/24 kHz, 10-min cap. Prior provider run: `evaluation/results/latest.json` (2026-11-02, EN WER 0.11). Needs a live key to re-verify. |
| Muse Voice Transcribe (realtime `/asr/realtime`) | IMPLEMENTED BUT NOT VERIFIED | `server/integrations/meta/realtimeTranscribe.ts`: handshake-frame auth (`authorization.accessToken`), `PCM_24KHZ`, `DIARIZATION`, `speechComplete`/`speaker` event mapping; `src/views/LiveView.tsx` streams 24 kHz PCM16 when backend reports REAL mode. Cannot verify without a key + microphone session. |
| Muse Spark (transcript review) | IMPLEMENTED BUT NOT VERIFIED | `server/integrations/meta/sparkReview.ts`: `POST /chat/completions`, model `muse-spark-1.3`, `developer`+`user` messages, full transcript in prompt, `response_format: json_schema`, OpenAI-envelope parsing, verbatim-evidence guardrail kept. No live key available, so the deterministic fallback path is what runs today. |
| Muse Wonder (EN/SW summaries) | IMPLEMENTED BUT NOT VERIFIED | `server/integrations/meta/wonderSummary.ts`: same Chat Completions contract, model `muse-wonder-1.0`, `{summary_en, summary_sw}` schema, disclaimers kept, Appendix D wiring unchanged. Same live-key caveat. |
| Meta Model API (auth/transport) | IMPLEMENTED BUT NOT VERIFIED | `server/integrations/meta/metaClient.ts`: base `https://api.meta.ai/v1`, `Bearer` auth, `META_API_KEY`/`MODEL_API_KEY` server-side only, 60 s timeout. Correct per docs; live verification needs a key. |
| Muse Image | NOT IMPLEMENTED | No genuine court-transcription use case: the API (`/v1/images/generations`, `/v1/images/edits`, model `muse-image-1.0`) generates/edits images. A fabricated "timeline image" feature would violate the no-fake-integration rule. Not integrated by design. |
| SAM 3.1 | NOT IMPLEMENTED | Real capability exists (segmentation via `POST /v1/responses`, model `sam-3.1`, image/video + text prompt → boxes/masks) and could support human-verified redaction of exhibits. Not implemented: needs an image-upload pipeline, mask rendering, and redaction review UI — not feasible in the deployment window. Pathway documented below. |
| Muse Glimmer (open weights) | NOT FEASIBLE WITHIN THE CURRENT TIME LIMIT | Self-host only (vLLM/SGLang/llama.cpp/ExecuTorch); no Model API endpoint. Needs GPU provisioning + weight download + serving — incompatible with the demo window and Render/Railway hosting. |
| Muse Spark Open (open weights) | NOT FEASIBLE WITHIN THE CURRENT TIME LIMIT | 816B-parameter MoE (42B active). Self-host or hosted provider only; far beyond demo hosting capacity. |
| Muse Code | IMPLEMENTED AND VERIFIED | This session: inspection, bug fixes, tests, and deployment prep performed by the Muse Code agent. Log: `MUSE-CODE-LOG.md`. |

## Bugs fixed in this audit (all verified against docs)

1. Spark/Wonder prompts never included the transcript text — the model had nothing to review.
2. Spark/Wonder parsed Chat Completions as `{flags}` / `{summary_en, summary_sw}` at top level; the real API returns an OpenAI envelope (`choices[0].message.content`). Every real call silently fell back to mock.
3. Wonder default model id `muse-wonder` is invalid; corrected to `muse-wonder-1.0`. Spark default moved to `muse-spark-1.3` (docs: "recommended for new work").
4. Realtime WebSocket sent `Authorization` header, which Meta ignores — auth must be in the handshake frame. Added handshake + `speechComplete`/`speaker` event mapping; browser now streams raw 24 kHz PCM in REAL mode.
5. Ledger dishonesty: Spark logged `SUCCESS` whenever a key existed even on fallback; voice failures fell back silently. Statuses are now `SUCCESS` (real) / `MOCK` (no key or forced) / `FAILED` (key present, call failed, fallback served). Endpoint strings corrected (`/chat/completions`, `/asr/transcribe`, `/asr/realtime`).

## Honest limitations (do not claim otherwise to judges)

- Kiswahili is NOT in Voice Transcribe's 25 supported languages; code-switching with Swahili is degraded (measured SW WER 0.62, see `docs/LANGUAGE-LIMITATIONS.md`). We bias toward English and preserve whatever the model returns verbatim.
- The API returns turn-level timestamps only — no word timestamps, no confidence scores (`confidence: null` is the documented standard, shown as such in the UI).
- Without `META_API_KEY`, the app runs fully on deterministic synthetic fallbacks; the audit ledger labels these `MOCK`.
- Realtime verification needs a key AND a live microphone session; treat as unverified until then.

## SAM 3.1 redaction pathway (future work, not built)

1. Add an exhibit image upload route (PNG/JPEG, size-capped, SHA-256 hashed, synthetic-only attestation).
2. Call `POST /v1/responses` with model `sam-3.1`, the image, and a noun-phrase prompt (e.g. "face", "number plate"); parse returned boxes/masks.
3. Render masked preview; require named-reviewer approval before any redacted exhibit is attached to the record; log every step in `audit_events`.
4. Never auto-redact the official transcript or exhibits without human verification.
