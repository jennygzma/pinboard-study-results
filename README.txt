Portable roughcut and interaction review archive

Start: node server.mjs
Open: http://127.0.0.1:4100
Stats dashboard: http://127.0.0.1:4100/stats
Video gallery: http://127.0.0.1:4100/videos
Precompute interaction stats (optional, faster load): node compute-interaction-stats.mjs
Requirements to view: Node.js 20+ only. No npm install, Nami backend, Python, cloud service, or API keys are required.
Interactive Grid: http://127.0.0.1:4100/grid-view.html

The gallery uses gallery-data/ prepared plan pairs, media indexes, and small posters.
It loads videos only when opened; cards in the Grid can play the exact saved source segment.
Initial and revised plans are saved separately with audit source and verification metadata.
Some states remain partially verified/reconstructed; the Grid and plan provenance identify these.
Ryan's restored Grid videos are included in the gallery-specific media index.

To rebuild after changing plan candidates or adding media (requires ffmpeg and ffprobe):
  node build-gallery.mjs
To import/reimport a raw source folder and rebuild:
  node build-gallery.mjs '/path/to/raw-footage-folder'
Builds cache raw remuxes and thumbnails. Viewing never transcodes video or replays interaction logs.
Check the gallery, saved plan sources, source-segment links, and HTTP video streaming:
  node verify-gallery.mjs
The older verify.mjs checks the original export checksums; existing edits/replaced media no longer match that historical inventory. It is not the gallery build check.

Contains all surviving roughcut versions and editor/manual exports, raw interaction logs, plans, annotations, and asset-identification metadata.
The original export excluded source footage. Sixteen Mudwitch originals have since been imported into media/source-footage/ and indexed in gallery-data/sources.json. Other source footage, stock audio, ingestion libraries, run payloads, and reconstruction recordings remain excluded. Missing footage is shown explicitly.

Copy this ENTIRE directory to move it. Labels save inside projects/<id>/plan/export/. Back up this folder to preserve annotations. Run node verify.mjs after copying/unzipping to check file integrity.

See archive-report.json for missing/failed versions and ROUGH-CUT-MIGRATION-PLAN.md for generation migration.
This is a snapshot, not a live sync. Export to a fresh --output directory for another snapshot.
