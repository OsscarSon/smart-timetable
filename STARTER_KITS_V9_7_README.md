# Mochi v9.7.0 — Starter Kits (based on v9.6.0)

## Included
- New independent template picker on timetable, English/Chinese/Malay.
- Four starter templates: Exam, Work, College, Daily Balance.
- Edit times, uncheck events, see conflicts, confirm before writing.
- Add manual events **only to the selected week and timetable**; no automatic recurrence, no overwrite.
- Immediate in-dialog undo of this import, provided generated objects remain unchanged.

## Integration with Claude Phase 3
This is a fork of v9.6.0, NOT a replacement for Claude's Phase 3 branch. Cherry-pick only: `js/starter-kits.js`, `css/starter-kits.css`, the two index.html references, and two SW precache entries; reconcile version numbers manually. Do not overwrite Claude's newer index.html, app.js, SW, or package.json.

## Limitations / verification
- Template examples are one week only; future weeks not populated.
- Collision checking reads current-week manual events and existing fixed/repeat blocks.
- Existing-user data is never deliberately erased; **back up before testing**.
- Multi-tab concurrent edits and cloud synchronization have not been end-to-end tested.
- No full browser UI regression tests completed in this environment.
