# Language limitations (measured where stated)

## Standing notices

- HakiScribe shows the transcript as recognised. It does not translate, paraphrase or add words.
- Accuracy can drop with accents, overlapping speech, background noise and mixed languages. Always verify against the audio.

## Measured accuracy (batch ASR)

Run 2026-11-02T08:28:17+00:00 · model muse-voice-transcribe-1.0 · mode DIARIZATION · language bias: none · keyword terms: 13 · manifest v1 · transcription source: provider_integration

- English: mean WER 0.1075 over 1 clips (93 reference words); pooled WER 0.1075.
- Kiswahili: mean WER 0.6212 over 1 clips (66 reference words); pooled WER 0.6212.
- Code-switched English-Kiswahili: mean WER 0.35 over 1 clips (80 reference words); pooled WER 0.35.

## What this does not cover

- Live microphone accuracy is not measured here.
- Speaker attribution accuracy is reported per recording in the export view, not in this set.
- Results change with the model, the language bias, and the recording conditions; re-run after any of those change.
