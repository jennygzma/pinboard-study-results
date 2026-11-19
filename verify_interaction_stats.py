#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def pct(v, d):
    return round((v / d) * 100, 1) if d > 0 else 0.0


def avg(vals):
    return round(sum(vals) / len(vals), 1) if vals else 0.0


def load_json(p, fallback):
    if not p.exists():
        return fallback
    with p.open() as f:
        return json.load(f)


def recompute_project(project):
    pid = project["id"]
    mode = "text-plan" if project.get("ablated") else "grid"
    base = ROOT / "projects" / pid / "plan"
    card = load_json(base / "export" / f"card-outcome-labels-{pid}.json", {})
    line = load_json(base / "export" / f"text-plan-line-outcome-labels-{pid}.json", {})

    labeled_ids = set(card.keys()) | set(line.keys())
    entries = list(card.values()) + list(line.values())

    deleted_ids = set()
    interactions_file = base / "interactions.jsonl"
    if interactions_file.exists():
        with interactions_file.open() as f:
            for raw in f:
                raw = raw.strip()
                if not raw:
                    continue
                event = json.loads(raw)
                tid = ((event.get("target") or {}).get("id"))
                if not tid:
                    continue
                if str(event.get("action", "")).endswith(".delete") or event.get("after") is None:
                    deleted_ids.add(tid)

    total = len(entries)
    ai_created = sum(1 for e in entries if e.get("actor") == "ai")
    user_created = sum(1 for e in entries if e.get("actor") == "user")
    user_adjusted = sum(1 for e in entries if e.get("actor") == "user" and e.get("outcome") == "adjusted")
    user_corrected = sum(1 for e in entries if e.get("actor") == "user" and e.get("outcome") == "corrected")
    ai_adjusted = sum(1 for e in entries if e.get("actor") == "ai" and e.get("outcome") == "adjusted")
    ai_corrected = sum(1 for e in entries if e.get("actor") == "ai" and e.get("outcome") == "corrected")
    user_modified = user_adjusted + user_corrected
    ai_modified = ai_adjusted + ai_corrected
    deleted = sum(1 for d in deleted_ids if d in labeled_ids)

    return {
        "projectId": pid,
        "projectName": project["name"],
        "mode": mode,
        "totals": {
            "total": total,
            "aiCreated": ai_created,
            "userCreated": user_created,
            "userModified": user_modified,
            "aiModified": ai_modified,
            "userAdjusted": user_adjusted,
            "userCorrected": user_corrected,
            "aiAdjusted": ai_adjusted,
            "aiCorrected": ai_corrected,
            "deleted": deleted,
        },
        "percentages": {
            "aiCreated": pct(ai_created, total),
            "userCreated": pct(user_created, total),
            "userModifiedAmongUserCreated": pct(user_modified, user_created),
            "aiModifiedAmongAiCreated": pct(ai_modified, ai_created),
            "userAdjustedAmongUserCreated": pct(user_adjusted, user_created),
            "userCorrectedAmongUserCreated": pct(user_corrected, user_created),
            "aiAdjustedAmongAiCreated": pct(ai_adjusted, ai_created),
            "aiCorrectedAmongAiCreated": pct(ai_corrected, ai_created),
            "deleted": pct(deleted, total),
        },
    }


def aggregate(projects):
    def av(key, filt):
        vals = [p["percentages"][key] for p in projects if filt(p)]
        return avg(vals)

    return {
        "aiCreated": av("aiCreated", lambda p: p["totals"]["total"] > 0),
        "userCreated": av("userCreated", lambda p: p["totals"]["total"] > 0),
        "userModifiedAmongUserCreated": av("userModifiedAmongUserCreated", lambda p: p["totals"]["userCreated"] > 0),
        "aiModifiedAmongAiCreated": av("aiModifiedAmongAiCreated", lambda p: p["totals"]["aiCreated"] > 0),
        "userAdjustedAmongUserCreated": av("userAdjustedAmongUserCreated", lambda p: p["totals"]["userCreated"] > 0),
        "userCorrectedAmongUserCreated": av("userCorrectedAmongUserCreated", lambda p: p["totals"]["userCreated"] > 0),
        "aiAdjustedAmongAiCreated": av("aiAdjustedAmongAiCreated", lambda p: p["totals"]["aiCreated"] > 0),
        "aiCorrectedAmongAiCreated": av("aiCorrectedAmongAiCreated", lambda p: p["totals"]["aiCreated"] > 0),
        "deleted": av("deleted", lambda p: p["totals"]["total"] > 0),
    }


def main():
    archive = load_json(ROOT / "archive.json", {})
    expected = load_json(ROOT / "interaction-stats.json", {})

    recomputed_projects = [recompute_project(p) for p in archive.get("projects", [])]
    by_id = {p["projectId"]: p for p in recomputed_projects}

    # Validate project-level equality
    for saved in expected.get("projects", []):
        pid = saved["projectId"]
        got = by_id.get(pid)
        if got is None:
            raise SystemExit(f"FAIL: missing project {pid}")
        if saved != got:
            raise SystemExit(f"FAIL: project mismatch for {pid}")

    # Validate top-level averages
    recomputed_avgs = aggregate(recomputed_projects)
    if recomputed_avgs != expected.get("averages"):
        raise SystemExit("FAIL: top-level averages mismatch")

    # Validate comparison buckets
    text_projects = [p for p in recomputed_projects if p["mode"] == "text-plan"]
    grid_projects = [p for p in recomputed_projects if p["mode"] == "grid"]
    recomputed_comparison = {
        "textPlan": {"projectCount": len(text_projects), "averages": aggregate(text_projects)},
        "grid": {"projectCount": len(grid_projects), "averages": aggregate(grid_projects)},
    }
    if recomputed_comparison != expected.get("comparison"):
        raise SystemExit("FAIL: text/grid comparison mismatch")

    print("PASS: interaction-stats.json verified against independent Python recomputation")


if __name__ == "__main__":
    main()
