# Pinboard plan audit — 19 November 2026

The running app, manifest, source plans, logs, media, reviewer, and stats were not changed. This folder contains audit evidence and proposed-interface drawings only.

## Method and limits

Inspected all 26 project histories, current plans, generation attempts, video records, and all 79 supplied screenshots using local Apple Vision text recognition. Compared screenshot text with surviving generation snapshots, committed text-plan states, and current saved plans. This is a version-selection audit, not a claim that all hidden cards, cropped text, timings, or video-plan pairings have been fully verified. OCR matching is supporting evidence; its recall values are not confidence scores. Proposed refinements were excluded from committed Text candidates.

Reference screenshots are the target for identifying your intended Initial/Revised display. Video identity is audited separately. A screenshot-labelled initial plan can postdate the earliest surviving video.

## Findings

Nine current Initial selections need repair: Max Grid; Saehui Text; Xiyuan Text and Grid; Dimitris Text and Grid; Jonah Grid; Brian Text and Grid. Eight involve later generations. Two histories begin with empty attempts (Saehui and Xiyuan Text), with Saehui also counted among the later-generation cases.

Of the 52 phase records, 38 have strong visible-text support under this audit's screening method, seven have partial visible support, one needs closer review (Max Initial Grid), two are explicitly reconstructed (Ryan Grid), and four lack supplied reference screenshots (Chloe). These categories describe the available evidence, not guaranteed complete verification.

| Participant | Text initial | Grid initial | Revised evidence |
|---|---|---|---|
| n1 annie | First generation supported by reference | First generation supported by reference | Text: supported-visible-content; Grid: supported-visible-content |
| n2 evita | First generation supported by reference | First generation supported by reference | Text: supported-visible-content; Grid: supported-visible-content |
| n3 ryan | First generation supported by reference | Partial reconstruction; no original initial snapshot | Text: supported-visible-content; Grid: reconstructed-partial |
| n4 sharon | First generation supported by reference | First generation supported by reference | Text: supported-visible-content; Grid: supported-visible-content |
| n5 chloe | No screenshot; saved history available | No screenshot; saved history available | Text: missing-reference; Grid: missing-reference |
| n6 max | First generation supported by reference | Use generation at event 40; current first-event selection is wrong (partial visible support) | Text: supported-visible-content; Grid: partial-reference-support |
| n7 alex | First generation supported by reference | First generation supported by reference (partial visible support) | Text: supported-visible-content; Grid: partial-reference-support |
| e1 saehui | Use generation at event 20; current first-event selection is wrong | First generation supported by reference | Text: supported-visible-content; Grid: partial-reference-support |
| e2 xiyuan | Use generation at event 3; current first-event selection is wrong | Use generation at event 33; current first-event selection is wrong | Text: supported-visible-content; Grid: partial-reference-support |
| e3 jp | First generation supported by reference | First generation supported by reference | Text: supported-visible-content; Grid: supported-visible-content |
| e5 dimitris | Use generation at event 9; current first-event selection is wrong | Use generation at event 74; current first-event selection is wrong | Text: supported-visible-content; Grid: supported-visible-content |
| e4 jonah | First generation supported by reference | Use generation at event 30; current first-event selection is wrong (partial visible support) | Text: supported-visible-content; Grid: supported-visible-content |
| e6 brian | Use generation at event 4; current first-event selection is wrong | Use generation at event 36; current first-event selection is wrong | Text: supported-visible-content; Grid: partial-reference-support |

## Video pairing conflicts

- **e4 jonah grid:** Screenshot-matched initial plan was generated AFTER the earliest surviving video. These must not be silently paired. Selected event: `event:e81ad6c1-4fef-46e2-9fbb-6979cd0341b0` at `2026-10-08T02:31:41.705Z`. Earliest playable archived video: `2026-10-08T01:44:05.519Z`.
- **e6 brian text:** Screenshot-matched initial plan was generated AFTER the earliest surviving video. These must not be silently paired. Selected event: `event:89c883e7-a100-4f0e-b872-c51d69aa8cf0` at `2026-10-08T14:14:20.370Z`. Earliest playable archived video: `2026-10-08T01:56:26.736Z`.
- **e6 brian grid:** Screenshot-matched initial plan was generated AFTER the earliest surviving video. These must not be silently paired. Selected event: `event:de685e62-f059-4e45-af64-6d7a386e6c58` at `2026-10-08T14:15:42.381Z`. Earliest playable archived video: `2026-10-08T02:02:22.716Z`.

Brian’s reference-matched Initial Text is the second generation, titled “Editorial Plan: Jason Deck / Nice Jewish Runners (60 Seconds)”. The earlier plan is an authentic older plan and precedes the first surviving video; it is not safe to assume it was never used. Correcting the displayed plan also requires choosing a corresponding video or explicitly flagging that the pairing is unconfirmed.

## Ryan media

- `media/renders/ryan_grid_initia.mp4`: 83.862000 seconds; probe succeeded.
- `media/renders/ryan_grid_initial.mp4`: 83.862000 seconds; probe succeeded.
- `media/renders/ryan_grid_revised .mp4`: 96.160000 seconds; probe succeeded.

The two initial filenames contain byte-identical files (same SHA-256). The revised file is different. Both unique files contain H.264 video and AAC audio, and both unique files passed a complete FFmpeg decode without reported errors. They are not registered in the archive manifest yet. Browser startup and streaming performance were not tested.

## Before implementation

- Review the three video/plan pairing conflicts: Brian Text, Brian Grid, and Jonah Grid.
- Chloe has no screenshots in the supplied reference folder for either condition or phase. Preserve her available plans, and label their verification status accurately.
- Ryan Grid remains partly reconstructed even though video files are now available. Source metadata and unreadable card contents cannot be recreated exactly from these files alone.
- Max Grid’s later generation is supported by its five-beat headings, but screenshot content is heavily clipped; preserve a partial-verification status.
- Save accepted canonical snapshots separately from the raw evidence only after the identified mapping decisions are resolved.

## Evidence files

- `plan-audit.json`: all 52 phase records, candidate rankings, source event IDs, timestamps, screenshot-specific matches, and Ryan media probes.
- `plan-candidates.json`: 52 provisional candidate exports for review; these are not installed as canonical application plans. Ryan’s initial candidate is reconstructed from the synthetic initial-card batch, explicitly marked partial.
- `reference-text.json`: OCR text for every supplied screenshot.

