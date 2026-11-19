#!/usr/bin/env python3
import argparse
import difflib
import json
from pathlib import Path


def load_project_id(archive_path: Path, name_query: str) -> str:
    archive = json.loads(archive_path.read_text())
    matches = [p for p in archive.get("projects", []) if name_query.lower() in p.get("name", "").lower()]
    if not matches:
        raise SystemExit(f"No project found matching: {name_query}")
    if len(matches) > 1:
        names = "\n".join([f"- {m['name']} ({m['id']})" for m in matches])
        raise SystemExit(f"Multiple projects matched '{name_query}':\n{names}\nUse --project-id.")
    return matches[0]["id"]


def read_jsonl(path: Path):
    rows = []
    if not path.exists():
        return rows
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        rows.append(json.loads(line))
    return rows


def main():
    parser = argparse.ArgumentParser(description="Show initial AI plan vs final plan diff + who changed what")
    parser.add_argument("--project-id", help="Project ID")
    parser.add_argument("--project-name", help="Name substring from archive.json")
    parser.add_argument("--root", default=".", help="Archive root path")
    parser.add_argument("--max-events", type=int, default=30, help="Max change events to print")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    archive_path = root / "archive.json"

    if args.project_id:
        project_id = args.project_id
    elif args.project_name:
        project_id = load_project_id(archive_path, args.project_name)
    else:
        raise SystemExit("Provide --project-id or --project-name")

    plan_dir = root / "projects" / project_id / "plan"
    interactions = read_jsonl(plan_dir / "interactions.jsonl")

    initial_ai = ""
    for evt in interactions:
        if evt.get("action") == "text-plan.generate" and evt.get("actor") in {"assistant", "ai"}:
            initial_ai = evt.get("after") or ""
            break

    final_plan_json = json.loads((plan_dir / "text-plan.json").read_text())
    final_text = final_plan_json.get("text", "") if isinstance(final_plan_json, dict) else ""

    change_events = []
    actor_counts = {}
    for evt in interactions:
        action = str(evt.get("action", ""))
        target_type = ((evt.get("target") or {}).get("type"))
        before = evt.get("before")
        after = evt.get("after")
        is_text_event = action.startswith("text-plan.") or target_type == "text-plan"
        if not is_text_event:
            continue
        if before == after:
            continue
        actor = evt.get("actor", "unknown")
        actor_counts[actor] = actor_counts.get(actor, 0) + 1
        change_events.append({
            "timestamp": evt.get("timestamp"),
            "actor": actor,
            "action": action,
            "id": evt.get("id"),
            "chars_before": len(before or "") if isinstance(before, str) else None,
            "chars_after": len(after or "") if isinstance(after, str) else None,
        })

    diff = list(difflib.unified_diff(
        initial_ai.splitlines(),
        final_text.splitlines(),
        fromfile="initial_ai_plan",
        tofile="final_plan",
        lineterm="",
    ))

    print(f"Project ID: {project_id}")
    print(f"Initial AI plan chars: {len(initial_ai)}")
    print(f"Final plan chars: {len(final_text)}")
    print(f"Text-plan change events: {len(change_events)}")
    print("Change events by actor:")
    for actor, count in sorted(actor_counts.items(), key=lambda x: (-x[1], x[0])):
        print(f"  - {actor}: {count}")

    print("\nRecent change events:")
    for evt in change_events[-args.max_events:]:
        print(f"  - {evt['timestamp']} | {evt['actor']} | {evt['action']} | {evt['id']}")

    print("\nUnified diff (initial AI -> final):")
    if diff:
        for line in diff:
            print(line)
    else:
        print("  (no text differences)")


if __name__ == "__main__":
    main()
