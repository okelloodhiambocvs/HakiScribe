# HakiScribe-AI — Clarity in Every Proceeding

Human-in-the-loop court transcription for Kenyan courts. Built for the **Meta Global Hackathon**, rewritten as a high-performance **React + TypeScript + Vite + Tailwind CSS** application.

> **RULE: AI proposes. HUMAN REVIEWS.** Nothing here is official. Every AI output is a draft.
>
> **SYNTHETIC DATA ONLY.** Every case, name, script, and document in this app is fictional. No real litigants, no real court audio.

---

## The Problem

Justice delayed is justice denied — and in Kenyan courts, delay often starts with the transcript. A single hearing can cost **4–6 hours of manual transcription** before the record even exists, while appellants wait **months** for the records they need to move an appeal forward. For short custodial sentences, that wait can shrink what a successful appeal is worth. Across **360+ Kenyan courts**, judicial officers and registry staff repeat this slow manual work every day.

HakiScribe attacks the bottleneck, not the judgment: the AI drafts the transcript, and a human reviewer checks, corrects, and owns every word — with every change recorded and audited. English, Kiswahili, and code-switching are preserved exactly as spoken; the tool never translates, paraphrases, adds words, or makes judicial decisions.

---

## Six Capabilities Built in React

1. **Step 1: Upload and Validation**
   - File format validation (MP3, WAV, M4A, AAC, OGG, OPUS, WEBM)
   - 25MB threshold check and cryptographic SHA-256 fingerprinting
   - Synthetic demo attestation checkbox & privacy notice
   - One-click synthetic demo loader (`Case CR 123/2026`)
2. **Step 2: Transcribe with Diarization**
   - Speaker turn segmentation with accurate timestamps (`[MM:SS – MM:SS]`)
   - Speaker turns filtering by role/speaker label
   - Real-time search across verbatim transcripts
   - Low confidence filter (<0.75) and audio playback preview
   - Content-free deletion audit log with typed `DELETE` confirmation
3. **Step 3: Human Review Desk**
   - AI Review flags generated with quoted evidence (dropping hallucinated flags)
   - Jump-to-audio passage preview with start/end segment bounds
   - Side-by-side original AI text (immutable) vs. current editable text
   - Unified diff visualizer for text modifications
   - Mandatory reason required for every text edit and flag resolution
   - Flag actions: Accept Suggestion, Dismiss, Retain as Uncertain
   - Locked court taxonomy speaker assignment (Magistrate, Prosecutor, Advocate, Accused, Witness, etc.)
   - Full auditable history trail per segment
4. **Step 4: Watermarked Document Export**
   - Generates official watermarked Word draft documents (`.docx`)
   - Diagonal watermark: `DRAFT - NOT CERTIFIED`
   - Header banner: `DRAFT — NOT A CERTIFIED RECORD`
   - Complete human corrections log and unresolved issues table
   - **Appendix D**: Plain-language orientation summaries in English and Kiswahili
   - **Appendix E**: Comprehensive accuracy and audit metrics
5. **Live Transcription Capture**
   - Consented 24kHz audio capture workflow
   - Real-time streaming speaker turns with partial transcription preview
   - Batch pass finalisation converting live capture to official diarized segments
   - Seamless handoff to the Review Desk
6. **Evaluation & Governance**
   - Objective WER (Word Error Rate) and CER (Character Error Rate) calculations
   - Speaker attribution overlap percentage
   - Traceability completeness rate (100% audited edits)
   - API activity ledger and system health checks

---

## Technical Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom HakiScribe brand theme
- **Document Generation**: `docx` library for native `.docx` watermarked output
- **Icons**: Lucide React
- **Storage**: Browser-isolated local persistence with full audit ledger

---

## Quick Start

```bash
npm install
npm run dev
```

Dev server runs on `http://0.0.0.0:3000`.

To build for production:
```bash
npm run build
```
