import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';

const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.jsonl': 'application/x-ndjson', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.md': 'text/plain' };
const labelPrefixes = { labels: 'labels', 'card-outcome-labels': 'card-outcome-labels', 'text-plan-line-outcome-labels': 'text-plan-line-outcome-labels' };
const safeId = (value) => typeof value === 'string' && /^[\w.:-]+$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
function contained(root, relative) {
    const result = path.resolve(root, relative);
    if (result !== root && !result.startsWith(root + path.sep)) throw Object.assign(new Error('Path outside archive'), { status: 400 });
    return result;
}
function json(response, status, data) {
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(data));
}
async function optionalJson(file, fallback) {
    try { return JSON.parse(await fsp.readFile(file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}
export function byteRange(header, size) {
    if (!header) return null;
    const match = /^bytes=(\d*)-(\d*)$/.exec(header);
    if (!match || (!match[1] && !match[2])) throw Object.assign(new Error('Unsupported byte range'), { status: 416 });
    let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    let end = match[1] ? (match[2] ? Number(match[2]) : size - 1) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) {
        throw Object.assign(new Error('Byte range not satisfiable'), { status: 416 });
    }
    end = Math.min(end, size - 1);
    return { start, end };
}
async function sendFile(request, response, file) {
    const stat = await fsp.stat(file);
    if (!stat.isFile()) throw Object.assign(new Error('File not found'), { status: 404 });
    let range;
    try { range = byteRange(request.headers.range, stat.size); }
    catch (error) { response.setHeader('Content-Range', `bytes */${stat.size}`); throw error; }
    const headers = { 'Content-Type': mimeTypes[path.extname(file)] ?? 'application/octet-stream', 'Accept-Ranges': 'bytes',
        'Content-Length': range ? range.end - range.start + 1 : stat.size };
    if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${stat.size}`;
    response.writeHead(range ? 206 : 200, headers);
    if (request.method === 'HEAD') { response.end(); return; }
    try { await pipeline(fs.createReadStream(file, range ?? undefined), response); }
    catch (error) { if (!request.destroyed && error.code !== 'ERR_STREAM_PREMATURE_CLOSE') throw error; }
}
async function readBody(request) {
    let size = 0;
    const chunks = [];
    for await (const chunk of request) {
        size += chunk.length;
        if (size > 1024 * 1024) throw Object.assign(new Error('Request too large'), { status: 413 });
        chunks.push(chunk);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}
function validatePatch(patch, kind) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw Object.assign(new Error('Expected annotation object'), { status: 400 });
    const allowed = kind === 'labels' ? ['purpose', 'editTarget', 'method', 'specificity'] : ['outcome', 'actor', 'excluded', 'notes'];
    for (const [key, value] of Object.entries(patch)) {
        if (!allowed.includes(key)) throw Object.assign(new Error(`Unsupported annotation field: ${key}`), { status: 400 });
        if (value === null) continue;
        if (key === 'excluded' ? typeof value !== 'boolean' : typeof value !== 'string') throw Object.assign(new Error(`Invalid ${key}`), { status: 400 });
        if (key === 'outcome' && !['added', 'adjusted', 'corrected'].includes(value)) throw Object.assign(new Error('Invalid outcome'), { status: 400 });
        if (key === 'actor' && !['user', 'ai'].includes(value)) throw Object.assign(new Error('Invalid actor'), { status: 400 });
    }
}
function ffmpegClip(source, destination, startS, endS) {
    return new Promise((resolve, reject) => {
        const child = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-ss', String(startS), '-i', source,
            '-t', String(endS - startS), '-vf', 'scale=720:-2', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-c:a', 'aac', '-movflags', '+faststart', '-y', destination]);
        let stderr = '';
        child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4000); });
        child.on('error', reject);
        child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr}`)));
    });
}

export async function createArchiveServer(rootDirectory) {
    const root = path.resolve(rootDirectory);
    const manifest = JSON.parse(await fsp.readFile(path.join(root, 'archive.json'), 'utf8'));
    const projectById = new Map(manifest.projects.map((project) => [project.id, project]));
    const writes = new Map();
    const clips = new Map();
    const server = http.createServer((request, response) => {
        handle(request, response).catch((error) => {
            console.error(`[reviewer] ${request.method} ${request.url}: ${error.message}`);
            if (response.headersSent) { response.destroy(error); return; }
            json(response, error.status ?? (error.code === 'ENOENT' ? 404 : 500), { error: error.message });
        });
    });
    async function handle(request, response) {
        const url = new URL(request.url, 'http://localhost');
        if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(`http://${request.headers.host}`).hostname)) throw Object.assign(new Error('Localhost access only'), { status: 403 });
        // Same-origin local API; do not expose annotation writes to another website.
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            const origin = request.headers.origin;
            if (origin && new URL(origin).host !== request.headers.host) throw Object.assign(new Error('Cross-origin write denied'), { status: 403 });
        }
        const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
        const annotationWrite = request.method === 'PUT' && parts.length === 6 && parts[0] === 'api' && parts[1] === 'projects' &&
            parts[3] === 'interactions' && Object.hasOwn(labelPrefixes, parts[4]);
        if (!['GET', 'HEAD'].includes(request.method) && !annotationWrite) throw Object.assign(new Error('Method not allowed'), { status: 405 });
        if (parts[0] === 'api' && parts[1] === 'archive') return json(response, 200, manifest);
        if (parts[0] === 'api' && parts[1] === 'projects') {
            if (parts.length === 2) return json(response, 200, await Promise.all(manifest.projects.map((project) => optionalJson(path.join(root, 'projects', project.id, 'project.json'), {}))));
            const id = parts[2];
            if (!safeId(id) || !projectById.has(id)) throw Object.assign(new Error('Project not in this archive'), { status: 404 });
            const directory = path.join(root, 'projects', id);
            const resource = parts[3];
            if (!resource) return json(response, 200, await optionalJson(path.join(directory, 'project.json'), {}));
            if (resource === 'plan') return json(response, 200, await optionalJson(path.join(directory, 'plan', parts[4] === 'text-plan' ? 'text-plan.json' : 'grid.json'), parts[4] === 'text-plan' ? null : { beats: [] }));
            if (resource === 'archive-download') {
                const labels = {};
                for (const [kind, prefix] of Object.entries(labelPrefixes)) labels[kind] = await optionalJson(path.join(directory, 'plan/export', `${prefix}-${id}.json`), {});
                response.setHeader('Content-Disposition', `attachment; filename="annotations-${id}.json"`);
                return json(response, 200, { projectId: id, savedAt: new Date().toISOString(), labels });
            }
            if (resource === 'interactions') {
                const kind = parts[4];
                if (!kind) {
                    let text;
                    try { text = await fsp.readFile(path.join(directory, 'plan/interactions.jsonl'), 'utf8'); }
                    catch (error) { if (error.code !== 'ENOENT') throw error; text = ''; }
                    return json(response, 200, text.split('\n').filter((line) => line.trim()).map(JSON.parse));
                }
                if (kind === 'moment-clip') {
                    const momentId = parts[5];
                    if (!safeId(momentId)) throw Object.assign(new Error('Invalid moment identifier'), { status: 400 });
                    const moment = manifest.momentClips[id]?.[momentId];
                    if (!moment) throw Object.assign(new Error('Moment not indexed in archive'), { status: 404 });
                    if (moment.file) return sendFile(request, response, contained(root, moment.file));
                    const source = manifest.sourceVideos[id]?.[moment.videoName]?.file;
                    if (!source || !(moment.endS > moment.startS && moment.startS >= 0)) throw Object.assign(new Error(moment.reason ?? 'Archived source video unavailable'), { status: 404 });
                    const clipKey = `${id}:${momentId}`;
                    if (!clips.has(clipKey)) {
                        clips.set(clipKey, (async () => {
                            const destination = path.join(root, 'cache', id, `${momentId}.mp4`);
                            await fsp.mkdir(path.dirname(destination), { recursive: true });
                            try { await fsp.access(destination); }
                            catch (error) {
                                if (error.code !== 'ENOENT') throw error;
                                const temporary = destination + '.tmp.mp4';
                                try {
                                    await ffmpegClip(contained(root, source), temporary, moment.startS, moment.endS);
                                    await fsp.rename(temporary, destination);
                                } catch (cause) { await fsp.rm(temporary, { force: true }); throw cause; }
                            }
                            return destination;
                        })().catch((error) => { clips.delete(clipKey); throw error; }));
                    }
                    return sendFile(request, response, await clips.get(clipKey));
                }
                if (Object.hasOwn(labelPrefixes, kind)) {
                    const file = path.join(directory, 'plan/export', `${labelPrefixes[kind]}-${id}.json`);
                    if (request.method === 'GET') return json(response, 200, await optionalJson(file, {}));
                    const entryId = parts[5];
                    if (request.method !== 'PUT' || !safeId(entryId)) throw Object.assign(new Error('Invalid annotation operation'), { status: 400 });
                    const patch = await readBody(request);
                    validatePatch(patch, kind);
                    const prior = writes.get(file) ?? Promise.resolve();
                    const task = prior.then(async () => {
                        const labels = await optionalJson(file, {});
                        const merged = { ...labels[entryId] };
                        for (const [key, value] of Object.entries(patch)) { if (value === null) delete merged[key]; else merged[key] = value; }
                        labels[entryId] = merged;
                        await fsp.mkdir(path.dirname(file), { recursive: true });
                        await fsp.writeFile(file + '.tmp', JSON.stringify(labels, null, 2) + '\n');
                        await fsp.rename(file + '.tmp', file);
                        return merged;
                    });
                    // The request awaits the original task and surfaces errors; later writes must still be able to proceed.
                    const queue = task.catch(() => {});
                    writes.set(file, queue);
                    try { return json(response, 200, await task); }
                    finally { if (writes.get(file) === queue) writes.delete(file); }
                }
            }
            if (resource === 'moments') {
                if (!parts[4]) return json(response, 200, await optionalJson(path.join(directory, 'moments/moments.json'), []));
                if (parts[4] === 'video') {
                    const video = manifest.sourceVideos[id]?.[parts[5]];
                    if (!video) throw Object.assign(new Error('Video not indexed in archive'), { status: 404 });
                    if (parts[6] === 'thumbnails') {
                        if (!parts[7]) return json(response, 200, { frames: Object.keys(video.thumbnails).map(Number).sort((a, b) => a - b) });
                        const thumbnail = video.thumbnails[parts[7]];
                        if (!thumbnail) throw Object.assign(new Error('Thumbnail not archived'), { status: 404 });
                        return sendFile(request, response, contained(root, thumbnail));
                    }
                    if (!video.file) throw Object.assign(new Error('Source video was unavailable at export'), { status: 404 });
                    return sendFile(request, response, contained(root, video.file));
                }
            }
            if (resource === 'sound-moments') return json(response, 200, await optionalJson(path.join(directory, 'moments/sound-moments.json'), []));
            if (resource === 'sound-assets') {
                if (!parts[4]) return json(response, 200, await optionalJson(path.join(directory, 'moments/sound-assets.json'), []));
                const file = manifest.sounds[id]?.[parts[4]];
                if (!file) throw Object.assign(new Error('Sound not archived'), { status: 404 });
                return sendFile(request, response, contained(root, file));
            }
            throw Object.assign(new Error('This operation is not supported by the review-only archive'), { status: 404 });
        }
        if (parts[0] === 'api') throw Object.assign(new Error('Unknown archive API'), { status: 404 });
        const relative = parts.join('/');
        if (relative && relative.endsWith('.json')) {
            const candidate = contained(root, relative);
            try { return sendFile(request, response, candidate); }
            catch (error) { if (error.code !== 'ENOENT' && error.status !== 404) throw error; }
        }
        if (relative && ['archive.json', 'archive-report.json', 'file-inventory.json', 'ROUGH-CUT-MIGRATION-PLAN.md', 'app.js', 'styles.css', 'index.html', 'stats.html', 'stats.js', 'stats-embed.js', 'interaction-stats.json', 'plan-diffs.json', 'videos.html', 'videos.js'].includes(relative)) return sendFile(request, response, contained(root, relative));
        if (relative === 'stats') return sendFile(request, response, contained(root, 'stats.html'));
        if (relative === 'videos') return sendFile(request, response, contained(root, 'videos.html'));
        if (['media', 'cache', 'runs', 'gallery-data', 'design-review'].includes(parts[0]) || ['grid-view.html', 'grid-view.js', 'grid-view.css'].includes(relative)) return sendFile(request, response, contained(root, relative));
        return sendFile(request, response, path.join(root, 'index.html'));
    }
    return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const root = path.dirname(fileURLToPath(import.meta.url));
    const port = Number(process.env.PORT ?? 4100);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
    const server = await createArchiveServer(root);
    server.on('error', (error) => { console.error(`[reviewer] ${error.message}`); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => console.log(`Study archive reviewer: http://127.0.0.1:${port}\nArchive: ${root}`));
}
