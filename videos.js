const PARTICIPANT_ORDER = [
  { code: 'n1', name: 'annie', label: 'n1 annie' },
  { code: 'n2', name: 'evita', label: 'n2 evita' },
  { code: 'n3', name: 'ryan', label: 'n3 ryan' },
  { code: 'n4', name: 'sharon', label: 'n4 sharon' },
  { code: 'n5', name: 'chloe', label: 'n5 chloe' },
  { code: 'n6', name: 'max', label: 'n6 max' },
  { code: 'n7', name: 'alex', label: 'n7 alex' },
  { code: 'e1', name: 'saehui', label: 'e1 saehui' },
  { code: 'e2', name: 'xiyuan', label: 'e2 xiyuan' },
  { code: 'e3', name: 'jp', label: 'e3 jp' },
  { code: 'e5', name: 'dimitris', label: 'e5 dimitris' },
  { code: 'e4', name: 'jonah', label: 'e4 jonah tbd' },
  { code: 'e6', name: 'brian', label: 'e6 brian tbd' }
];


function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function shorten(text, maxLength = 140) {
  const source = normalizeText(text);
  if (source.length <= maxLength) return source;
  return `${source.slice(0, maxLength - 1)}…`;
}

function modeLabel(project) {
  return project.ablated ? 'text-plan' : 'grid';
}


function extractParticipantCode(participantLabel) {
  const match = String(participantLabel ?? '').toLowerCase().match(/\b([ne]\d+)\b/);
  return match ? match[1] : '';
}

function formatSignedNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return '—';
  const formatted = Number(value.toFixed(digits));
  return `${formatted > 0 ? '+' : ''}${formatted}`;
}

function buildPlanFollowingScoreContext(scores, payload) {
  const participantCode = extractParticipantCode(payload?.participant);
  if (!participantCode || !payload?.condition) return null;

  const key = `${participantCode}:${payload.condition}`;
  const initial = scores?.initial?.[key] ?? null;
  const revised = scores?.revised?.[key] ?? null;
  if (!initial && !revised) return null;

  const initialPercent = Number.isFinite(initial?.percent) ? initial.percent : null;
  const revisedPercent = Number.isFinite(revised?.percent) ? revised.percent : null;
  const deltaPercent = Number.isFinite(initialPercent) && Number.isFinite(revisedPercent)
    ? revisedPercent - initialPercent
    : null;

  return {
    key,
    initial,
    revised,
    initialPercent,
    revisedPercent,
    deltaPercent
  };
}

function groupRequirementChecks(entry) {
  const checks = Array.isArray(entry?.checks) ? entry.checks : [];
  return {
    pass: checks.filter((item) => item?.outcome === 'pass'),
    fail: checks.filter((item) => item?.outcome === 'fail'),
    mixed: checks.filter((item) => item?.outcome === 'mixed')
  };
}


function fillParticipants(select, orderedParticipants) {
  const options = ['<option value="all">All</option>']
    .concat(orderedParticipants.map((entry) => `<option value="${escapeHtml(entry.code)}">${escapeHtml(entry.label)}</option>`));
  select.innerHTML = options.join('');
}

function buildParticipantOrder(archive) {
  const folderByName = new Map((archive.folders ?? []).map((folder) => [String(folder.name || '').toLowerCase(), folder]));
  return PARTICIPANT_ORDER.map((entry) => {
    const folder = folderByName.get(entry.name.toLowerCase()) ?? null;
    return {
      code: entry.code,
      label: entry.label,
      folderId: folder?.id ?? null,
      name: entry.name
    };
  });
}

function renderSlotButton(label, file, fallbackFile, context) {
  const available = Boolean(file);
  if (!available) {
    return `
      <button class="slot-btn" type="button" disabled>
        <span class="slot-title">${escapeHtml(label)}</span>
        <span class="slot-note">Unavailable</span>
      </button>
    `;
  }

  return `
    <button
      class="slot-btn slot-open"
      type="button"
      data-file="${escapeHtml(file)}"
      data-fallback-file="${escapeHtml(fallbackFile || '')}"
      data-preview-file="${escapeHtml(context.previewFile || file)}"
      data-preview-fallback-file="${escapeHtml(context.previewFallbackFile || '')}"
      data-participant="${escapeHtml(context.participantLabel)}"
      data-condition="${escapeHtml(context.condition)}"
      data-project-id="${escapeHtml(context.projectId)}"
      data-project-name="${escapeHtml(context.projectName)}"
      data-slot-label="${escapeHtml(label)}"
      data-initial-file="${escapeHtml(context.initialFile || '')}"
      data-final-file="${escapeHtml(context.finalFile || '')}"
    >
      <span class="slot-title">${escapeHtml(label)}</span>
      <span class="slot-note">Open with plan comparison</span>
    </button>
  `;
}


function renderParticipantRow(entry, textProject, gridProject, conditionFilter) {
  const textVideos = textProject ? pickInitialAndFinal(textProject) : { initial: null, final: null, preview: null };
  const gridVideos = gridProject ? pickInitialAndFinal(gridProject) : { initial: null, final: null, preview: null };

  const playableCount = [textVideos.initial, textVideos.final, gridVideos.initial, gridVideos.final].filter(Boolean).length;

  const cards = [];
  if (conditionFilter !== 'grid') cards.push(renderConditionCard('Text', 'text-plan', entry.label, textProject, textVideos));
  if (conditionFilter !== 'text-plan') cards.push(renderConditionCard('Grid', 'grid', entry.label, gridProject, gridVideos));

  const bodyClass = cards.length === 1 ? 'participant-body one-column' : 'participant-body';

  return `
    <details class="participant-row" open>
      <summary class="participant-summary">
        <span class="participant-name">${escapeHtml(entry.label)}</span>
        <span class="participant-meta">${playableCount}/4 slot${playableCount === 1 ? '' : 's'} available</span>
      </summary>
      <div class="${bodyClass}">
        ${cards.join('')}
      </div>
    </details>
  `;
}


function renderTextLines(linesWithStatus, side) {
  return `
    <div class="line-list ${side}">
      ${linesWithStatus.map(({ line, status }) => {
        const content = line.length ? line : ' ';
        const statusClass = side === 'left' ? 'line-plain' : status === 'added'
          ? 'line-added'
          : status === 'removed'
            ? 'line-removed'
            : status === 'unchanged'
              ? 'line-unchanged'
              : 'line-empty';
        return `<div class="line ${statusClass}">${escapeHtml(content)}</div>`;
      }).join('')}
    </div>
  `;
}


function renderPlanFollowingScorePanel(scoreContext) {
  if (!scoreContext) {
    return '<div class="plan-strip"><strong>RQ2 Plan-Following:</strong> no score available for this participant/condition.</div>';
  }

  const initialText = scoreContext.initial?.rating
    ? `${scoreContext.initial.rating}${Number.isFinite(scoreContext.initialPercent) ? ` (${scoreContext.initialPercent}%)` : ''}`
    : '—';
  const revisedText = scoreContext.revised?.rating
    ? `${scoreContext.revised.rating}${Number.isFinite(scoreContext.revisedPercent) ? ` (${scoreContext.revisedPercent}%)` : ''}`
    : '—';

  const deltaClass = Number.isFinite(scoreContext.deltaPercent)
    ? scoreContext.deltaPercent > 0
      ? 'score-delta-positive'
      : scoreContext.deltaPercent < 0
        ? 'score-delta-negative'
        : 'score-delta-neutral'
    : 'score-delta-neutral';
  const deltaText = Number.isFinite(scoreContext.deltaPercent)
    ? `${formatSignedNumber(scoreContext.deltaPercent)} pp`
    : '—';

  return `
    <div class="plan-metrics plan-following-metrics">
      <div class="metric"><div class="metric-label">RQ2 Initial</div><div class="metric-value">${escapeHtml(initialText)}</div></div>
      <div class="metric"><div class="metric-label">RQ2 Revised</div><div class="metric-value">${escapeHtml(revisedText)}</div></div>
      <div class="metric"><div class="metric-label">RQ2 Delta</div><div class="metric-value ${deltaClass}">${escapeHtml(deltaText)}</div></div>
    </div>
  `;
}

function renderRequirementItems(items, type) {
  if (!items.length) {
    return '<p class="rq2-empty">None listed.</p>';
  }

  return `
    <ul class="rq2-list ${type}">
      ${items.map((item) => `<li>${escapeHtml(item.text)}</li>`).join('')}
    </ul>
  `;
}

function renderRequirementGroup(title, items, type) {
  return `
    <section class="rq2-group">
      <h6 class="rq2-group-title ${type}">${escapeHtml(title)} (${items.length})</h6>
      ${renderRequirementItems(items, type)}
    </section>
  `;
}

function renderRequirementPhase(title, entry) {
  const groups = groupRequirementChecks(entry);
  const ratingText = entry?.rating || '—';

  return `
    <section class="rq2-phase">
      <h5 class="rq2-phase-title">${escapeHtml(title)} · ${escapeHtml(ratingText)}</h5>
      ${renderRequirementGroup('Passed', groups.pass, 'pass')}
      ${renderRequirementGroup('Didn\'t Pass', groups.fail, 'fail')}
      ${renderRequirementGroup('Mixed / Partial', groups.mixed, 'mixed')}
    </section>
  `;
}

function renderPlanFollowingRequirementPanel(scoreContext) {
  if (!scoreContext) return '';

  return `
    <details class="rq2-details">
      <summary>Requirement text: passed vs didn\'t pass</summary>
      <div class="rq2-phase-grid">
        ${renderRequirementPhase('Initial', scoreContext.initial)}
        ${renderRequirementPhase('Revised', scoreContext.revised)}
      </div>
    </details>
  `;
}


// This gallery reads prepared snapshots. It does not rebuild plans or generate clips on open.
const dataCache = new Map();
let mediaByProject = {};
async function fetchSaved(url) {
  if (!dataCache.has(url)) {
    const request = fetch(url).then(response => { if (!response.ok) throw Error(`Could not load ${url} (${response.status})`); return response.json(); });
    dataCache.set(url, request);
    request.catch(() => dataCache.delete(url));
  }
  return dataCache.get(url);
}
function pickInitialAndFinal(project) {
  const media = mediaByProject[project.id] || {};
  return { initial: media.initial, final: media.revised, preview: media.revised || media.initial };
}
function renderConditionCard(title, condition, participantLabel, project, videos) {
  if (!project) return `<article class="condition-card"><div class="condition-head"><h4>${escapeHtml(title)}</h4></div><p>No project available.</p></article>`;
  const initialFile = videos.initial?.file || '', finalFile = videos.final?.file || '', preview = videos.preview;
  const context = { participantLabel, condition, projectId: project.id, projectName: project.name, initialFile, finalFile, previewFile: preview?.file || '' };
  return `<article class="condition-card"><div class="condition-head"><h4 class="condition-title">${escapeHtml(title)}</h4><span class="condition-project">${escapeHtml(project.name)}</span></div>
    <button class="preview-open slot-open" type="button" data-participant="${escapeHtml(participantLabel)}" data-condition="${condition}" data-project-id="${project.id}" data-project-name="${escapeHtml(project.name)}" data-slot-label="Revised" aria-label="Open ${escapeHtml(participantLabel)} ${title} videos and plans">
      ${preview ? `<img class="preview-still" src="/${escapeHtml(preview.poster)}" alt="${escapeHtml(participantLabel)} ${title} final video preview" loading="lazy" decoding="async"><span class="preview-play" aria-hidden="true">▶</span>` : '<span class="condition-unavailable-msg">Video unavailable · open saved plans</span>'}
    </button><div class="slot-grid">${renderSlotButton('Initial', initialFile, '', context)}${renderSlotButton('Revised', finalFile, '', context)}</div></article>`;
}
function renderReferenceScreenshots(images = [], phase) {
  return `<details class="reference-screenshots"><summary>${phase} reference screenshots (${images.length})</summary><p>Original screenshots supplied for this participant’s ${phase.toLowerCase()} Text plan. Open an image at full resolution to check the saved plan.</p><div class="reference-images">${images.map(image => `<figure><a href="/${escapeHtml(image.file)}" target="_blank" rel="noopener"><img data-reference-src="/${escapeHtml(image.preview)}" alt="${escapeHtml(image.name)}" loading="lazy" decoding="async"><figcaption>${escapeHtml(image.name)} · Open full size ↗</figcaption></a></figure>`).join('') || '<p>No reference screenshots were supplied for this plan.</p>'}</div></details>`;
}
function wireModal() {
  const modal = document.getElementById('modal'), closeButton = document.getElementById('modalClose');
  const initialVideo = document.getElementById('modalInitial'), revisedVideo = document.getElementById('modalFinal');
  const planPanel = document.getElementById('planPanel'), meta = document.getElementById('modalMeta');
  let requestId = 0, previousFocus = null;
  function clearVideo(video) { video.pause(); video.removeAttribute('src'); video.removeAttribute('poster'); video.load(); }
  function close() {
    ++requestId; modal.hidden = true; document.body.style.overflow = '';
    clearVideo(initialVideo); clearVideo(revisedVideo); planPanel.innerHTML = '';
    previousFocus?.focus();
  }
  function loadVideo(video, media) {
    clearVideo(video);
    const status = video.parentElement.querySelector('.video-status');
    status.textContent = media ? '' : 'Video unavailable. The saved plan is available alongside it.';
    video.hidden = !media;
    if (!media) return;
    video.poster = `/${media.poster}`;
    video.preload = 'metadata';
    video.src = `/${media.file}`;
    video.onerror = () => { status.textContent = 'This video could not be loaded. The saved plans are still available.'; };
    video.load();
  }
  for (const video of [initialVideo, revisedVideo]) video.addEventListener('play', () => {
    for (const other of [initialVideo, revisedVideo]) if (other !== video) other.pause();
    planPanel.querySelector('iframe')?.contentWindow?.postMessage({ type: 'pinboard:pause' }, location.origin);
  });
  window.addEventListener('message', event => {
    const frame = planPanel.querySelector('iframe');
    if (event.origin !== location.origin || event.source !== frame?.contentWindow) return;
    if (event.data?.type === 'pinboard:source-play') { initialVideo.pause(); revisedVideo.pause(); }
    if (event.data?.type === 'pinboard:close') close();
  });
  closeButton.addEventListener('click', close);
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  document.addEventListener('keydown', event => {
    if (modal.hidden) return;
    if (event.key === 'Escape') { close(); return; }
    if (event.key === 'Tab') {
      const items = [...modal.querySelectorAll('button:not([disabled]),video:not([hidden]),iframe,summary,a[href]')];
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  planPanel.addEventListener('click', event => {
    const button = event.target.closest('[data-text-changes]');
    if (button) { const on = button.getAttribute('aria-pressed') !== 'true'; button.setAttribute('aria-pressed', String(on)); planPanel.classList.toggle('changes-only', on); }
  });
  planPanel.addEventListener('toggle', event => {
    if (event.target.matches?.('.reference-screenshots') && event.target.open) for (const image of event.target.querySelectorAll('img[data-reference-src]')) {
      image.src = image.dataset.referenceSrc; image.removeAttribute('data-reference-src');
    }
  }, true);
  planPanel.addEventListener('change', event => {
    if (event.target.id !== 'text-show-diff') return;
    const show = event.target.checked;
    planPanel.classList.toggle('text-diff-off', !show);
    const heading = planPanel.querySelector('[data-revised-heading]');
    if (heading) heading.textContent = show ? 'Revised plan + diff' : 'Revised plan';
    const counts = planPanel.querySelector('.text-diff-counts'); if (counts) counts.hidden = !show;
    const changesButton = planPanel.querySelector('[data-text-changes]');
    if (changesButton) { changesButton.disabled = !show; changesButton.setAttribute('aria-pressed', 'false'); }
    planPanel.classList.remove('changes-only');
  });
  return { async open(payload) {
    const current = ++requestId;
    previousFocus = document.activeElement;
    modal.hidden = false; document.body.style.overflow = 'hidden'; closeButton.focus();
    modal.setAttribute('aria-label', `${payload.participant} ${payload.condition === 'grid' ? 'Grid' : 'Text'} video and plan review`);
    meta.textContent = `${payload.participant} · ${payload.condition === 'grid' ? 'Grid' : 'Text'} · ${payload.projectName}`;
    planPanel.classList.remove('changes-only');
    planPanel.classList.remove('text-diff-off');
    planPanel.innerHTML = '<p class="plan-notes" role="status">Opening saved plan…</p>';
    const media = mediaByProject[payload.projectId] || {};
    loadVideo(initialVideo, media.initial); loadVideo(revisedVideo, media.revised);
    try {
      const [plan, scores] = await Promise.all([fetchSaved(`/gallery-data/plans/${payload.projectId}.json`), fetchSaved('/plan-following-scores.json')]);
      if (current !== requestId) return;
      const score = buildPlanFollowingScoreContext(scores, payload);
      const header = renderPlanFollowingScorePanel(score);
      const requirements = renderPlanFollowingRequirementPanel(score);
      const details = `<details class="plan-provenance"><summary>Plan source and verification</summary><p>${escapeHtml(plan.note)}</p><a href="/gallery-data/plans/${payload.projectId}-snapshots.json" target="_blank" rel="noopener">Saved initial and revised snapshots</a></details>`;
      if (plan.kind === 'grid') {
        planPanel.innerHTML = `${header}<iframe class="interactive-grid" title="${escapeHtml(payload.participant)} interactive Grid plan" src="${escapeHtml(plan.viewer)}"></iframe>${requirements}${details}`;
      } else {
        const s = plan.summary;
        planPanel.innerHTML = `${header}<div class="text-diff-toolbar"><label><input id="text-show-diff" type="checkbox" checked> Show diff on Revised plan</label><span class="text-diff-counts">+${s.added} added lines · −${s.removed} removed lines</span><button class="slot-btn" data-text-changes type="button" aria-pressed="false">Changes only</button></div><div class="plan-full-columns"><section class="plan-block"><div class="plan-block-head initial">Initial plan · before revision</div>${renderTextLines(plan.lineSummary.initialDecorated, 'left')}${renderReferenceScreenshots(plan.references?.initial, 'Initial')}</section><section class="plan-block"><div class="plan-block-head revised" data-revised-heading>Revised plan + diff</div>${renderTextLines(plan.lineSummary.revisedDecorated, 'right')}${renderReferenceScreenshots(plan.references?.revised, 'Revised')}</section></div>${requirements}${details}`;
      }
    } catch (error) {
      if (current === requestId) planPanel.innerHTML = `<p role="alert">${escapeHtml(error.message)}. Close and reopen to retry.</p>`;
    }
  } };
}
function render(appState) {
  const { archive, controls, cardsNode, summaryNode, emptyNode, participantOrder } = appState;
  const search = controls.search.value.trim().toLowerCase(), filter = controls.condition.value;
  const rows = [];
  for (const entry of participantOrder) {
    if (controls.participant.value !== 'all' && controls.participant.value !== entry.code) continue;
    const projects = archive.projects.filter(p => p.folderId === entry.folderId);
    const text = projects.find(p => p.ablated), grid = projects.find(p => !p.ablated);
    if (search && !`${entry.label} ${projects.map(p => p.name).join(' ')}`.toLowerCase().includes(search)) continue;
    if (filter === 'grid' && !grid || filter === 'text-plan' && !text) continue;
    rows.push(renderParticipantRow(entry, text, grid, filter));
  }
  cardsNode.innerHTML = rows.join(''); emptyNode.hidden = rows.length > 0;
  summaryNode.textContent = `${rows.length} participants · Text and Grid · initial and revised videos`;
}
async function main() {
  const controls = { search: document.getElementById('search'), participant: document.getElementById('participant'), condition: document.getElementById('condition') };
  const cardsNode = document.getElementById('cards'), summaryNode = document.getElementById('summary'), emptyNode = document.getElementById('empty');
  const modal = wireModal();
  try {
    const [archive, media] = await Promise.all([fetchSaved('/gallery-data/archive.json'), fetchSaved('/gallery-data/media.json')]);
    mediaByProject = media;
    const participantOrder = buildParticipantOrder(archive);
    fillParticipants(controls.participant, participantOrder);
    const appState = { archive, controls, cardsNode, summaryNode, emptyNode, participantOrder };
    controls.search.addEventListener('input', () => render(appState));
    controls.participant.addEventListener('change', () => render(appState));
    controls.condition.addEventListener('change', () => render(appState));
    cardsNode.addEventListener('click', event => { const trigger = event.target.closest('.slot-open'); if (trigger) modal.open({ participant: trigger.dataset.participant, condition: trigger.dataset.condition, projectId: trigger.dataset.projectId, projectName: trigger.dataset.projectName }); });
    render(appState);
  } catch (error) { summaryNode.textContent = `${error.message}. Run node build-gallery.mjs to prepare the gallery.`; }
}
main();
