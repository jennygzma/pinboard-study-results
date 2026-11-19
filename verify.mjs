import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const root = path.resolve(process.argv[2] ?? path.dirname(fileURLToPath(import.meta.url)));
const inventory = JSON.parse(await fs.readFile(path.join(root, 'file-inventory.json'), 'utf8'));
const failures = [];
const updatedAnnotations = [];
let bytes = 0;
for (const [relative, expected] of Object.entries(inventory)) {
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) throw new Error(`Invalid inventory path: ${relative}`);
    try {
        const hash = crypto.createHash('sha256');
        const stat = await fs.stat(file);
        await pipeline(createReadStream(file), hash);
        const matches = stat.size === expected.bytes && hash.digest('hex') === expected.sha256;
        bytes += stat.size;
        if (!matches) {
            if (/^projects\/[^/]+\/plan\/export\/(?:labels|card-outcome-labels|text-plan-line-outcome-labels)-[^/]+\.json$/.test(relative)) updatedAnnotations.push(relative);
            else failures.push(relative);
        }
    } catch (error) { failures.push(`${relative}: ${error.message}`); }
}
console.log(JSON.stringify({ filesChecked: Object.keys(inventory).length, bytesChecked: bytes,
    failures, updatedAnnotations, note: 'Annotation changes are expected after review; other checksum mismatches or missing files fail verification.' }, null, 2));
if (failures.length) process.exitCode = 1;
