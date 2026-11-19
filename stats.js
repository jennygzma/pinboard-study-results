function pct(value) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

function pie(values, colors) {
  let running = 0;
  const slices = values
    .map((value, index) => {
      const start = running;
      running += value;
      return `${colors[index]} ${start}% ${running}%`;
    })
    .join(', ');
  return `conic-gradient(${slices})`;
}

function metricRow(label, value, detail) {
  return `
    <div class="flex items-center justify-between border-b py-2 text-sm last:border-b-0">
      <div>
        <div class="font-medium">${label}</div>
        <div class="text-xs text-gray-500">${detail}</div>
      </div>
      <div class="text-right font-semibold">${value}</div>
    </div>
  `;
}

function projectCard(project) {
  const user = project.percentages.userCreated;
  const ai = project.percentages.aiCreated;
  const totalShare = user + ai;
  const normalizedUser = totalShare > 0 ? (user / totalShare) * 100 : 0;
  const normalizedAi = totalShare > 0 ? (ai / totalShare) * 100 : 0;

  return `
  <article class="rounded-lg border bg-white p-4 shadow-sm">
    <h2 class="text-base font-semibold">${project.projectName}</h2>
    <p class="text-xs text-gray-500">${project.projectId}</p>

    <div class="mt-3 flex items-center gap-4">
      <div class="h-28 w-28 rounded-full border" style="background:${pie([normalizedUser, normalizedAi, 100 - normalizedUser - normalizedAi], ['#2563eb', '#16a34a', '#e5e7eb'])}"></div>
      <div class="text-sm">
        <div><span class="inline-block h-2 w-2 rounded-full bg-blue-600"></span> User-created: ${pct(user)}</div>
        <div><span class="inline-block h-2 w-2 rounded-full bg-green-600"></span> AI-created: ${pct(ai)}</div>
      </div>
    </div>

    <div class="mt-3">
      ${metricRow('Created split (user vs AI)', `${project.totals.userCreated} / ${project.totals.aiCreated}`, `${project.totals.total} total lines/cards`) }
      ${metricRow('% user-created modified/adjusted', pct(project.percentages.userModifiedAmongUserCreated), `${project.totals.userModified} of ${project.totals.userCreated} user-created`) }
      ${metricRow('% deleted', pct(project.percentages.deleted), `${project.totals.deleted} deleted IDs`) }
    </div>
  </article>`;
}

async function main() {
  const summaryNode = document.getElementById('summary');
  const cardsNode = document.getElementById('cards');

  try {
    const response = await fetch('/api/interaction-stats');
    if (!response.ok) throw new Error(`Failed to load stats (${response.status})`);
    const data = await response.json();

    summaryNode.innerHTML = `
      <h2 class="text-lg font-semibold">Averages across ${data.projectCount} people/projects</h2>
      <p class="text-xs text-gray-500">Exported ${new Date(data.exportedAt).toLocaleString()}</p>
      <div class="mt-3 grid gap-2 md:grid-cols-2">
        <div class="rounded border p-3 text-sm"><div class="text-gray-600">Avg % user-created</div><div class="text-xl font-semibold">${pct(data.averages.userCreated)}</div></div>
        <div class="rounded border p-3 text-sm"><div class="text-gray-600">Avg % AI-created</div><div class="text-xl font-semibold">${pct(data.averages.aiCreated)}</div></div>
        <div class="rounded border p-3 text-sm"><div class="text-gray-600">Avg % user-created modified/adjusted</div><div class="text-xl font-semibold">${pct(data.averages.userModifiedAmongUserCreated)}</div></div>
        <div class="rounded border p-3 text-sm"><div class="text-gray-600">Avg % deleted</div><div class="text-xl font-semibold">${pct(data.averages.deleted)}</div></div>
      </div>
    `;

    cardsNode.innerHTML = data.projects.map(projectCard).join('');
  } catch (error) {
    summaryNode.innerHTML = `<p class="text-red-700">${error.message}</p>`;
  }
}

main();
