# Roughcut migration away from coconut-agent

## Goal and non-goals

Retain study evidence, video playback, interaction attribution, and editable timeline
imports without shipping coconut-agent source or depending on its Python environment.
Separately replace roughcut generation. A portable reviewer is not a replacement
generation engine and must not imply that it can regenerate missing videos.

The study archive is a read/review snapshot: all folder-assigned projects, raw JSONL
events, current grid/text plans, annotations, surviving job renders, available
current previews/manual exports, and small clip/sound catalog metadata used to
identify logged assets. At the user's request it does not include source/ingested
footage, clip caches, stock audio, thumbnails, ingestion libraries, run payloads,
or reconstruction recordings. It contains no coconut-agent implementation.

Initial/final version labels mean earliest/latest surviving recorded render.
Deleted Ryan Task 2 videos remain unrecoverable from this archive. Its reconstruction
events retain their inference/confidence metadata and are not original observations.

## Stage 0: establish artifact ownership (before moving repositories)

1. Run `npm run archive:export` to create a new `study-archive/` snapshot.
   Another snapshot requires a fresh output path:
   `npm run archive:export -- --output /absolute/path/to/new-snapshot`.
2. Run `node study-archive/server.mjs`, then review at `http://127.0.0.1:4100`.
   Render playback, interaction review, and annotations need only Node.js 20+.
   Source-clip previews are intentionally disabled. No FFmpeg, Python, or
   coconut-agent installation is needed for archive review.
3. Keep the entire directory together. Preserve `archive.json`,
   `archive-report.json`, project copies, relative media paths, and annotations.
   SHA-256 media inventories provide integrity checks, not completeness guarantees
   about files already deleted before export.
   Run `node verify.mjs` inside a copied archive to verify its full file inventory.
   Changes to existing annotation files are reported separately and expected
   after review; missing files and other content mismatches fail verification.
4. This review archive is not a backup of source footage or editable run assets.
   Preserve those separately if later regeneration/editing is required; do not
   remove them from the working study repository.
   Make a second independent backup of the review archive, record its size/checksums, and test the server
   from a location that cannot access the original repository. Do not rely on
   symlinks, the original `data/media`, or coconut-agent directories.
5. Treat the archive as restricted research data. Confirm participant consent and
   storage policy before sharing videos/logs. The server binds to loopback and is
   not an authenticated deployment for public or multi-user access.
6. Keep the live app/data intact until the backup and review checks pass. Export is
   not synchronization: later live edits do not appear in the snapshot.

**Gate:** all 26 folder-assigned projects load, surviving renders seek, grid/text
counts match the existing interaction panels, annotations survive restart, and
the report explains every unavailable render. Backup verification succeeds.

## Stage 1: decouple storage and playback in Nami

Current coupling:

- `server/src/lib/roughcut.ts` records jobs under each project's plan directory and
  references run artifacts under `coconut-agent/projects/<footage>/roughcuts/<run>/`.
- `server/src/lib/footage.ts` resolves source video/sound files through coconut
  manifests and path conventions.
- `server/src/lib/thumbnails.ts` creates/cache-serves thumbnails and trimmed clips.

Move owned data to stable application directories such as
`data/footage/<libraryId>/` and `data/roughcuts/<projectId>/<jobId>/`.
Use opaque asset IDs and root-relative storage keys, never machine-specific
absolute paths as the durable contract. Keep original manifests/logs as evidence;
write separately versioned normalized catalogs and timelines.

Create a one-shot data migration with a dry-run inventory, checksum copy, explicit
missing-file report, and atomic manifest update after successful copy. Preserve
job IDs, chronological ordering, source trims, sound IDs, timeline lanes,
source-card IDs, text-plan line references, and historical provenance. Rewrite
OTIO media references using a verified original-path-to-asset mapping rather than
guessing from basenames. Preserve generated assets alongside the run.

Keep existing API routes and thumbnail numbering while swapping storage readers.
No interaction event should be emitted merely because files changed location.

**Gate:** playback, thumbnail strips, selected moments, audio, and all versions
work with the coconut-agent directory unavailable; old logs/labels are unchanged.

## Stage 2: define an engine-neutral roughcut job contract

Current `server/src/lib/roughcutRunner.ts` launches
`coconut-agent/.venv/bin/python` with `roughcut_stream.py`, parses JSONL progress,
and depends on coconut paths/environment forwarding. Replace that transport with
a small engine boundary, while preserving the surrounding job lifecycle/UI.

Version the request schema:

- project/job IDs; grid or committed text-plan snapshot; footage/sound catalog;
- source assets with storage keys and durations;
- model/provider configuration held server-side, never saved secrets;
- explicit output directory, duration/resolution/fps/audio requirements;
- originating card IDs or text-plan line references for every planned segment.

Version the result schema:

- job status, phase, ordered progress events, timestamps, error details;
- final rendered asset ID;
- canonical timeline JSON (segments, trims, lane, position, volume, text overlays);
- attribution per segment (`sourceCardIds` / text-plan line references);
- verification results, diagnostics, generated assets, optional OTIO interchange.

Specify cancellation, timeout, process failure, retry, and restart recovery.
Persist immutable request/result snapshots; retries get explicit attempt IDs and
must not overwrite prior versions. Validate paths and segment bounds before
registering results. Failed jobs must not be presented as successful fallback
renders.

**Gate:** a deterministic fixture engine exercises progress, success, cancellation,
failure, and restart recovery through existing backend routes and UI.

## Stage 3: remove the Python OTIO import dependency

`server/src/lib/roughcutOutput.ts` currently calls coconut-agent's `otio_to_json.py`
to bridge generated OTIO into editor `MediaFile[]` / `TextElement[]`. It preserves
source trims, lane/row, volume, source-card/text-line attribution, and
`fromRoughcutJobId`; those semantics are required, not optional polish.

Make canonical timeline JSON the engine's primary output, validated at the
backend boundary. Import it using a pure TypeScript adapter. Keep OTIO as optional
interchange data, not a required coconut script invocation. If existing OTIO must
remain editable, convert those files during migration with a separately licensed
converter or implement the supported OTIO subset with fixtures; explicitly reject
unsupported nested stacks/effects/timebases.

Distinguish imported editable timelines from render-only playback. A render-only
result can remain usable for review, but an OTIO parse failure must be surfaced
and must not masquerade as successful editable import.

**Gate:** fixture comparisons cover exact start/end/source offsets, frame-rate
rounding, overlap/lane order, volume, text duration, generated assets, group-child
card attribution, and text-plan line attribution.

## Stage 4: replace generation and verification

Lowest-risk first implementation: a deterministic FFmpeg renderer of the existing
explicit grid/text-plan selections. This establishes segment selection, trims,
sound mixing, duration, transitions, subtitles/text, and a reproducible canonical
timeline before introducing autonomous model editing.

Then add an independently owned planner that produces the same validated contract.
Do not port coconut implementation files implicitly. Inventory licenses and
ownership of every dependency and generated asset. Keep provider credentials in
deployment configuration; document which source/transcript information is sent
to each provider. Preserve model/version and prompt provenance where policy
allows, without logging secrets.

Reimplement verification as named checks: playable output, expected duration,
source bounds, media availability, frame/audio formats, required content,
attribution coverage, and timeline/render agreement. Separate hard failures from
human-review warnings. Compare representative grid, group, text-plan, B-roll,
music, generated-asset, and failed-job cases against accepted reference outputs.

**Gate:** representative renders meet measurable duration/trim/audio/attribution
checks. User-facing differences are documented and accepted, not hidden.

## Stage 5: controlled cutover and repository portability

1. Put the new engine behind an explicit selection/feature flag.
2. Run parity cases without modifying original study projects.
3. Keep prior jobs/results readable; do not regenerate historical evidence.
4. Remove runtime references to coconut source, virtualenv, manifest root, and
   conversion scripts only after storage, job, timeline, and render gates pass.
5. Test a clean checkout with documented Node/FFmpeg dependencies and no coconut
   checkout or local credentials. Model-assisted generation additionally requires
   its documented provider configuration, unlike archive review.
6. Retain rollback via the old deployment and independent data backups until the
   new engine has passed real project acceptance.

## Work order and risks

Do Stage 0 immediately; Stages 1–3 establish portability independently of model
quality. Build the deterministic renderer before autonomous editing. Budget Stage
4 separately: playback independence can be completed much sooner than comparable
generation quality.

Highest risks are deleted artifacts, absolute OTIO paths, generated assets not
registered as owned media, timebase/trim drift, loss of card/line attribution,
large-dataset copying, and provider/agent licensing. Missing evidence cannot be
fixed by migration; record it honestly. Avoid putting tens of GB of participant
media into ordinary Git history. Use approved storage/backups or a deliberately
configured large-file store, with access controls.
