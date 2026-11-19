(function () {
  function pct(value) {
    return `${Number(value ?? 0).toFixed(1)}%`;
  }

  function pieStyle(userPct, aiPct) {
    const total = userPct + aiPct;
    const user = total > 0 ? (userPct / total) * 100 : 0;
    const ai = total > 0 ? (aiPct / total) * 100 : 0;
    return `conic-gradient(#2563eb 0 ${user}%, #16a34a ${user}% ${user + ai}%, #e5e7eb ${user + ai}% 100%)`;
  }

  function installStyles() {
    if (document.getElementById('inline-stats-style')) return;
    const style = document.createElement('style');
    style.id = 'inline-stats-style';
    style.textContent = `
      .inline-stats { border: 1px solid #e5e7eb; background: #fff; border-radius: 12px; padding: 14px; margin: 12px 20px; }
      .inline-stats h2 { font-size: 16px; font-weight: 700; color: #111827; }
      .inline-stats .sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
      .inline-stats .controls { margin-top: 10px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .inline-stats select { border: 1px solid #d1d5db; border-radius: 8px; padding: 6px 8px; font-size: 12px; background: #fff; }
      .inline-stats .grid { margin-top: 12px; display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 8px; }
      .inline-stats .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 9px; }
      .inline-stats .kpi .label { font-size: 11px; color: #4b5563; }
      .inline-stats .kpi .value { font-size: 20px; font-weight: 700; color: #111827; }
      .inline-stats .detail { margin-top: 12px; display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: center; }
      .inline-stats .pie { width: 110px; height: 110px; border-radius: 999px; border: 1px solid #e5e7eb; }
      .inline-stats .legend { font-size: 12px; color: #374151; display: grid; gap: 5px; }
      .inline-stats .dot { display: inline-block; width: 8px; height: 8px; border-radius: 999px; margin-right: 6px; }
      .inline-stats .dot.user { background: #2563eb; }
      .inline-stats .dot.ai { background: #16a34a; }
      .inline-stats .list { margin-top: 12px; max-height: 220px; overflow: auto; border: 1px solid #e5e7eb; border-radius: 8px; }
      .inline-stats table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .inline-stats th,.inline-stats td { border-bottom: 1px solid #e5e7eb; text-align: left; padding: 7px 8px; }
      .inline-stats th { position: sticky; top: 0; background: #f9fafb; color: #374151; }
      .inline-stats .error { color: #b91c1c; font-size: 13px; margin-top: 8px; }
      .inline-stats .diffbox { margin-top: 12px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
      .inline-stats .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; white-space: pre-wrap; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; max-height: 280px; overflow: auto; }
      .inline-stats .diff-grid { margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .inline-stats .diff-panel { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
      .inline-stats .diff-head { background: #f9fafb; border-bottom: 1px solid #e5e7eb; padding: 6px 8px; font-size: 12px; font-weight: 700; }
      .inline-stats .diff-body { max-height: 280px; overflow: auto; }
      .inline-stats .diff-line { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; padding: 2px 8px; border-bottom: 1px solid #f3f4f6; white-space: pre-wrap; }
      .inline-stats .diff-line.removed { background: #fee2e2; }
      .inline-stats .diff-line.added { background: #dcfce7; }
      .inline-stats .diff-line.edited { background: #fef9c3; }
      .inline-stats .line-meta { margin-left: 6px; font-family: system-ui, -apple-system, sans-serif; font-size: 10px; font-weight: 700; color: #374151; }
      .inline-stats .line-chip { display: inline-block; border: 1px solid #d1d5db; border-radius: 999px; padding: 0 6px; margin-left: 4px; background: #fff; }
      .inline-stats .line-chip.exclude { cursor: pointer; border-color: #fdba74; background: #fff7ed; }
      .inline-stats .line-chip.purpose { border-color: #93c5fd; background: #eff6ff; }
      .inline-stats .line-chip.target { border-color: #c4b5fd; background: #f5f3ff; }
      .inline-stats .diff-line.excluded { opacity: 0.45; }
      .inline-stats .user-events { margin-top: 8px; border: 1px solid #e5e7eb; border-radius: 6px; max-height: 180px; overflow: auto; }
      .inline-stats .user-event { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; padding: 6px 8px; border-bottom: 1px solid #f3f4f6; }
      .inline-stats .purpose-grid { margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .inline-stats .purpose-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; font-size: 12px; }
      .inline-stats .diff-metrics { margin-top: 8px; display: grid; grid-template-columns: 140px 1fr 1fr; gap: 12px; align-items: start; }
      .inline-stats .diff-pie { width: 120px; height: 120px; border-radius: 999px; border: 1px solid #e5e7eb; }
      .inline-stats .diff-legend { display: grid; gap: 4px; font-size: 12px; }
      .inline-stats .diff-dot { display: inline-block; width: 8px; height: 8px; border-radius: 999px; margin-right: 6px; }
      .inline-stats .board-grid { margin-top: 8px; display: grid; grid-template-columns: 1fr; gap: 10px; }
      .inline-stats .board-panel { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; background: #fff; }
      .inline-stats .board-head { background: #f9fafb; border-bottom: 1px solid #e5e7eb; padding: 6px 8px; font-size: 12px; font-weight: 700; }
      .inline-stats .board-body { max-height: 420px; overflow-x: auto; overflow-y: auto; padding: 8px; }
      .inline-stats .timeline-board { min-width: 980px; }
      .inline-stats .timeline-scale { position: sticky; top: 0; z-index: 1; background: #fff; border-bottom: 1px solid #e5e7eb; padding: 4px 0; }
      .inline-stats .timeline-ruler { height: 18px; position: relative; }
      .inline-stats .tick { position: absolute; top: 0; transform: translateX(-50%); font-size: 10px; color: #6b7280; }
      .inline-stats .beat-labels { display: flex; border-bottom: 1px solid #e5e7eb; }
      .inline-stats .beat-label { font-size: 11px; font-weight: 700; color: #374151; padding: 4px 6px; border-right: 1px dashed #e5e7eb; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .inline-stats .timeline-track { position: relative; border-bottom: 1px solid #eef2f7; min-height: 92px; background: #fcfcfd; }
      .inline-stats .timeline-track-name { position: absolute; left: 0; top: 0; font-size: 10px; color: #6b7280; padding: 2px 6px; text-transform: uppercase; letter-spacing: .03em; z-index: 1; background: rgba(255,255,255,.85); }
      .inline-stats .beat-boundary { position: absolute; top: 0; bottom: 0; border-left: 1px dashed #e5e7eb; }
      .inline-stats .card-block { position: absolute; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; padding: 14px 6px 6px; font-size: 10px; line-height: 1.25; overflow: hidden; color: #111827; }
      .inline-stats .card-block.excluded { opacity: .35; filter: grayscale(.3); }
      .inline-stats .card-block.changed { box-shadow: inset 0 0 0 1px #f59e0b; }
      .inline-stats .card-block.added { box-shadow: inset 0 0 0 1px #16a34a; }
      .inline-stats .card-block.removed { box-shadow: inset 0 0 0 1px #dc2626; }
      .inline-stats .card-block.edited { box-shadow: inset 0 0 0 1px #f59e0b; }
      .inline-stats .card-head { position: absolute; left: 4px; right: 4px; top: 2px; display: flex; justify-content: space-between; align-items: center; gap: 4px; }
      .inline-stats .card-actor { display: inline-block; font-size: 8px; font-weight: 700; border-radius: 999px; padding: 0 4px; border: 1px solid #93c5fd; background: #dbeafe; color: #1d4ed8; text-transform: uppercase; }
      .inline-stats .card-state-dot { width: 6px; height: 6px; border-radius: 999px; display: inline-block; }
      .inline-stats .card-state-dot.added { background: #16a34a; }
      .inline-stats .card-state-dot.removed { background: #dc2626; }
      .inline-stats .card-state-dot.edited { background: #f59e0b; }
      .inline-stats .card-exclude-btn { cursor: pointer; margin-left: 4px; font-size: 8px; border: 1px solid #fdba74; background: #fff7ed; border-radius: 999px; padding: 0 4px; opacity: 0; pointer-events: none; transition: opacity .12s ease; }
      .inline-stats .card-block.changed:hover .card-exclude-btn { opacity: 1; pointer-events: auto; }
    `;
    document.head.appendChild(style);
  }

  let statsData = null;
  let statsPromise = null;
  let diffData = null;
  let diffPromise = null;
  const liveDiffCache = new Map();
  const liveGridDiffCache = new Map();
  const exclusionKey = 'plan_diff_exclusions_v1';
  let rootNode = null;

  function loadExclusions() {
    try { return JSON.parse(localStorage.getItem(exclusionKey) || '{}'); }
    catch { return {}; }
  }

  function saveExclusions(value) {
    localStorage.setItem(exclusionKey, JSON.stringify(value));
  }

  function rowId(projectId, sideType, lineText) {
    return `${projectId}::${sideType}::${lineText}`;
  }

  function gridExcludeId(projectId, kind, cardId) {
    return `${projectId}::grid::${kind}::${cardId || ''}`;
  }

  function esc(value) {
    return String(value || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escAttr(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function counter(lines) {
    const map = new Map();
    for (const line of lines) map.set(line, (map.get(line) || 0) + 1);
    return map;
  }

  function subtractCounter(a, b) {
    const out = new Map();
    for (const [key, countA] of a.entries()) {
      const countB = b.get(key) || 0;
      if (countA > countB) out.set(key, countA - countB);
    }
    return out;
  }

  function lineArray(text) {
    if (typeof text !== 'string') return [];
    return text.split('\n').filter((line) => line.trim().length > 0);
  }

  function inferKind(action, beforeLines, afterLines) {
    if (action === 'text-plan.generate') return 'added';
    if (!beforeLines.length && afterLines.length) return 'added';
    if (beforeLines.length && !afterLines.length) return 'removed';
    return 'edited';
  }

  function buildLiveProjectDiff(projectId, projectName, interactions, finalText) {
    const textEvents = interactions.filter((event) => {
      const action = String(event?.action || '');
      const targetType = event?.target?.type;
      return action.startsWith('text-plan.') || targetType === 'text-plan';
    }).filter((event) => event.before !== event.after);

    let initialAI = '';
    const generates = textEvents.filter((event) => event.action === 'text-plan.generate' && (event.actor === 'assistant' || event.actor === 'ai'));
    if (generates.length) {
      const latestGenerate = [...generates].sort((a, b) => String(a?.timestamp || '').localeCompare(String(b?.timestamp || ''))).at(-1);
      initialAI = typeof latestGenerate?.after === 'string' ? latestGenerate.after : '';
    }
    if (!initialAI && textEvents.length) {
      const firstAfter = textEvents.find((event) => typeof event?.after === 'string' && event.after.length > 0);
      if (firstAfter) initialAI = firstAfter.after;
    }

    const actorCounts = {};
    const changeEvents = [];
    const userChangeEvents = [];
    const lineMeta = new Map();
    const seenLines = new Set();

    const changePreview = (beforeText, afterText) => {
      const beforeLines = lineArray(beforeText);
      const afterLines = lineArray(afterText);
      const beforeSet = new Set(beforeLines);
      const afterSet = new Set(afterLines);
      const removed = beforeLines.find((line) => !afterSet.has(line)) || '';
      const added = afterLines.find((line) => !beforeSet.has(line)) || '';
      return { removed, added };
    };

    const getMeta = (line) => {
      if (!lineMeta.has(line)) {
        lineMeta.set(line, {
          addedBy: null,
          lastChangedBy: null,
          removedBy: null,
          changeKinds: [],
          everAdded: false,
          purposes: [],
          editTargets: [],
        });
      }
      return lineMeta.get(line);
    };

    const pushUnique = (arr, value) => {
      if (!value) return;
      if (!arr.includes(value)) arr.push(value);
    };

    for (const event of textEvents) {
      const action = String(event.action || '');
      const actor = event.actor || 'unknown';
      const purpose = event.suggestedPurpose || '';
      const editTarget = event.editTarget || '';
      actorCounts[actor] = (actorCounts[actor] || 0) + 1;

      const beforeLines = lineArray(event.before);
      const afterLines = lineArray(event.after);
      const beforeCount = counter(beforeLines);
      const afterCount = counter(afterLines);
      const addedCounter = subtractCounter(afterCount, beforeCount);
      const removedCounter = subtractCounter(beforeCount, afterCount);
      const kind = inferKind(action, beforeLines, afterLines);
      const replacementLike = addedCounter.size > 0 && removedCounter.size > 0;

      for (const [line] of addedCounter.entries()) {
        if (!line.trim()) continue;
        const meta = getMeta(line);
        const isTrulyNew = !seenLines.has(line) && !meta.everAdded;
        const classifiedKind = isTrulyNew ? 'added' : 'edited';
        if (!meta.addedBy) {
          meta.addedBy = actor;
          meta.everAdded = true;
        }
        meta.lastChangedBy = actor;
        meta.changeKinds.push(classifiedKind);
        pushUnique(meta.purposes, purpose);
        pushUnique(meta.editTargets, editTarget);
        seenLines.add(line);
      }

      for (const [line] of removedCounter.entries()) {
        if (!line.trim()) continue;
        const meta = getMeta(line);
        meta.removedBy = actor;
        meta.lastChangedBy = actor;
        meta.changeKinds.push('removed');
        pushUnique(meta.purposes, purpose);
        pushUnique(meta.editTargets, editTarget);
      }

      // Intentionally no blanket attribution for all after-lines.
      // Only concrete line deltas (added/removed counters) get attribution updates.

      changeEvents.push({ timestamp: event.timestamp, actor, action, id: event.id });
      if (actor === 'user') {
        const beforeText = typeof event.before === 'string' ? event.before : '';
        const afterText = typeof event.after === 'string' ? event.after : '';
        const preview = changePreview(beforeText, afterText);
        userChangeEvents.push({
          timestamp: event.timestamp,
          action,
          suggestedPurpose: event.suggestedPurpose || '',
          editTarget: event.editTarget || '',
          id: event.id,
          charsBefore: beforeText.length,
          charsAfter: afterText.length,
          charsDelta: afterText.length - beforeText.length,
          previewRemoved: preview.removed,
          previewAdded: preview.added,
        });
      }
    }

    const leftLines = initialAI.split('\n');
    const rightLines = finalText.split('\n');
    const matcher = new DiffMatchPatch(leftLines, rightLines);
    const sideBySide = matcher.rows().map((row) => ({
      left: row.left,
      right: row.right,
      leftType: row.leftType,
      rightType: row.rightType,
      leftMeta: row.left ? (lineMeta.get(row.left) || null) : null,
      rightMeta: row.right ? (lineMeta.get(row.right) || null) : null,
    }));

    return {
      projectId,
      projectName,
      initialChars: initialAI.length,
      finalChars: finalText.length,
      changeEventCount: changeEvents.length,
      actorCounts,
      userChangeEvents,
      sideBySide,
    };
  }

  class DiffMatchPatch {
    constructor(left, right) {
      this.left = left;
      this.right = right;
    }
    canonical(line) {
      return String(line || '').trim().replace(/\s+/g, ' ');
    }
    lcsOps() {
      const left = this.left;
      const right = this.right;
      const n = left.length;
      const m = right.length;
      const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
      for (let i = n - 1; i >= 0; i -= 1) {
        for (let j = m - 1; j >= 0; j -= 1) {
          if (this.canonical(left[i]) === this.canonical(right[j])) dp[i][j] = dp[i + 1][j + 1] + 1;
          else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
      const ops = [];
      let i = 0;
      let j = 0;
      while (i < n && j < m) {
        if (this.canonical(left[i]) === this.canonical(right[j])) {
          ops.push({ type: 'equal', left: left[i], right: right[j] });
          i += 1;
          j += 1;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) {
          ops.push({ type: 'remove', left: left[i] });
          i += 1;
        } else {
          ops.push({ type: 'add', right: right[j] });
          j += 1;
        }
      }
      while (i < n) { ops.push({ type: 'remove', left: left[i] }); i += 1; }
      while (j < m) { ops.push({ type: 'add', right: right[j] }); j += 1; }
      return ops;
    }
    rows() {
      const ops = this.lcsOps();
      const rows = [];
      let idx = 0;
      while (idx < ops.length) {
        const op = ops[idx];
        if (op.type === 'equal') {
          rows.push({ left: op.left || '', right: op.right || '', leftType: 'unchanged', rightType: 'unchanged' });
          idx += 1;
          continue;
        }
        const removed = [];
        const added = [];
        while (idx < ops.length && ops[idx].type !== 'equal') {
          if (ops[idx].type === 'remove') removed.push(ops[idx].left || '');
          if (ops[idx].type === 'add') added.push(ops[idx].right || '');
          idx += 1;
        }
        const blockSize = Math.max(removed.length, added.length);
        for (let k = 0; k < blockSize; k += 1) {
          const left = removed[k] || '';
          const right = added[k] || '';
          rows.push({
            left,
            right,
            leftType: left ? 'removed' : 'empty',
            rightType: right ? 'added' : 'empty',
          });
        }
      }
      return rows;
    }
  }

  function totalCounts(projects) {
    return projects.reduce((acc, project) => {
      acc.total += project.totals.total || 0;
      acc.userCreated += project.totals.userCreated || 0;
      acc.aiCreated += project.totals.aiCreated || 0;
      acc.userModified += project.totals.userModified || 0;
      acc.aiModified += project.totals.aiModified || 0;
      acc.userAdjusted += project.totals.userAdjusted || 0;
      acc.userCorrected += project.totals.userCorrected || 0;
      acc.aiAdjusted += project.totals.aiAdjusted || 0;
      acc.aiCorrected += project.totals.aiCorrected || 0;
      acc.deleted += project.totals.deleted || 0;
      return acc;
    }, { total: 0, userCreated: 0, aiCreated: 0, userModified: 0, aiModified: 0, userAdjusted: 0, userCorrected: 0, aiAdjusted: 0, aiCorrected: 0, deleted: 0 });
  }

  function comparisonCard(title, bucket) {
    const averages = bucket?.averages ?? {};
    const pie = pieStyle(averages.userCreated ?? 0, averages.aiCreated ?? 0);
    return `
      <div class="kpi">
        <div class="label" style="font-weight:700">${title} (${bucket?.projectCount ?? 0} projects)</div>
        <div style="display:flex; align-items:center; gap:10px; margin-top:8px;">
          <div class="pie" style="width:74px; height:74px; background:${pie}"></div>
          <div class="sub" style="margin-top:0">% user-created: <strong>${pct(averages.userCreated)}</strong><br/>% AI-created: <strong>${pct(averages.aiCreated)}</strong></div>
        </div>
        <div class="sub" style="margin-top:2px">% user adjusted: <strong>${pct(averages.userAdjustedAmongUserCreated)}</strong> · % user corrected: <strong>${pct(averages.userCorrectedAmongUserCreated)}</strong></div>
        <div class="sub" style="margin-top:2px">% AI adjusted: <strong>${pct(averages.aiAdjustedAmongAiCreated)}</strong> · % AI corrected: <strong>${pct(averages.aiCorrectedAmongAiCreated)}</strong></div>
        <div class="sub" style="margin-top:2px">% deleted: <strong>${pct(averages.deleted)}</strong></div>
      </div>
    `;
  }

  function projectDiffOptions(projects) {
    return projects
      .map((project) => `<option value="${project.projectId}">${project.projectName}</option>`)
      .join('');
  }

  function currentProjectIdFromPath() {
    const first = window.location.pathname.split('/').filter(Boolean)[0];
    return first || '';
  }

  function renderDiffSection(selectedProjectId) {
    const projects = diffData?.projects || [];
    if (!projects.length) {
      return `<div class="diffbox"><div class="sub">No plan diff data available.</div></div>`;
    }
    const fallbackId = projects[0].projectId;
    const activeId = projects.find((p) => p.projectId === selectedProjectId)?.projectId || fallbackId;
    const active = liveDiffCache.get(activeId) || projects.find((p) => p.projectId === activeId) || projects[0];
    const staticProject = projects.find((p) => p.projectId === activeId) || active;
    const gridSnapshot = liveGridDiffCache.get(activeId);
    const hasBoardData = Boolean(
      (gridSnapshot?.finalGrid?.beats && gridSnapshot.finalGrid.beats.length > 0) ||
      (gridSnapshot?.initialGrid?.beats && gridSnapshot.initialGrid.beats.length > 0)
    );
    const projectMode = String(staticProject?.mode || '').toLowerCase();
    const showBoardDiff = projectMode === 'grid' || (projectMode === '' && hasBoardData);
    const actorBits = Object.entries(active.actorCounts || {})
      .map(([actor, count]) => `${actor}: ${count}`)
      .join(' · ') || 'none';
    const exclusions = loadExclusions();
    const actorTag = (actor) => actor === 'assistant' || actor === 'ai' ? 'AI' : actor === 'user' ? 'USER' : (actor || 'UNKNOWN').toUpperCase();
    const metaChips = (meta, displayKind, lineText) => {
      if (!meta) return '';
      const chips = [];
      if (displayKind === 'removed') {
        if (meta.removedBy) chips.push(`REMOVED BY ${actorTag(meta.removedBy)}`);
      } else if (displayKind === 'edited') {
        if (meta.lastChangedBy) chips.push(`EDITED BY ${actorTag(meta.lastChangedBy)}`);
      } else if (displayKind === 'added') {
        if (meta.addedBy) chips.push(`ADDED BY ${actorTag(meta.addedBy)}`);
        else if (meta.lastChangedBy) chips.push(`EDITED BY ${actorTag(meta.lastChangedBy)}`);
      } else {
        if (meta.lastChangedBy) chips.push(`EDITED BY ${actorTag(meta.lastChangedBy)}`);
      }
      const id = rowId(active.projectId, displayKind, lineText || '');
      const encodedId = encodeURIComponent(id);
      const isExcluded = exclusions[id] === true;
      const toggle = `<span class=\"line-chip exclude\" data-exclude-id=\"${encodedId}\">${isExcluded ? 'INCLUDE' : 'EXCLUDE'}</span>`;
      return chips.length ? `<span class="line-meta">${chips.map((chip) => `<span class=\"line-chip\">${chip}</span>`).join('')}${toggle}</span>` : '';
    };
    const rowKind = (row) => {
      const hasLeft = Boolean(row.left);
      const hasRight = Boolean(row.right);
      if (row.leftType === 'removed' && row.rightType === 'empty' && hasLeft && !hasRight) return 'removed';
      if (row.rightType === 'added' && row.leftType === 'empty' && !hasLeft && hasRight) return 'added';
      if (row.leftType === 'removed' && row.rightType === 'added' && hasLeft && hasRight) return 'edited';
      return 'unchanged';
    };
    const sideRows = active.sideBySide || [];
    const clipUnits = (line) => {
      const matches = (line || '').match(/\[\[clip:[^\]]+\]\]/g);
      return 1 + (matches ? matches.length : 0);
    };
    const leftLines = sideRows.map((row) => {
      const kind = rowKind(row);
      const id = rowId(active.projectId, kind, row.left || '');
      const excluded = exclusions[id] === true ? 'excluded' : '';
      const className = kind === 'removed' ? 'removed' : kind === 'edited' ? 'edited' : '';
      const showBadge = kind === 'removed' || kind === 'edited';
      return `<div class="diff-line ${className} ${excluded}">${esc(row.left || '')}${showBadge ? metaChips(row.leftMeta, kind, row.left || '') : ''}</div>`;
    }).join('');
    const rightLines = sideRows.map((row) => {
      const kind = rowKind(row);
      const id = rowId(active.projectId, kind, row.right || '');
      const excluded = exclusions[id] === true ? 'excluded' : '';
      const className = kind === 'added' ? 'added' : kind === 'edited' ? 'edited' : '';
      const showBadge = kind === 'added' || kind === 'edited';
      return `<div class="diff-line ${className} ${excluded}">${esc(row.right || '')}${showBadge ? metaChips(row.rightMeta, kind, row.right || '') : ''}</div>`;
    }).join('');

    const counts = {
      aiAdded: 0,
      userAdded: 0,
      aiEdited: 0,
      userEdited: 0,
      aiRemoved: 0,
      userRemoved: 0,
    };
    for (const row of sideRows) {
      const kind = rowKind(row);
      if (kind === 'added' && row.right) {
        const id = rowId(active.projectId, kind, row.right);
        if (exclusions[id]) continue;
        const units = clipUnits(row.right);
        const actor = row.rightMeta?.addedBy || row.rightMeta?.lastChangedBy;
        if (actor === 'user') counts.userAdded += units;
        else counts.aiAdded += units;
      }
      if (kind === 'edited' && row.right) {
        const id = rowId(active.projectId, kind, row.right);
        if (exclusions[id]) continue;
        const units = clipUnits(row.right);
        const actor = row.rightMeta?.lastChangedBy || row.leftMeta?.lastChangedBy;
        if (actor === 'user') counts.userEdited += units;
        else counts.aiEdited += units;
      }
      if (kind === 'removed' && row.left) {
        const id = rowId(active.projectId, kind, row.left);
        if (exclusions[id]) continue;
        const units = clipUnits(row.left);
        const actor = row.leftMeta?.removedBy || row.leftMeta?.lastChangedBy;
        if (actor === 'user') counts.userRemoved += units;
        else counts.aiRemoved += units;
      }
    }
    const totalCounted = counts.aiAdded + counts.userAdded + counts.aiEdited + counts.userEdited + counts.aiRemoved + counts.userRemoved;
    const slices = [
      ['User Added', counts.userAdded, '#2563eb'],
      ['AI Added', counts.aiAdded, '#16a34a'],
      ['User Edited', counts.userEdited, '#7c3aed'],
      ['AI Edited', counts.aiEdited, '#a855f7'],
      ['User Removed', counts.userRemoved, '#dc2626'],
      ['AI Removed', counts.aiRemoved, '#f97316'],
    ];
    let running = 0;
    const pieStops = slices.map(([, value, color]) => {
      const pctShare = totalCounted > 0 ? (value / totalCounted) * 100 : 0;
      const start = running;
      running += pctShare;
      return `${color} ${start}% ${running}%`;
    }).join(', ');
    const pieBg = totalCounted > 0 ? `conic-gradient(${pieStops})` : '#e5e7eb';
    const legend = slices.map(([label, value, color]) => {
      const share = totalCounted > 0 ? ((value / totalCounted) * 100).toFixed(1) : '0.0';
      return `<div><span class="diff-dot" style="background:${color}"></span>${label}: <strong>${Number(value).toFixed(1)}</strong> (${share}%)</div>`;
    }).join('');
    const purposeCounts = {};
    const targetCounts = {};
    for (const event of (active.userChangeEvents || [])) {
      const purpose = event.suggestedPurpose || 'unspecified';
      const target = event.editTarget || 'unspecified';
      purposeCounts[purpose] = (purposeCounts[purpose] || 0) + 1;
      targetCounts[target] = (targetCounts[target] || 0) + 1;
    }
    const purposeSummary = Object.entries(purposeCounts).sort((a, b) => b[1] - a[1]).map(([key, count]) => `${key}: ${count}`).join(' · ') || 'none';
    const targetSummary = Object.entries(targetCounts).sort((a, b) => b[1] - a[1]).map(([key, count]) => `${key}: ${count}`).join(' · ') || 'none';

    const userEvents = (active.userChangeEvents || [])
      .map((event) => `<div class="user-event">${event.timestamp} | ${event.action} | purpose=${event.suggestedPurpose || 'n/a'} | target=${event.editTarget || 'n/a'} | Δchars ${event.charsDelta >= 0 ? '+' : ''}${event.charsDelta}${event.previewRemoved || event.previewAdded ? `<br/>- ${esc(event.previewRemoved)}<br/>+ ${esc(event.previewAdded)}` : ''}</div>`)
      .join('') || '<div class="user-event">(no user text-plan edits)</div>';
    if (showBoardDiff) {
      return `
      <div class="diffbox">
        <div class="label" style="font-weight:700">Plan Diff Viewer (mode: Board)</div>
        <div class="controls" style="margin-top:6px;">
          <label for="inline-diff-select" class="sub" style="margin:0">Project:</label>
          <select id="inline-diff-select">${projectDiffOptions(projects)}</select>
          <button id="inline-diff-refresh" type="button">Refresh from interaction log</button>
          <button id="inline-diff-refresh-all" type="button">Refresh all projects</button>
        </div>
        ${renderGridDiffSection(active.projectId)}
      </div>
    `;
    }

    return `
      <div class="diffbox">
        <div class="label" style="font-weight:700">Plan Diff Viewer (mode: Text)</div>
        <div class="controls" style="margin-top:6px;">
          <label for="inline-diff-select" class="sub" style="margin:0">Project:</label>
          <select id="inline-diff-select">${projectDiffOptions(projects)}</select>
          <button id="inline-diff-refresh" type="button">Refresh from interaction log</button>
          <button id="inline-diff-refresh-all" type="button">Refresh all projects</button>
        </div>
        <div class="sub">Changes by actor: ${actorBits}</div>
        <div class="sub">Text-plan change events: ${active.changeEventCount} · Initial chars: ${active.initialChars} · Final chars: ${active.finalChars}</div>
        <div class="sub" style="margin-top:6px; font-weight:700;">SOT diff counts (after exclusions): User added ${counts.userAdded}, AI added ${counts.aiAdded}, User edited ${counts.userEdited}, AI edited ${counts.aiEdited}, User removed ${counts.userRemoved}, AI removed ${counts.aiRemoved}, Total ${totalCounted}</div>
        <div class="sub">Counting rule: each changed line counts as 1 text unit; each <code>[[clip:...]]</code> tag on that line adds +1 clip unit.</div>
        <div class="diff-metrics">
          <div class="diff-pie" style="background:${pieBg}"></div>
          <div class="diff-legend">${legend}</div>
          <div class="purpose-box"><strong>What they were fixing</strong><br/>${purposeSummary}<br/><br/><strong>What changed</strong><br/>${targetSummary}</div>
        </div>
        <div class="diff-grid">
          <div class="diff-panel">
            <div class="diff-head">Initial AI plan (left)</div>
            <div class="diff-body">${leftLines}</div>
          </div>
          <div class="diff-panel">
            <div class="diff-head">Final plan after interactions (right)</div>
            <div class="diff-body">${rightLines}</div>
          </div>
        </div>
        <div class="sub" style="margin-top:8px; font-weight:600">User interactions that changed the plan</div>
        <div class="user-events">${userEvents}</div>
      </div>
    `;
  }

  function cardLabel(card) {
    if (!card || typeof card !== 'object') return 'Unknown';
    if (card.kind === 'text') {
      const t = typeof card.text === 'string' ? card.text.trim() : '';
      return `Text: ${t.slice(0, 42)}${t.length > 42 ? '…' : ''}`;
    }
    if (card.kind === 'asset') return `Asset: ${card.momentId || 'unknown'}`;
    if (card.kind === 'group') return `Group: ${(card.summary || '').slice(0, 32) || 'group'}`;
    return String(card.kind || 'card');
  }

  function cardSignature(card) {
    if (!card || typeof card !== 'object') return 'card:unknown';
    if (card.kind === 'text') return `text:${(card.text || '').trim()}`;
    if (card.kind === 'asset') return `asset:${card.momentId || ''}:${card.time?.positionSeconds || ''}:${card.time?.durationSeconds || ''}`;
    if (card.kind === 'group') return `group:${card.summary || ''}`;
    return `${card.kind || 'card'}:${card.id || ''}`;
  }

  function cardIdentity(card) {
    if (!card || typeof card !== 'object') return '';
    return card.id || '';
  }

  function collectGridSignatures(grid) {
    const out = new Set();
    const beats = Array.isArray(grid?.beats) ? grid.beats : [];
    for (const beat of beats) {
      for (const track of (Array.isArray(beat?.tracks) ? beat.tracks : [])) {
        for (const card of (Array.isArray(track?.cards) ? track.cards : [])) out.add(cardSignature(card));
      }
    }
    return out;
  }

  function flattenCards(grid) {
    const cards = [];
    const beats = Array.isArray(grid?.beats) ? grid.beats : [];
    for (const beat of beats) {
      const tracks = Array.isArray(beat?.tracks) ? beat.tracks : [];
      for (const track of tracks) {
        const row = track?.row || 'row';
        const trackCards = Array.isArray(track?.cards) ? track.cards : [];
        for (const card of trackCards) cards.push({ beat, row, card });
      }
    }
    return cards;
  }

  function cardsById(grid) {
    const out = new Map();
    for (const entry of flattenCards(grid)) {
      const id = cardIdentity(entry.card);
      if (!id) continue;
      out.set(id, entry.card);
    }
    return out;
  }

  function defaultTracksMap() {
    return new Map([
      ['a_roll', { row: 'a_roll', cards: [] }],
      ['b_roll', { row: 'b_roll', cards: [] }],
      ['music', { row: 'music', cards: [] }],
      ['text_graphics', { row: 'text_graphics', cards: [] }],
    ]);
  }

  function inferInitialGridFromReconstructionEvents(interactions) {
    const byBeat = new Map();
    let seq = 0;
    for (const event of (interactions || [])) {
      const action = String(event?.action || '');
      const reconstruction = event?.meta?.reconstruction;
      const location = event?.meta?.location || {};
      const after = event?.after;
      const looksLikeReconstructedAdd = reconstruction && action.includes('suggest-structure.card.add') && after && typeof after === 'object';
      if (!looksLikeReconstructedAdd) continue;

      const beatId = location.beatId || location.beatName || `reconstructed-beat-${seq}`;
      const beatName = location.beatName || location.beatId || `Reconstructed beat ${seq + 1}`;
      const row = location.row || 'b_roll';

      if (!byBeat.has(beatId)) {
        byBeat.set(beatId, {
          id: beatId,
          name: beatName,
          order: byBeat.size,
          targetDurationSeconds: 10,
          tracks: defaultTracksMap(),
          firstSeen: seq,
        });
      }
      const beat = byBeat.get(beatId);
      if (!beat.tracks.has(row)) beat.tracks.set(row, { row, cards: [] });
      const cloned = JSON.parse(JSON.stringify(after));
      beat.tracks.get(row).cards.push(cloned);
      seq += 1;
    }

    const beats = Array.from(byBeat.values()).sort((a, b) => a.firstSeen - b.firstSeen).map((beat, index) => {
      let maxEnd = 0;
      const tracks = Array.from(beat.tracks.values()).map((track) => {
        const cards = (track.cards || []).slice().sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));
        for (const card of cards) {
          const start = Number(card?.time?.positionSeconds || 0);
          const duration = Number(card?.time?.durationSeconds || 0);
          if (Number.isFinite(start) && Number.isFinite(duration)) maxEnd = Math.max(maxEnd, start + Math.max(0, duration));
        }
        return { row: track.row, cards };
      });
      return {
        id: beat.id,
        name: beat.name,
        order: index,
        targetDurationSeconds: maxEnd > 0 ? maxEnd : beat.targetDurationSeconds,
        tracks,
      };
    });
    return { beats };
  }

  function gridDeltaScore(initialGrid, finalGrid) {
    const initialCards = cardsById(initialGrid || { beats: [] });
    const finalCards = cardsById(finalGrid || { beats: [] });
    let added = 0;
    let removed = 0;
    let edited = 0;
    for (const [id, card] of finalCards.entries()) {
      if (!initialCards.has(id)) added += 1;
      else if (cardSignature(card) !== cardSignature(initialCards.get(id))) edited += 1;
    }
    for (const id of initialCards.keys()) if (!finalCards.has(id)) removed += 1;
    return { added, edited, removed, total: added + edited + removed };
  }

  function chooseBestInitialGrid(interactions, finalGrid) {
    const candidates = [];
    (interactions || []).forEach((event, index) => {
      const after = event?.after;
      if (!after || typeof after !== 'object' || !Array.isArray(after.beats)) return;
      if ((event?.target?.type || '') !== 'grid') return;
      candidates.push({
        source: `grid-snapshot-${index}`,
        index,
        action: String(event?.action || ''),
        grid: after,
      });
    });

    const inferred = inferInitialGridFromReconstructionEvents(interactions);
    if (Array.isArray(inferred?.beats) && inferred.beats.length > 0) {
      candidates.push({ source: 'reconstruction-inferred', index: Number.MAX_SAFE_INTEGER, action: 'reconstruction', grid: inferred });
    }

    if (!candidates.length) return { grid: { beats: [] }, source: 'empty' };
    let best = null;
    for (const candidate of candidates) {
      const score = gridDeltaScore(candidate.grid, finalGrid);
      const tieBreaker = candidate.action.includes('suggest-structure.apply') ? 0 : 1;
      const row = { ...candidate, score, tieBreaker };
      if (!best
        || row.score.total < best.score.total
        || (row.score.total === best.score.total && row.tieBreaker < best.tieBreaker)
        || (row.score.total === best.score.total && row.tieBreaker === best.tieBreaker && row.index < best.index)) {
        best = row;
      }
    }
    return { grid: best.grid, source: `${best.source} (${best.action || 'n/a'})`, score: best.score };
  }

  function classifyCardEventKind(event) {
    const action = String(event?.action || '').toLowerCase();
    const purpose = String(event?.suggestedPurpose || '').toLowerCase();
    if (/(remove|delete)/.test(action) || purpose === 'remove') return 'removed';
    if (/(add|create|insert)/.test(action) || purpose === 'add') return 'added';
    if (/(adjust|correct|edit|update|move|trim|resize|reorder|replace)/.test(action) || purpose === 'adjust' || purpose === 'correct') return 'edited';
    return '';
  }

  function detectEventCardActors(interactions, changedIds) {
    const addedById = new Map();
    const editedById = new Map();
    const removedById = new Map();
    const traceById = new Map();
    const changedSet = changedIds ? new Set(changedIds) : null;
    const sortedEvents = [...(interactions || [])].sort((a, b) => String(a?.timestamp || '').localeCompare(String(b?.timestamp || '')));
    const includeId = (id) => (!changedSet || changedSet.has(id));
    const pushTrace = (id, event, kind) => {
      if (!id || !includeId(id)) return;
      if (!traceById.has(id)) traceById.set(id, []);
      traceById.get(id).push({
        timestamp: event?.timestamp || '',
        actor: event?.actor || 'unknown',
        action: String(event?.action || ''),
        kind,
      });
    };

    for (const event of sortedEvents) {
      const actor = event?.actor || 'unknown';
      const targetType = event?.target?.type;
      const targetId = event?.target?.id || '';
      const eventKind = classifyCardEventKind(event);
      if (targetType === 'card' && targetId && includeId(targetId)) {
        if (eventKind === 'removed') {
          removedById.set(targetId, actor);
          pushTrace(targetId, event, 'removed');
        } else if (eventKind === 'added') {
          addedById.set(targetId, actor);
          pushTrace(targetId, event, 'added');
        } else if (eventKind === 'edited') {
          editedById.set(targetId, actor);
          pushTrace(targetId, event, 'edited');
        }
      }
      const before = cardsById(event?.before);
      const after = cardsById(event?.after);
      if (!before.size && !after.size) continue;
      for (const [id, cardAfter] of after.entries()) {
        if (!includeId(id)) continue;
        if (!before.has(id)) {
          addedById.set(id, actor);
          pushTrace(id, event, 'added');
          continue;
        }
        const cardBefore = before.get(id);
        if (cardSignature(cardBefore) !== cardSignature(cardAfter)) {
          editedById.set(id, actor);
          pushTrace(id, event, 'edited');
        }
      }
      for (const id of before.keys()) {
        if (!includeId(id)) continue;
        if (!after.has(id)) {
          removedById.set(id, actor);
          pushTrace(id, event, 'removed');
        }
      }
    }
    return { addedById, editedById, removedById, traceById };
  }

  function normalizeActor(actor) {
    const value = String(actor || '').toLowerCase();
    if (value === 'user') return 'user';
    if (value === 'assistant' || value === 'ai') return 'ai';
    return 'ai';
  }

  function timelinePlan(grid) {
    const beats = Array.isArray(grid?.beats) ? grid.beats : [];
    const normalized = beats.map((beat, idx) => {
      const duration = Number(beat?.targetDurationSeconds || 0);
      const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 10;
      return { beat, idx, duration: safeDuration };
    });
    let cursor = 0;
    const spans = normalized.map((item) => {
      const start = cursor;
      cursor += item.duration;
      return { ...item, start, end: cursor };
    });
    return { totalSeconds: cursor || 1, spans };
  }

  function cardTimeRange(card, beatSpan) {
    const position = Number(card?.time?.positionSeconds || 0);
    const duration = Number(card?.time?.durationSeconds || 0);
    const hasPos = Number.isFinite(position);
    const hasDur = Number.isFinite(duration) && duration > 0;
    const start = beatSpan.start + (hasPos ? Math.max(0, position) : 0);
    const fallbackDur = Math.max(1.5, beatSpan.duration * 0.35);
    const dur = hasDur ? duration : fallbackDur;
    const end = Math.min(beatSpan.end, start + Math.max(0.9, dur));
    return { start, end: Math.max(start + 0.9, end) };
  }

  function statusForCard(card, diffInfo, side) {
    const id = cardIdentity(card);
    const sig = cardSignature(card);
    if (side === 'left') {
      if (id && diffInfo.cardStatusById?.get(id) === 'removed') return 'removed';
      if (id && diffInfo.cardStatusById?.get(id) === 'edited') return 'edited';
      if (!id && diffInfo.removedSigs.has(sig)) return 'removed';
    } else {
      if (id && diffInfo.cardStatusById?.get(id) === 'added') return 'added';
      if (id && diffInfo.cardStatusById?.get(id) === 'edited') return 'edited';
      if (!id && diffInfo.addedSigs.has(sig)) return 'added';
    }
    return '';
  }

  function actorForCard(card, status, diffInfo) {
    const id = cardIdentity(card);
    if (!id || !status) return '';
    const weight = diffInfo.cardAttributionById?.get(id);
    if (!weight) return '';
    if (status === 'edited' && weight.user > 0 && weight.ai > 0) return 'mixed';
    if (weight.user > 0) return 'user';
    return 'ai';
  }

  function renderBoard(grid, diffInfo, side, projectId, exclusions) {
    const beats = Array.isArray(grid?.beats) ? grid.beats : [];
    if (!beats.length) return '<div class="sub">No beats/cards.</div>';
    const laneOrder = ['a_roll', 'b_roll', 'music', 'text_graphics'];
    const plan = timelinePlan(grid);
    const pxPerSecond = 34;
    const timelineWidth = Math.max(1400, Math.round(plan.totalSeconds * pxPerSecond));
    const minLaneHeight = 92;
    const laneHeaderPad = 24;
    const cardRowHeight = 27;

    const laneMap = new Map();
    for (const lane of laneOrder) laneMap.set(lane, []);
    for (const span of plan.spans) {
      for (const track of (Array.isArray(span.beat?.tracks) ? span.beat.tracks : [])) {
        const row = track?.row || 'row';
        if (!laneMap.has(row)) laneMap.set(row, []);
        for (const card of (Array.isArray(track?.cards) ? track.cards : [])) {
          laneMap.get(row).push({ beatSpan: span, card });
        }
      }
    }
    const lanes = Array.from(laneMap.keys());

    const beatLines = plan.spans.map((span) => {
      const x = Math.round(span.start * pxPerSecond);
      return `<div class="beat-boundary" style="left:${x}px"></div>`;
    }).join('') + `<div class="beat-boundary" style="left:${Math.round(plan.totalSeconds * pxPerSecond)}px"></div>`;

    const beatLabels = plan.spans.map((span) => {
      const width = Math.max(80, Math.round(span.duration * pxPerSecond));
      return `<div class="beat-label" style="width:${width}px">${esc(span.beat?.name || span.beat?.id || `Beat ${span.idx + 1}`)}</div>`;
    }).join('');

    const ticks = [];
    for (let sec = 0; sec <= Math.ceil(plan.totalSeconds); sec += 2) {
      ticks.push(`<span class="tick" style="left:${Math.round(sec * pxPerSecond)}px">${sec}s</span>`);
    }

    const laneLayouts = lanes.map((lane) => {
      const cards = laneMap.get(lane) || [];
      const prepared = cards.map(({ beatSpan, card }) => {
        const status = statusForCard(card, diffInfo, side);
        const actor = actorForCard(card, status, diffInfo);
        const actorLabel = String(actor || '').toLowerCase() === 'mixed' ? 'MIXED' : (String(actor || card?.originatedBy || '').toLowerCase() === 'user' ? 'USER' : 'AI');
        const range = cardTimeRange(card, beatSpan);
        const cardId = cardIdentity(card) || cardSignature(card);
        const excludeId = status ? gridExcludeId(projectId, status, cardId) : '';
        const excluded = status ? Boolean(exclusions[excludeId]) : false;
        const excludeBtn = status ? `<span class="card-exclude-btn" data-exclude-id="${encodeURIComponent(excludeId)}">${excluded ? 'IN' : 'OUT'}</span>` : '';
        const stateDot = status ? `<span class="card-state-dot ${status}" title="${status}"></span>` : '';
        const cardHead = status ? `<div class="card-head"><span class="card-actor">${actorLabel}</span><span>${stateDot}${excludeBtn}</span></div>` : '';
        const trace = Array.isArray(diffInfo.traceById?.get(cardId)) ? diffInfo.traceById.get(cardId) : [];
        const traceTitle = status && trace.length
          ? escAttr(trace.map((entry) => `${entry.timestamp || ''} ${String(entry.actor || '').toUpperCase()} ${entry.kind} ${entry.action || ''}`.trim()).join(' | '))
          : '';
        const left = Math.round(range.start * pxPerSecond);
        const width = Math.max(100, Math.round((range.end - range.start) * pxPerSecond));
        const right = left + width;
        return {
          start: range.start,
          end: range.end,
          left,
          right,
          width,
          html: `<div class="card-block ${status ? `changed ${status}` : ''} ${excluded ? 'excluded' : ''}" ${traceTitle ? `title="${traceTitle}"` : ''} style="left:${left}px;width:${width}px;">${cardHead}${esc(cardLabel(card))}</div>`
        };
      }).sort((a, b) => a.left - b.left || a.right - b.right);

      const slotEndsPx = [];
      const laneGapPx = 6;
      const slotted = prepared.map((item) => {
        let slot = 0;
        while (slot < slotEndsPx.length && item.left < slotEndsPx[slot] + laneGapPx) slot += 1;
        if (slot === slotEndsPx.length) slotEndsPx.push(item.right);
        else slotEndsPx[slot] = item.right;
        return { ...item, slot };
      });
      const laneHeight = Math.max(minLaneHeight, laneHeaderPad + (Math.max(0, slotEndsPx.length - 1) * cardRowHeight) + 34);
      return { lane, laneHeight, slotted };
    });

    let cursorY = 0;
    const tracksHtml = laneLayouts.map((layout) => {
      const y = cursorY;
      cursorY += layout.laneHeight;
      const cardsHtml = layout.slotted.map((item) => {
        const top = laneHeaderPad + (item.slot * cardRowHeight);
        return item.html.replace('style="', `style="top:${top}px;`);
      }).join('');
      return `<div class="timeline-track" style="top:${y}px;height:${layout.laneHeight}px;"><div class="timeline-track-name">${esc(layout.lane)}</div>${cardsHtml}</div>`;
    }).join('');
    const totalHeight = cursorY;

    return `
      <div class="timeline-board" style="width:${timelineWidth}px;">
        <div class="timeline-scale" style="width:${timelineWidth}px;">
          <div class="timeline-ruler" style="width:${timelineWidth}px;">${ticks.join('')}</div>
          <div class="beat-labels">${beatLabels}</div>
        </div>
        <div style="position:relative;width:${timelineWidth}px;height:${totalHeight}px;">
          ${beatLines}
          ${tracksHtml}
        </div>
      </div>
    `;
  }

  function renderGridDiffSection(projectId) {
    const grid = liveGridDiffCache.get(projectId);
    if (!grid) {
      return `<div class="sub" style="margin-top:10px;">Grid diff: click <strong>Refresh from interaction log</strong> to load.</div>`;
    }
    const exclusions = loadExclusions();
    const counts = {
      userAdded: 0,
      aiAdded: 0,
      userEdited: 0,
      aiEdited: 0,
      mixedEdited: 0,
      userRemoved: 0,
      aiRemoved: 0,
    };
    for (const [id, status] of (grid.diffInfo.cardStatusById || new Map()).entries()) {
      if (exclusions[gridExcludeId(projectId, status, id)]) continue;
      const weight = grid.diffInfo.cardAttributionById?.get(id) || { user: 0, ai: 1 };
      if (status === 'added') {
        if (weight.user > 0) counts.userAdded += 1;
        else counts.aiAdded += 1;
      } else if (status === 'edited') {
        if (weight.user > 0 && weight.ai > 0) counts.mixedEdited += 1;
        else if (weight.user > 0) counts.userEdited += 1;
        else counts.aiEdited += 1;
      } else if (status === 'removed') {
        if (weight.user > 0) counts.userRemoved += 1;
        else counts.aiRemoved += 1;
      }
    }
    const totalCounted = counts.userAdded + counts.aiAdded + counts.userEdited + counts.aiEdited + counts.mixedEdited + counts.userRemoved + counts.aiRemoved;
    const slices = [
      ['User Added', counts.userAdded, '#2563eb'],
      ['AI Added', counts.aiAdded, '#16a34a'],
      ['User Edited', counts.userEdited, '#7c3aed'],
      ['AI Edited', counts.aiEdited, '#a855f7'],
      ['User+AI Edited', counts.mixedEdited, '#f59e0b'],
      ['User Removed', counts.userRemoved, '#dc2626'],
      ['AI Removed', counts.aiRemoved, '#f97316'],
    ];
    let running = 0;
    const pieStops = slices.map(([, value, color]) => {
      const pctShare = totalCounted > 0 ? (value / totalCounted) * 100 : 0;
      const start = running;
      running += pctShare;
      return `${color} ${start}% ${running}%`;
    }).join(', ');
    const pieBg = totalCounted > 0 ? `conic-gradient(${pieStops})` : '#e5e7eb';
    const legend = slices.map(([label, value, color]) => {
      const share = totalCounted > 0 ? ((value / totalCounted) * 100).toFixed(1) : '0.0';
      return `<div><span class="diff-dot" style="background:${color}"></span>${label}: <strong>${value}</strong> (${share}%)</div>`;
    }).join('');

    const leftBoard = renderBoard(grid.initialGrid, grid.diffInfo, 'left', projectId, exclusions);
    const rightBoard = renderBoard(grid.finalGrid, grid.diffInfo, 'right', projectId, exclusions);
    const actorBits = Object.entries(grid.actorCounts || {}).map(([actor, count]) => `${actor}: ${count}`).join(' · ') || 'none';
    const baselineSource = grid.initialChoice?.source || 'unknown';
    return `
      <div class="sub" style="margin-top:10px; font-weight:700;">Grid Diff Viewer (initial grid → final grid)</div>
      <div class="sub">Grid-related interactions by actor: ${actorBits}</div>
      <div class="sub">Baseline snapshot used: ${esc(baselineSource)}</div>
      <div class="sub">Cards use timeline layout; changed cards are marked by color dots and outlines.</div>
      <div class="sub" style="margin-top:6px; font-weight:700;">Grid diff counts: User added ${counts.userAdded.toFixed(1)}, AI added ${counts.aiAdded.toFixed(1)}, User edited ${counts.userEdited.toFixed(1)}, AI edited ${counts.aiEdited.toFixed(1)}, User+AI edited ${counts.mixedEdited.toFixed(1)}, User removed ${counts.userRemoved.toFixed(1)}, AI removed ${counts.aiRemoved.toFixed(1)}, Total ${totalCounted.toFixed(1)}</div>
      <div class="sub">Rule: snapshot diff picks changed cards. Attribution from interaction trace: added=creator, removed=remover, edited=editors; if both user+AI edited, classify as User+AI edited.</div>
      <div class="diff-metrics" style="margin-bottom:8px;">
        <div class="diff-pie" style="background:${pieBg}"></div>
        <div class="diff-legend">${legend}</div>
        <div class="purpose-box"><strong>How counted</strong><br/>Each changed grid card counts as 1 unit. Removed counts only true deletions from initial → final.</div>
      </div>
      <div class="board-grid">
        <div class="board-panel">
          <div class="board-head">Initial grid board (top)</div>
          <div class="board-body">${leftBoard}</div>
        </div>
        <div class="board-panel">
          <div class="board-head">Final grid board (bottom)</div>
          <div class="board-body">${rightBoard}</div>
        </div>
      </div>
    `;
  }

  function summarizeCard(card) {
    if (!card || typeof card !== 'object') return 'Unknown card';
    if (card.kind === 'text') {
      const text = typeof card.text === 'string' ? card.text.trim() : '';
      return `TEXT: ${text.slice(0, 120)}${text.length > 120 ? '…' : ''}`;
    }
    if (card.kind === 'group') {
      const summary = typeof card.summary === 'string' ? card.summary : 'group';
      return `GROUP: ${summary}`;
    }
    if (card.kind === 'asset') {
      return `ASSET: ${card.momentId || 'unknown moment'}`;
    }
    return `${String(card.kind || 'CARD').toUpperCase()}`;
  }

  function gridLinesForHumans(grid) {
    const lines = [];
    const beats = Array.isArray(grid?.beats) ? grid.beats : [];
    for (const beat of beats) {
      lines.push(`Beat: ${beat?.name || beat?.id || 'Untitled beat'}`);
      const tracks = Array.isArray(beat?.tracks) ? beat.tracks : [];
      for (const track of tracks) {
        const rowName = track?.row || 'row';
        const cards = Array.isArray(track?.cards) ? track.cards : [];
        if (!cards.length) continue;
        lines.push(`  Row: ${rowName}`);
        for (const card of cards) {
          lines.push(`    - ${summarizeCard(card)}`);
        }
      }
    }
    return lines;
  }

  function buildGridDiff(projectId, interactions, finalGrid) {
    const initialChoice = chooseBestInitialGrid(interactions, finalGrid || { beats: [] });
    const initialGrid = initialChoice.grid || { beats: [] };
    const actorCounts = {};
    for (const event of interactions) {
      const action = String(event?.action || '');
      const targetType = event?.target?.type;
      const isGridRelated = targetType === 'grid' || targetType === 'beat' || targetType === 'card' || action.startsWith('grid.') || action.startsWith('beat.') || action.startsWith('card.') || action.startsWith('suggest-structure');
      if (!isGridRelated) continue;
      const actor = event?.actor || 'unknown';
      actorCounts[actor] = (actorCounts[actor] || 0) + 1;
    }
    const initialCards = cardsById(initialGrid || { beats: [] });
    const finalCards = cardsById(finalGrid || { beats: [] });
    const addedIds = new Set();
    const removedIds = new Set();
    const editedIds = new Set();
    for (const [id, card] of finalCards.entries()) {
      if (!initialCards.has(id)) addedIds.add(id);
      else if (cardSignature(card) !== cardSignature(initialCards.get(id))) editedIds.add(id);
    }
    for (const id of initialCards.keys()) if (!finalCards.has(id)) removedIds.add(id);

    const initialSigs = collectGridSignatures(initialGrid || { beats: [] });
    const finalSigs = collectGridSignatures(finalGrid || { beats: [] });
    const addedSigs = new Set();
    const removedSigs = new Set();
    for (const sig of finalSigs) if (!initialSigs.has(sig)) addedSigs.add(sig);
    for (const sig of initialSigs) if (!finalSigs.has(sig)) removedSigs.add(sig);

    const cardStatusById = new Map();
    for (const id of addedIds) cardStatusById.set(id, 'added');
    for (const id of editedIds) cardStatusById.set(id, 'edited');
    for (const id of removedIds) cardStatusById.set(id, 'removed');

    const changedIds = new Set(cardStatusById.keys());
    const actorMaps = detectEventCardActors(interactions || [], changedIds);

    const cardAttributionById = new Map();
    for (const [id, status] of cardStatusById.entries()) {
      const trace = Array.isArray(actorMaps.traceById?.get(id)) ? actorMaps.traceById.get(id) : [];
      if (status === 'added') {
        const addedTrace = trace.filter((entry) => entry.kind === 'added');
        const creator = normalizeActor((addedTrace[0]?.actor) || actorMaps.addedById.get(id));
        cardAttributionById.set(id, creator === 'user' ? { user: 1, ai: 0 } : { user: 0, ai: 1 });
        continue;
      }
      if (status === 'removed') {
        const removedTrace = trace.filter((entry) => entry.kind === 'removed');
        const remover = normalizeActor((removedTrace[removedTrace.length - 1]?.actor) || actorMaps.removedById.get(id));
        cardAttributionById.set(id, remover === 'user' ? { user: 1, ai: 0 } : { user: 0, ai: 1 });
        continue;
      }
      const editedTrace = trace.filter((entry) => entry.kind === 'edited');
      const editors = new Set(editedTrace.map((entry) => normalizeActor(entry.actor)));
      if (!editors.size) editors.add(normalizeActor(actorMaps.editedById.get(id)));
      if (editors.has('user') && editors.has('ai')) cardAttributionById.set(id, { user: 0.5, ai: 0.5 });
      else if (editors.has('user')) cardAttributionById.set(id, { user: 1, ai: 0 });
      else cardAttributionById.set(id, { user: 0, ai: 1 });
    }

    return {
      actorCounts,
      initialChoice,
      initialGrid: initialGrid || { beats: [] },
      finalGrid: finalGrid || { beats: [] },
      diffInfo: {
        addedIds,
        removedIds,
        editedIds,
        addedSigs,
        removedSigs,
        cardStatusById,
        cardAttributionById,
        addedById: actorMaps.addedById,
        editedById: actorMaps.editedById,
        removedById: actorMaps.removedById,
        traceById: actorMaps.traceById,
      },
    };
  }

  async function refreshLiveDiff(projectId) {
    const proj = (diffData?.projects || []).find((project) => project.projectId === projectId);
    if (!proj) return;
    const [interactionsResponse, planResponse, gridResponse] = await Promise.all([
      fetch(`/api/projects/${projectId}/interactions`, { cache: 'no-store' }),
      fetch(`/api/projects/${projectId}/plan/text-plan`, { cache: 'no-store' }),
      fetch(`/api/projects/${projectId}/plan`, { cache: 'no-store' }),
    ]);
    if (!interactionsResponse.ok) throw new Error(`Failed loading interactions (${interactionsResponse.status})`);
    if (!planResponse.ok) throw new Error(`Failed loading text plan (${planResponse.status})`);
    if (!gridResponse.ok) throw new Error(`Failed loading grid plan (${gridResponse.status})`);
    const interactions = await interactionsResponse.json();
    const plan = await planResponse.json();
    const grid = await gridResponse.json();
    const finalText = typeof plan?.text === 'string' ? plan.text : '';
    const live = buildLiveProjectDiff(projectId, proj.projectName, interactions, finalText);
    liveDiffCache.set(projectId, live);
    const liveGrid = buildGridDiff(projectId, interactions, grid);
    liveGridDiffCache.set(projectId, liveGrid);
  }

  function render() {
    if (!rootNode || !statsData) return;
    const model = {
      percentages: {
        userCreated: statsData.averages.userCreated,
        aiCreated: statsData.averages.aiCreated,
        userModifiedAmongUserCreated: statsData.averages.userModifiedAmongUserCreated,
        aiModifiedAmongAiCreated: statsData.averages.aiModifiedAmongAiCreated,
        userAdjustedAmongUserCreated: statsData.averages.userAdjustedAmongUserCreated,
        userCorrectedAmongUserCreated: statsData.averages.userCorrectedAmongUserCreated,
        aiAdjustedAmongAiCreated: statsData.averages.aiAdjustedAmongAiCreated,
        aiCorrectedAmongAiCreated: statsData.averages.aiCorrectedAmongAiCreated,
        deleted: statsData.averages.deleted
      }
    };
    const totals = totalCounts(statsData.projects || []);

    const priorSelection = rootNode.querySelector('#inline-diff-selected-project')?.value || currentProjectIdFromPath();
    rootNode.innerHTML = `
      <h2>Interaction Stats</h2>
      <div class="sub">Total averages across ${statsData.projectCount} people/projects</div>
      <div class="sub">Total lines/cards: ${totals.total} · user created ${totals.userCreated} · ai created ${totals.aiCreated} · user adjusted ${totals.userAdjusted} · user corrected ${totals.userCorrected} · ai adjusted ${totals.aiAdjusted} · ai corrected ${totals.aiCorrected} · deleted ${totals.deleted}</div>
      <div class="detail">
        <div class="pie" style="background:${pieStyle(model.percentages.userCreated, model.percentages.aiCreated)}"></div>
        <div class="legend">
          <div><span class="dot user"></span>% user-created: <strong>${pct(model.percentages.userCreated)}</strong></div>
          <div><span class="dot ai"></span>% AI-created: <strong>${pct(model.percentages.aiCreated)}</strong></div>
        </div>
      </div>
      <div class="grid">
        <div class="kpi"><div class="label">% user-created modified/adjusted/corrected</div><div class="value">${pct(model.percentages.userModifiedAmongUserCreated)}</div></div>
        <div class="kpi"><div class="label">% AI-created modified/adjusted/corrected</div><div class="value">${pct(model.percentages.aiModifiedAmongAiCreated)}</div></div>
        <div class="kpi"><div class="label">% user-created adjusted</div><div class="value">${pct(model.percentages.userAdjustedAmongUserCreated)}</div></div>
        <div class="kpi"><div class="label">% user-created corrected</div><div class="value">${pct(model.percentages.userCorrectedAmongUserCreated)}</div></div>
        <div class="kpi"><div class="label">% AI-created adjusted</div><div class="value">${pct(model.percentages.aiAdjustedAmongAiCreated)}</div></div>
        <div class="kpi"><div class="label">% AI-created corrected</div><div class="value">${pct(model.percentages.aiCorrectedAmongAiCreated)}</div></div>
        <div class="kpi"><div class="label">% deleted</div><div class="value">${pct(model.percentages.deleted)}</div></div>
      </div>
      <div class="sub" style="margin-top:12px; font-weight:600">Text plan vs Grid (two pie charts)</div>
      <div class="grid">
        ${comparisonCard('Text plan', statsData.comparison?.textPlan)}
        ${comparisonCard('Grid', statsData.comparison?.grid)}
      </div>
      <input id="inline-diff-selected-project" type="hidden" value="${priorSelection}">
      ${renderDiffSection(priorSelection)}
    `;

    const select = rootNode.querySelector('#inline-diff-select');
    if (select && diffData?.projects?.length) {
      const currentId = currentProjectIdFromPath();
      if (diffData.projects.some((project) => project.projectId === currentId)) select.value = currentId;
      select.addEventListener('change', () => {
        const next = select.value;
        const hidden = rootNode.querySelector('#inline-diff-selected-project');
        if (hidden) hidden.value = next;
        refreshLiveDiff(next).then(() => render()).catch(() => render());
      }, { once: true });
    }

    const refreshButton = rootNode.querySelector('#inline-diff-refresh');
    if (refreshButton) {
      refreshButton.addEventListener('click', async () => {
        const selected = rootNode.querySelector('#inline-diff-select')?.value || priorSelection;
        await refreshLiveDiff(selected);
        render();
      }, { once: true });
    }

    const refreshAllButton = rootNode.querySelector('#inline-diff-refresh-all');
    if (refreshAllButton) {
      refreshAllButton.addEventListener('click', async () => {
        const allIds = (diffData?.projects || []).map((project) => project.projectId).filter(Boolean);
        for (const projectId of allIds) {
          try { await refreshLiveDiff(projectId); }
          catch { /* ignore per-project refresh errors */ }
        }
        render();
      }, { once: true });
    }

    rootNode.querySelectorAll('[data-exclude-id]').forEach((node) => {
      node.addEventListener('click', () => {
        const encodedId = node.getAttribute('data-exclude-id') || '';
        const id = decodeURIComponent(encodedId);
        const exclusions = loadExclusions();
        exclusions[id] = !exclusions[id];
        saveExclusions(exclusions);
        render();
      }, { once: true });
    });
  }

  async function ensureData() {
    if (statsData) return true;
    if (statsPromise) {
      try {
        await statsPromise;
        return Boolean(statsData);
      } catch {
        return false;
      }
    }
    try {
      statsPromise = (async () => {
        const staticResponse = await fetch('/interaction-stats.json', { cache: 'no-store' });
        if (!staticResponse.ok) throw new Error(`Failed to load interaction stats file (${staticResponse.status})`);
        const text = await staticResponse.text();
        try {
          statsData = JSON.parse(text);
        } catch {
          throw new Error('Invalid JSON in /interaction-stats.json (likely stale server route or HTML fallback)');
        }
      })();
      await statsPromise;
      statsPromise = null;
      return true;
    } catch (error) {
      statsPromise = null;
      if (rootNode) rootNode.innerHTML = `<div class="error">${error.message}</div>`;
      return false;
    }
  }

  async function ensureDiffData() {
    if (diffData) return true;
    if (diffPromise) {
      try {
        await diffPromise;
        return Boolean(diffData);
      } catch {
        return false;
      }
    }
    try {
      diffPromise = (async () => {
        const response = await fetch('/plan-diffs.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Failed to load plan diff file (${response.status})`);
        const text = await response.text();
        try {
          diffData = JSON.parse(text);
        } catch {
          throw new Error('Invalid JSON in /plan-diffs.json (likely stale server route or HTML fallback)');
        }
      })();
      await diffPromise;
      diffPromise = null;
      return true;
    } catch (error) {
      diffPromise = null;
      if (rootNode) rootNode.innerHTML = `<div class="error">${error.message}</div>`;
      return false;
    }
  }

  async function attachPanel() {
    const main = document.querySelector('main');
    if (!main) return;
    let panel = document.getElementById('inline-stats-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'inline-stats-panel';
      panel.className = 'inline-stats';
      panel.innerHTML = '<div class="sub">Loading interaction stats…</div>';
      main.prepend(panel);
    }
    rootNode = panel;
    const ok = await ensureData();
    const okDiff = await ensureDiffData();
    if (ok && okDiff) render();
  }

  function boot() {
    installStyles();
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      const main = document.querySelector('main');
      if (main) {
        clearInterval(timer);
        attachPanel();
      } else if (attempts >= 60) {
        clearInterval(timer);
      }
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
    const collectById = (gridObj) => {
      const byId = new Map();
      const beats = Array.isArray(gridObj?.beats) ? gridObj.beats : [];
      for (const beat of beats) {
        for (const track of (Array.isArray(beat?.tracks) ? beat.tracks : [])) {
          for (const card of (Array.isArray(track?.cards) ? track.cards : [])) {
            const id = cardIdentity(card);
            if (!id) continue;
            byId.set(id, cardSignature(card));
          }
        }
      }
      return byId;
    };
    const initialById = collectById(initialGrid || { beats: [] });
    const finalById = collectById(finalGrid || { beats: [] });
    const addedIds = new Set([...finalById.keys()].filter((id) => !initialById.has(id)));
    const removedIds = new Set([...initialById.keys()].filter((id) => !finalById.has(id)));
    const editedIds = new Set([...finalById.keys()].filter((id) => initialById.has(id) && initialById.get(id) !== finalById.get(id)));

    const initialSigs = collectGridSignatures(initialGrid || { beats: [] });
    const finalSigs = collectGridSignatures(finalGrid || { beats: [] });
    const addedSigs = new Set([...finalSigs].filter((sig) => !initialSigs.has(sig)));
    const removedSigs = new Set([...initialSigs].filter((sig) => !finalSigs.has(sig)));
