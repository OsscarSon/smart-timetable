# Mochi Starter Kits + illustrated menu patch

This ZIP contains **only new/changed files relative to v9.6**, not a full project.

## What's new
- Two cropped Buddy banner illustrations taken from the approved user-provided visual reference, with editable live text and a contrast gradient. Short, constant-height banners on phone/tablet/desktop; responsive width.
- Starter Kits now generate 35 example events per week (5 per day), for all four kits; every event can be unchecked or its time edited before import.
- Grouped seven-day list with internal scroll; conflicts with existing schedule and other selected kit events are flagged.

## Merge safety
- Claude Phase 3 is on a separate branch. Merge `index.html`, `sw.js`, and any shared file carefully; do not blindly overwrite.
- Assets: `assets/mochi-banner-space.webp` and `assets/mochi-banner-more.webp`.
- Existing starter-kit behavior still writes manual events only for the selected week. No recurring activity creation, no automatic deletion.
- If current timetable hours hide template activities, they are flagged as outside timetable; adjust times or timetable settings before importing.
- Artwork is cropped from the user-supplied approved concept screenshot, not separately redrawn source art. Its resolution is limited by that screenshot.
- Static JavaScript syntax check is recommended; full end-to-end browser and cloud sync tests have not been run.
