# Judge demo — 5-minute script (deployed app)

## Pre-demo checklist

- [ ] Public URL open, e.g. `https://hakiscribe-ai.onrender.com` (after first load; free hosts may cold-start ~1 min).
- [ ] Know your Meta mode: open `https://<your-url>/api/v1/audit/health` — `metaMode` is `REAL` (key set) or `MOCK` (honest fallback). Say it out loud at the start.
- [ ] Reviewer name ready (e.g. `Demo Clerk`).
- [ ] Optional: `docs/API-EVIDENCE.md` + `docs/LANGUAGE-LIMITATIONS.md` open in a second tab for hard questions.

## Timed script

### 0:00–0:30 — Setup and promise

Enter reviewer name. Read the rule aloud: **AI proposes, human reviews. Synthetic demo only — not an official court record.** Point at the workflow: Dashboard → Upload → Transcribe → Review → Export. State the Meta mode (REAL or MOCK) and that the ledger labels every call.

### 0:30–1:30 — Upload and transcribe

Press **Load Benchmark Demo (CR 123/2026)**. Note the SHA-256 fingerprint and attestation. Press **Transcribe Recording** (Muse Voice Transcribe, DIARIZATION mode). Read one turn aloud: speaker label, timestamp, verbatim English/Kiswahili. Note `confidence: NULL` is the documented Meta standard, not missing data.

### 1:30–2:30 — AI review

Open **Review Desk**. Press **Run AI review** (Muse Spark). Read the counts: flags created vs dropped — dropped means the evidence guard caught an unquoted (hallucinated) flag. Open one flag: type, severity, **verbatim quoted evidence**, message, suggestion. Stress: suggestions only; nothing auto-edits the transcript.

### 2:30–3:45 — Human decides

Select the flagged segment. Show original AI text (immutable) vs current text, and the diff. Make one small edit with a mandatory reason. Assign one speaker role from the locked court taxonomy. Open history: who, when, before → after, reason. Unresolved flags stay visible — nothing is silently cleared.

### 3:45–4:30 — Draft export

Open **Draft Export**. Press **Generate draft DOCX**, download it. Show the `DRAFT — NOT A CERTIFIED RECORD` banner, the correction log, **Appendix D** bilingual orientation summaries (Muse Wonder, marked not legal advice, never the record), and the metrics panel. State plainly: draft only, no AI certification exists in this system.

### 4:30–5:00 — Honesty close

If asked about accuracy: Kiswahili is outside Voice Transcribe's 25 supported languages — measured EN WER 0.11 vs SW WER 0.62 (`docs/LANGUAGE-LIMITATIONS.md`, `evaluation/results/latest.json`). If asked about real calls: the audit ledger marks every execution `SUCCESS` (real), `MOCK`, or `FAILED` — inspection, not claims. Close: **AI proposes, human reviews.**
