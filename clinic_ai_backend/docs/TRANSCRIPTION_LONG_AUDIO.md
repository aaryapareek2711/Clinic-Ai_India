# Long audio transcription (10+ minutes)

## Root cause (fixed)

The worker called Azure **Speech-to-text REST API for short audio**:

`https://<region>.stt.speech.microsoft.com/speech/recognition/{interactive|conversation}/cognitiveservices/v1`

Microsoft documents a **maximum of about 60 seconds of audio per request** for this endpoint. Sending a full consultation (for example ~12 minutes) still returned HTTP 200, but only the **first portion** of the file was recognized—hence short `audio_duration_seconds`, few words, and misleading “success.”

Implementation: `src/workers/transcription_worker.py` — `_candidate_azure_speech_endpoints` (short-audio URLs) and `_call_azure_speech` (now splits long PCM WAVs and merges segments).

## What we do now

1. Download full bytes from GridFS / `file://` (unchanged).
2. **FFmpeg** transcode to **16 kHz mono PCM WAV** (unchanged).
3. If WAV duration **>** `TRANSCRIPTION_SHORT_AUDIO_MAX_SECONDS` (default **55**) and **ffmpeg** is installed, the WAV is **split in time** into chunks of `TRANSCRIPTION_CHUNK_SECONDS` (default **50** seconds).
4. Each chunk is POSTed to the same short-audio REST API; transcripts are **stitched** with millisecond offsets.

Without ffmpeg, long files still **truncate**; the worker logs a warning.

## Operator checklist

| Item | Notes |
|------|--------|
| **ffmpeg** (and **ffprobe** optional) | Required on the worker host for chunking. Render: ensure it is in the Docker image or buildpack. |
| `TRANSCRIPTION_JOB_TIMEOUT_SEC` | Default **3600**. Must exceed `(chunk_count × per-chunk latency)` for long visits. |
| `TRANSCRIPTION_TIMEOUT_SEC` | Per **HTTP POST** to Azure (one chunk). Default **120** is usually enough. |
| `MAX_AUDIO_SIZE_MB` | Upload limit in the API; independent of Azure’s **duration** limit. |
| `TRANSCRIPTION_DEBUG_BYTES=true` | Logs `download_bytes`, `wav_duration_s`, `chunk_count` at INFO for one failing job. |

## Manual repro (11+ minutes)

1. Register patient + visit; complete pre-visit so upload is allowed.
2. Upload a real **~12 minute** WAV or MP3 under `MAX_AUDIO_SIZE_MB`.
3. Poll `GET /notes/transcribe/status/{patient_id}/{visit_id}` until `completed`.
4. Confirm `word_count` / transcript length and that `audio_duration_seconds` is in the **several-minute** range (from merged segment timings), not ~15–20 seconds.

## Automated tests

- `tests/unit/test_transcription_wav_chunking.py` — PCM duration parsing and ffmpeg split (skipped if ffmpeg is missing).

## Alternatives not implemented (larger change)

- **Batch transcription** (blob SAS + polling) — best for very long files; needs durable blob URLs.
- **Speech SDK continuous recognition** — WebSocket/long session; heavier dependency and process model.
