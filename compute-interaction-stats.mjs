import path from 'node:path';
import fsp from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

async function optionalJson(file, fallback) {
  try { return JSON.parse(await fsp.readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

async function optionalText(file, fallback = '') {
  try { return await fsp.readFile(file, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

function summarizeProjectInteractions({ project, cardOutcomeLabels, lineOutcomeLabels, deletedIds }) {
  const labeledIds = new Set([
    ...Object.keys(cardOutcomeLabels),
    ...Object.keys(lineOutcomeLabels)
  ]);
  const entries = [...Object.values(cardOutcomeLabels), ...Object.values(lineOutcomeLabels)];
  const total = entries.length;
  const aiCreated = entries.filter((entry) => entry?.actor === 'ai').length;
  const userCreated = entries.filter((entry) => entry?.actor === 'user').length;
  const userAdjusted = entries.filter((entry) => entry?.actor === 'user' && entry?.outcome === 'adjusted').length;
  const userCorrected = entries.filter((entry) => entry?.actor === 'user' && entry?.outcome === 'corrected').length;
  const aiAdjusted = entries.filter((entry) => entry?.actor === 'ai' && entry?.outcome === 'adjusted').length;
  const aiCorrected = entries.filter((entry) => entry?.actor === 'ai' && entry?.outcome === 'corrected').length;
  const userModified = userAdjusted + userCorrected;
  const aiModified = aiAdjusted + aiCorrected;
  const deleted = [...deletedIds].filter((id) => labeledIds.has(id)).length;
  const pct = (value, denominator) => denominator > 0 ? Number(((value / denominator) * 100).toFixed(1)) : 0;
  return {
    projectId: project.id,
    projectName: project.name,
    mode: project.ablated ? 'text-plan' : 'grid',
    totals: { total, aiCreated, userCreated, userModified, aiModified, userAdjusted, userCorrected, aiAdjusted, aiCorrected, deleted },
    percentages: {
      aiCreated: pct(aiCreated, total),
      userCreated: pct(userCreated, total),
      userModifiedAmongUserCreated: pct(userModified, userCreated),
      aiModifiedAmongAiCreated: pct(aiModified, aiCreated),
      userAdjustedAmongUserCreated: pct(userAdjusted, userCreated),
      userCorrectedAmongUserCreated: pct(userCorrected, userCreated),
      aiAdjustedAmongAiCreated: pct(aiAdjusted, aiCreated),
      aiCorrectedAmongAiCreated: pct(aiCorrected, aiCreated),
      deleted: pct(deleted, total)
    }
  };
}

function summarizeAverage(projectStats) {
  const averageOf = (selector) => {
    const valid = projectStats.filter(selector.filter);
    if (valid.length === 0) return 0;
    const total = valid.reduce((sum, stat) => sum + selector.pick(stat), 0);
    return Number((total / valid.length).toFixed(1));
  };
  return {
    aiCreated: averageOf({ filter: (stat) => stat.totals.total > 0, pick: (stat) => stat.percentages.aiCreated }),
    userCreated: averageOf({ filter: (stat) => stat.totals.total > 0, pick: (stat) => stat.percentages.userCreated }),
    userModifiedAmongUserCreated: averageOf({ filter: (stat) => stat.totals.userCreated > 0, pick: (stat) => stat.percentages.userModifiedAmongUserCreated }),
    aiModifiedAmongAiCreated: averageOf({ filter: (stat) => stat.totals.aiCreated > 0, pick: (stat) => stat.percentages.aiModifiedAmongAiCreated }),
    userAdjustedAmongUserCreated: averageOf({ filter: (stat) => stat.totals.userCreated > 0, pick: (stat) => stat.percentages.userAdjustedAmongUserCreated }),
    userCorrectedAmongUserCreated: averageOf({ filter: (stat) => stat.totals.userCreated > 0, pick: (stat) => stat.percentages.userCorrectedAmongUserCreated }),
    aiAdjustedAmongAiCreated: averageOf({ filter: (stat) => stat.totals.aiCreated > 0, pick: (stat) => stat.percentages.aiAdjustedAmongAiCreated }),
    aiCorrectedAmongAiCreated: averageOf({ filter: (stat) => stat.totals.aiCreated > 0, pick: (stat) => stat.percentages.aiCorrectedAmongAiCreated }),
    deleted: averageOf({ filter: (stat) => stat.totals.total > 0, pick: (stat) => stat.percentages.deleted })
  };
}

function summarizeBucket(projects) {
  return {
    projectCount: projects.length,
    averages: summarizeAverage(projects)
  };
}

async function main() {
  const root = path.dirname(fileURLToPath(import.meta.url));
  const manifest = JSON.parse(await fsp.readFile(path.join(root, 'archive.json'), 'utf8'));
  const projectStats = await Promise.all(manifest.projects.map(async (project) => {
    const projectRoot = path.join(root, 'projects', project.id);
    const cardOutcomeLabels = await optionalJson(path.join(projectRoot, 'plan/export', `card-outcome-labels-${project.id}.json`), {});
    const lineOutcomeLabels = await optionalJson(path.join(projectRoot, 'plan/export', `text-plan-line-outcome-labels-${project.id}.json`), {});
    const interactionsText = await optionalText(path.join(projectRoot, 'plan/interactions.jsonl'), '');
    const deletedIds = new Set();
    for (const line of interactionsText.split('\n')) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (!event?.target?.id) continue;
      if (event.action?.endsWith('.delete') || event.after === null) deletedIds.add(event.target.id);
    }
    return summarizeProjectInteractions({ project, cardOutcomeLabels, lineOutcomeLabels, deletedIds });
  }));
  const payload = {
    exportedAt: manifest.exportedAt,
    generatedAt: new Date().toISOString(),
    projectCount: projectStats.length,
    averages: summarizeAverage(projectStats),
    comparison: {
      textPlan: summarizeBucket(projectStats.filter((project) => project.mode === 'text-plan')),
      grid: summarizeBucket(projectStats.filter((project) => project.mode === 'grid'))
    },
    projects: projectStats
  };
  const outputFile = path.join(root, 'interaction-stats.json');
  await fsp.writeFile(outputFile, JSON.stringify(payload, null, 2) + '\n');
  console.log(`Wrote ${outputFile}`);
}

await main();
