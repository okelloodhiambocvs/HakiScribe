# Demo assets inventory

Every audio file below is synthetic Windows SAPI speech. No real
hearings, litigants, or case facts anywhere. All WAVs are 16 kHz mono
16-bit PCM with per-speaker voice casting (Microsoft David + Zira).

## Demo hearing (`demo-data/synthetic/`)

The one-click in-app demo (`Load demo recording`).

| File | What it is |
|---|---|
| `case-cr-123-2026.wav` | 16 turns, ~115 s, 3.7 MB. Fictional CR 123/2026 hearing, mixed English/Kiswahili |
| `case-cr-123-2026-script.md` | Speaker-line source script the WAV is rendered from |
| `charge-sheet-synthetic.txt` | Fictional charge sheet prop |
| `README.md` | Folder notes |

Re-render (repo root, Windows PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\make_demo_audio.ps1
```

## Evaluation clips (`evaluation/`)

One clip per category, each 8 turns and 20–60 s. Manifest:
`evaluation/manifest.json` (v1, consent notes per clip).

| Clip | Category | Audio | Duration | Reference words |
|---|---|---|---|---|
| `en-001` | english | `audio/en-001.wav` (1.5 MB) | 47.8 s | 93 |
| `sw-001` | kiswahili | `audio/sw-001.wav` (1.7 MB) | 53.0 s | 66 |
| `cs-001` | code_switched | `audio/cs-001.wav` (1.7 MB) | 54.3 s | 80 |

Supporting files per clip:

| File | What it is |
|---|---|
| `evaluation/scripts/<id>.md` | Speaker-line source script (plain words only: no digits, hyphens, or abbreviations, so spoken audio matches the reference exactly) |
| `evaluation/reference/<id>.txt` | Reference transcript: exact words spoken, in order, no labels or timestamps (generated from the script) |
| `evaluation/audio/<id>.reference.json` | Per-turn timings measured from the rendered audio plus the file SHA-256 |
| `evaluation/results/latest.json` | Scored output of `scripts/evaluate_asr.py` (committed, so every accuracy claim stays backed) |

Re-render one clip:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\make_demo_audio.ps1 -ScriptPath evaluation\scripts\en-001.md -OutPath evaluation\audio\en-001.wav
```

Re-run measurement (needs `META_API_KEY`; real endpoint only, mock
results are refused as fake measurements):

```bash
python scripts/evaluate_asr.py
python scripts/render_evaluation_doc.py
```

Current numbers live in [EVALUATION.md](EVALUATION.md) and
[LANGUAGE-LIMITATIONS.md](LANGUAGE-LIMITATIONS.md) — read those, not
this file, for accuracy claims.

## Provenance notes

- Clip scripts use fresh fictional lines disjoint from the demo
  hearing, so the evaluation set does not simply replay the demo.
- Kiswahili clips are read by en-US SAPI voices (no Kiswahili voice
  installed here); scores measure this synthetic setup honestly and
  will differ from real-speaker speech.
- The renderer walks RIFF chunks to find the PCM offset (SAPI emits
  18-byte `fmt ` chunks); all shipped WAVs parse under both Python
  `wave` and the app's own `audio_prep` loader.

## Demo flow pointers

- 5-minute table: [README](../README.md) quick demo table.
- Timed script with checklist: [JUDGE-DEMO.md](JUDGE-DEMO.md).
- Real-call evidence: [API-EVIDENCE.md](API-EVIDENCE.md) via
  `python scripts/generate_api_evidence.py`.
