#!/usr/bin/env python3
import difflib
import json
from pathlib import Path
from collections import Counter, defaultdict


ROOT = Path(__file__).resolve().parent


def read_json(path: Path, fallback):
    if not path.exists():
        return fallback
    return json.loads(path.read_text())


def read_jsonl(path: Path):
    if not path.exists():
        return []
    rows = []
    for raw in path.read_text().splitlines():
        raw = raw.strip()
        if not raw:
            continue
        try:
            rows.append(json.loads(raw))
        except json.JSONDecodeError:
            continue
    return rows


def compute_project_diff(project):
    project_id = project["id"]
    plan_dir = ROOT / "projects" / project_id / "plan"
    interactions = read_jsonl(plan_dir / "interactions.jsonl")
    final_plan = read_json(plan_dir / "text-plan.json", {})
    final_text = final_plan.get("text", "") if isinstance(final_plan, dict) else ""

    initial_ai = ""
    for evt in interactions:
        if evt.get("action") == "text-plan.generate" and evt.get("actor") in {"assistant", "ai"}:
            initial_ai = evt.get("after") or ""
            break

    actor_counts = {}
    change_events = []
    user_change_events = []
    line_meta = defaultdict(lambda: {
        "addedBy": None,
        "lastChangedBy": None,
        "removedBy": None,
        "changeKinds": [],
        "everAdded": False,
    })
    seen_lines = set()

    def parse_lines(text):
      if not isinstance(text, str):
          return []
      return [line for line in text.splitlines() if line.strip()]

    def change_preview(before_text, after_text):
        before_lines = parse_lines(before_text)
        after_lines = parse_lines(after_text)
        before_set = set(before_lines)
        after_set = set(after_lines)
        removed = [line for line in before_lines if line not in after_set]
        added = [line for line in after_lines if line not in before_set]
        if removed or added:
            return {
                "removed": removed[0] if removed else "",
                "added": added[0] if added else "",
            }
        return {"removed": "", "added": ""}

    def infer_kind(action, before_lines, after_lines):
      if action == "text-plan.generate":
          return "added"
      if not before_lines and after_lines:
          return "added"
      if before_lines and not after_lines:
          return "removed"
      return "edited"
    for evt in interactions:
        action = str(evt.get("action", ""))
        target_type = ((evt.get("target") or {}).get("type"))
        if not (action.startswith("text-plan.") or target_type == "text-plan"):
            continue
        before, after = evt.get("before"), evt.get("after")
        if before == after:
            continue
        actor = evt.get("actor", "unknown")
        actor_counts[actor] = actor_counts.get(actor, 0) + 1
        before_lines = parse_lines(before)
        after_lines = parse_lines(after)
        before_count = Counter(before_lines)
        after_count = Counter(after_lines)
        added_counter = after_count - before_count
        removed_counter = before_count - after_count
        kind = infer_kind(action, before_lines, after_lines)
        replacement_like = bool(added_counter and removed_counter)

        for line, count in added_counter.items():
            if not line.strip():
                continue
            meta = line_meta[line]
            is_truly_new = line not in seen_lines and not meta["everAdded"]
            # First-ever appearance of a line is always an addition by that actor.
            # Later re-introductions/rewrites are treated as edits.
            classified_kind = "added" if is_truly_new else "edited"
            if meta["addedBy"] is None:
                meta["addedBy"] = actor
                meta["everAdded"] = True
            meta["lastChangedBy"] = actor
            meta["changeKinds"].append(classified_kind)
            seen_lines.add(line)

        for line, count in removed_counter.items():
            if not line.strip():
                continue
            meta = line_meta[line]
            meta["removedBy"] = actor
            meta["lastChangedBy"] = actor
            meta["changeKinds"].append("removed")

        # Intentionally no blanket fallback update for all after-lines.
        # We only attribute per-line changes when a concrete line delta exists
        # (added/removed counters), to avoid conflating unrelated edits.

        change_events.append({
            "timestamp": evt.get("timestamp"),
            "actor": actor,
            "action": action,
            "id": evt.get("id"),
        })
        if actor == "user":
            before_text = before if isinstance(before, str) else ""
            after_text = after if isinstance(after, str) else ""
            preview = change_preview(before_text, after_text)
            user_change_events.append({
                "timestamp": evt.get("timestamp"),
                "action": action,
                "suggestedPurpose": evt.get("suggestedPurpose"),
                "editTarget": evt.get("editTarget"),
                "id": evt.get("id"),
                "charsBefore": len(before_text),
                "charsAfter": len(after_text),
                "charsDelta": len(after_text) - len(before_text),
                "previewRemoved": preview["removed"],
                "previewAdded": preview["added"],
            })

    diff_lines = list(difflib.unified_diff(
        initial_ai.splitlines(),
        final_text.splitlines(),
        fromfile="initial_ai_plan",
        tofile="final_plan",
        lineterm="",
    ))

    left_lines = initial_ai.splitlines()
    right_lines = final_text.splitlines()
    matcher = difflib.SequenceMatcher(a=left_lines, b=right_lines)
    side_by_side = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        left_chunk = left_lines[i1:i2]
        right_chunk = right_lines[j1:j2]
        chunk_len = max(len(left_chunk), len(right_chunk))
        for idx in range(chunk_len):
            left_text = left_chunk[idx] if idx < len(left_chunk) else ""
            right_text = right_chunk[idx] if idx < len(right_chunk) else ""
            left_type = "unchanged"
            right_type = "unchanged"
            if tag == "replace":
                left_type = "removed" if left_text else "empty"
                right_type = "added" if right_text else "empty"
            elif tag == "delete":
                left_type = "removed" if left_text else "empty"
                right_type = "empty"
            elif tag == "insert":
                left_type = "empty"
                right_type = "added" if right_text else "empty"
            side_by_side.append({
                "left": left_text,
                "right": right_text,
                "leftType": left_type,
                "rightType": right_type,
                "leftMeta": line_meta.get(left_text, None) if left_text else None,
                "rightMeta": line_meta.get(right_text, None) if right_text else None,
            })

    return {
        "projectId": project_id,
        "projectName": project.get("name", project_id),
        "mode": "text-plan" if project.get("ablated") else "grid",
        "initialChars": len(initial_ai),
        "finalChars": len(final_text),
        "changeEventCount": len(change_events),
        "actorCounts": actor_counts,
        "recentEvents": change_events[-20:],
        "userChangeEvents": user_change_events,
        "initialPlanText": initial_ai,
        "finalPlanText": final_text,
        "sideBySide": side_by_side,
        "diff": "\n".join(diff_lines),
    }


def main():
    archive = read_json(ROOT / "archive.json", {})
    projects = archive.get("projects", [])
    payload = {
        "generatedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "projectCount": len(projects),
        "projects": [compute_project_diff(project) for project in projects],
    }
    out = ROOT / "plan-diffs.json"
    out.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()

