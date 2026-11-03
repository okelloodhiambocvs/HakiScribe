# HakiScribe ASR evaluation (measured)

> Every number below comes from `evaluation/results/latest.json`.
> Nothing here is estimated.

Run 2026-11-02T08:28:17+00:00 · model muse-voice-transcribe-1.0 · mode DIARIZATION · language bias: none · keyword terms: 13 · manifest v1 · transcription source: provider_integration

## Per-category results

Mean of per-clip rates, and pooled rates over all reference words or characters; lower is better, a perfect transcript scores zero.

| Category | Clips | Mean WER | Mean CER | Pooled WER | Pooled CER | Reference words |
| --- | --- | --- | --- | --- | --- | --- |
| English | 1 | 0.1075 | 0.1024 | 0.1075 | 0.1024 | 93 |
| Kiswahili | 1 | 0.6212 | 0.2376 | 0.6212 | 0.2376 | 66 |
| Code-switched English-Kiswahili | 1 | 0.35 | 0.3608 | 0.35 | 0.3608 | 80 |

## Per-clip results

| Clip | Category | WER | CER | Reference words | Word edits | Character edits | Reference characters |
| --- | --- | --- | --- | --- | --- | --- | --- |
| en-001 | english | 0.1075 | 0.1024 | 93 | 10 | 52 | 508 |
| sw-001 | kiswahili | 0.6212 | 0.2376 | 66 | 41 | 105 | 442 |
| cs-001 | code_switched | 0.35 | 0.3608 | 80 | 28 | 162 | 449 |

## Method

- Each clip runs through the real batch endpoint: the same code path as the app, DIARIZATION mode with the configured keywords and language bias.
- WER and CER use `evaluation_service` normalisation: Unicode NFC, lower-case, punctuation stripped, whitespace collapsed, diacritics preserved, no translation.
- Category means are arithmetic means of the per-clip rates: every clip carries equal weight.
- Pooled WER is total word edits divided by total reference words; pooled CER is total character edits divided by total reference characters, including spaces. Mean metrics give every clip equal weight, while pooled metrics weight clips according to their reference length, so the two can differ when clip lengths vary. Neither method is universally better; they answer different evaluation questions.
- The transcription source names the selected code path (`provider_integration` or `injected`); it is not proof that an external provider request succeeded.
- Regenerate with `python scripts/evaluate_asr.py` then `python scripts/render_evaluation_doc.py`.
