// One-time preparation. Serving the gallery never runs FFmpeg or reads interaction logs.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const root = path.dirname(fileURLToPath(import.meta.url));
process.chdir(root);
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const write = async (file, data) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file + '.tmp', JSON.stringify(data)); await fs.rename(file + '.tmp', file); };
const exists = async file => !!(await fs.stat(file).catch(() => null));
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 20);
const candidates = await read('design-review/plan-candidates.json');
for (const [key, file] of Object.entries({ 'e4:grid:initial': 'jonah-grid-initial.json', 'e6:grid:initial': 'brian-grid-initial.json', 'e6:text:initial': 'brian-text-initial.json' })) {
  const recovery = await read(`design-review/recovered-initial-plans/${file}`);
  candidates[key] = { ...candidates[key], plan: recovery.plan, recovery: { file, sourceEvents: recovery.sourceEvents, verification: recovery.verification } };
}
const snapshots = await read('design-review/grid-snapshots.json');
const archive = await read('archive.json');
const audit = await read('design-review/plan-audit.json');
const rawIndex = await read('gallery-data/sources.json').catch(() => ({}));
const rawFolder = process.argv[2];
if (rawFolder) {
  await fs.mkdir('media/source-footage', { recursive: true });
  for (const name of await fs.readdir(rawFolder)) {
    if (!/\.(mp4|mov)$/i.test(name)) continue;
    const source = path.join(rawFolder, name), stat = await fs.stat(source), stem = path.parse(name).name;
    const signature = `${stat.size}:${stat.mtimeMs}`;
    const file = `media/source-footage/${stem}.mp4`;
    if (rawIndex[stem]?.signature !== signature || !await exists(file)) {
      // Move MP4 metadata to the front; copy compressed audio/video without re-encoding.
      await run('ffmpeg', ['-v', 'error', '-nostdin', '-i', source, '-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy', '-movflags', '+faststart', '-y', file]);
    }
    const probe = JSON.parse((await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', file])).stdout);
    rawIndex[stem] = { file, duration: Number(probe.format.duration), signature };
  }
  await write('gallery-data/sources.json', rawIndex);
}
const tasks = [], taskKeys = new Set();
function poster(file, time = 0.1) {
  const target = `media/posters/${hash(`${file}:${time}`)}.jpg`;
  if (!taskKeys.has(target)) { taskKeys.add(target); tasks.push(async () => {
    if (await exists(target)) return;
    await fs.mkdir('media/posters', { recursive: true });
    try { await run('ffmpeg', ['-v', 'error', '-nostdin', '-ss', String(time), '-i', file, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '5', '-y', target]); }
    catch { console.warn(`No poster available: ${file}`); }
  }); }
  return target;
}
async function referenceImages(projectId) {
  const row = audit.rows.find(item => item.projectId === projectId);
  const references = { initial: [], revised: [] };
  for (const phase of ['initial', 'revised']) for (const name of row?.phases?.[phase]?.screenshots || []) {
    if (path.basename(name) !== name) throw Error('Invalid reference image path');
    const original = `plan_reference_image/${name}`, stat = await fs.stat(original);
    const file = `media/plan-references/originals/${name}`;
    const preview = `media/plan-references/previews/${hash(`${name}:${stat.size}:${stat.mtimeMs}`)}.jpg`;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.copyFile(original, file);
    tasks.push(async () => {
      if (await exists(preview)) return;
      await fs.mkdir(path.dirname(preview), { recursive: true });
      await run('ffmpeg', ['-v', 'error', '-nostdin', '-i', original, '-frames:v', '1', '-vf', 'scale=min(1280\\,iw):-2', '-q:v', '4', '-y', preview]);
    });
    references[phase].push({ name, file, preview });
  }
  return references;
}
function textDiff(initial, revised) {
  const a = initial.split(/\r?\n/), b = revised.split(/\r?\n/);
  const lcs = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i+1][j+1] + 1 : Math.max(lcs[i+1][j], lcs[i][j+1]);
  const left = [], right = []; let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { left.push({ line: a[i++], status: 'unchanged' }); right.push({ line: b[j++], status: 'unchanged' }); }
    else if (j < b.length && (i === a.length || lcs[i][j+1] >= lcs[i+1][j])) right.push({ line: b[j++], status: 'added' });
    else left.push({ line: a[i++], status: 'removed' });
  }
  const added = right.filter(x => x.status === 'added' && x.line.trim()).map(x => x.line);
  const removed = left.filter(x => x.status === 'removed' && x.line.trim()).map(x => x.line);
  return { initialDecorated: left, revisedDecorated: right, initialCount: a.filter(x => x.trim()).length, revisedCount: b.filter(x => x.trim()).length, added, removed, unchangedCount: left.filter(x => x.status === 'unchanged' && x.line.trim()).length, changedCount: added.length + removed.length };
}
const selectedVideos = {}, gridIndex = [];
for (const seed of snapshots.projects) {
  const folder = archive.folders.find(f => f.name.toLowerCase() === seed.participant.split(' ')[1]);
  for (const condition of ['text', 'grid']) {
    const project = archive.projects.find(p => p.folderId === folder.id && !!p.ablated === (condition === 'text'));
    if (!project) throw Error(`Missing project ${seed.code} ${condition}`);
    if (seed.code === 'n3' && condition === 'grid') {
      project.versions = ['initial', 'revised'].map(phase => ({ id: `restored-${phase}`, kind: 'roughcut', label: phase === 'initial' ? 'Initial restored roughcut' : 'Final restored roughcut', file: `media/renders/ryan_grid_${phase === 'initial' ? 'initial' : 'revised '}.mp4`, playable: true }));
    }
    const versions = project.versions.filter(v => v.kind === 'roughcut' && v.file && v.playable !== false);
    const videos = { initial: versions.find(v => /initial/i.test(v.label)) || versions[0], revised: versions.find(v => /final/i.test(v.label)) || versions.at(-1) };
    const media = {};
    for (const phase of ['initial', 'revised']) {
      const v = videos[phase];
      if (!v || !await exists(v.file)) { media[phase] = null; continue; }
      try {
        const probe = JSON.parse((await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name', '-of', 'json', v.file])).stdout);
        if (!probe.streams.some(s => s.codec_type === 'video')) throw Error('No video stream');
        media[phase] = { file: v.file, poster: poster(v.file), duration: Number(probe.format.duration) };
      } catch { media[phase] = null; console.warn(`Unavailable roughcut: ${v.file}`); }
    }
    selectedVideos[project.id] = media;
    const initial = candidates[`${seed.code}:${condition}:initial`], revised = candidates[`${seed.code}:${condition}:revised`];
    if (!initial || !revised) throw Error(`Missing audited plans ${seed.code} ${condition}`);
    // Save both snapshots and their evidence explicitly; never choose the first generation at runtime.
    const references = await referenceImages(project.id);
    const pair = { projectId: project.id, participant: seed.participant, condition, initial, revised, references };
    await write(`gallery-data/plans/${project.id}-snapshots.json`, pair);
    if (condition === 'text') {
      const diff = textDiff(initial.plan, revised.plan);
      const plan = { kind: 'text-plan', projectId: project.id, projectName: project.name, lineSummary: diff, summary: { initialCount: diff.initialCount, revisedCount: diff.revisedCount, added: diff.added.length, removed: diff.removed.length, changed: diff.changedCount, unchanged: diff.unchangedCount }, note: `Saved audited snapshots. Initial: ${initial.source}. Revised: ${revised.source}. Verification: ${initial.status} / ${revised.status}.`, sources: { initial: initial.source, revised: revised.source } };
      await write(`gallery-data/plans/${project.id}.json`, { ...plan, references });
    } else {
      seed.initial = initial.plan;
      seed.revised = revised.plan;
      // Retain the saved text-plan outputs; rebuilding does not generate new study prose.
      const savedTextPlan = (await read(`gallery-data/grids/${project.id}.json`)).initialTextPlan;
      const initialTextPlan = savedTextPlan && { text: savedTextPlan.text, beats: savedTextPlan.beats, sourceFile: savedTextPlan.sourceFile, sourceGridSha256: savedTextPlan.sourceGridSha256 };
      if (!initialTextPlan || initialTextPlan.sourceGridSha256 !== createHash('sha256').update(JSON.stringify(initial.plan)).digest('hex')) throw Error(`Saved Initial Grid text plan needs review: ${project.id}`);
      initialTextPlan.text = await fs.readFile(initialTextPlan.sourceFile, 'utf8');
      const narrativeFile = `projects/${project.id}/plan/narrative-plan.json`;
      const savedNarrative = await read(narrativeFile).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      let narrative = null;
      if (typeof savedNarrative?.text === 'string' && savedNarrative.text.trim()) {
        const text = savedNarrative.text;
        const boundary = text.lastIndexOf('\n## Constraints\n');
        const hasRules = boundary >= 0 && text.slice(boundary).includes('## Instructions for tagging') && text.slice(boundary).includes('## Completion requirements');
        narrative = { text, narrativeText: hasRules ? text.slice(0, boundary) : text, executionInstructions: hasRules ? text.slice(boundary) : '', updatedAt: savedNarrative.updatedAt || null, sourceGridUpdatedAt: savedNarrative.sourceGridUpdatedAt || null, sourceFile: narrativeFile };
      }
      const clips = {};
      const visit = cards => { for (const card of cards) { const moment = seed.moments[card.momentId]; const raw = rawIndex[moment?.videoName]; const start = card.sourceStartS ?? moment?.startS, end = card.sourceEndS ?? moment?.endS;
        if (card.kind === 'asset') clips[card.id] = raw && Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start && end <= raw.duration + 0.15 ? { file: raw.file, start, end, poster: poster(raw.file, start), name: moment.videoName } : { unavailable: true, name: moment?.videoName || 'Unidentified source', reason: raw ? 'Saved source range is unavailable.' : 'Original source footage has not been added.' };
        if (card.children) visit(card.children);
      } };
      // Key by phase as trims can differ while card IDs remain the same.
      const phaseClips = {};
      for (const phase of ['initial', 'revised']) { for (const beat of seed[phase].beats) for (const track of beat.tracks) visit(track.cards); phaseClips[phase] = { ...clips }; for (const key of Object.keys(clips)) delete clips[key]; }
      const grid = { ...seed, videos: media, clips: phaseClips, references, narrative, initialTextPlan, verification: { initial: { source: initial.source, status: initial.status }, revised: { source: revised.source, status: revised.status } } };
      await write(`gallery-data/grids/${project.id}.json`, grid);
      await write(`gallery-data/plans/${project.id}.json`, { kind: 'grid', projectId: project.id, projectName: project.name, viewer: `/grid-view.html?project=${project.id}&embed=1`, note: `Saved audited Grid snapshots. Verification: ${initial.status} / ${revised.status}.` });
      gridIndex.push({ id: project.id, code: seed.code, participant: seed.participant });
    }
  }
}
// Two thumbnail jobs at a time, no heavy video encoding, and cached outputs on subsequent builds.
await Promise.all(Array.from({ length: 2 }, async () => { while (tasks.length) await tasks.shift()(); }));
await write('gallery-data/grid-index.json', gridIndex);
await write('gallery-data/media.json', selectedVideos);
await write('gallery-data/archive.json', { projects: archive.projects, folders: archive.folders });
console.log(`Prepared 26 plan pairs, ${gridIndex.length} interactive grids, ${Object.keys(rawIndex).length} raw sources, and ${taskKeys.size} cached posters.`);
