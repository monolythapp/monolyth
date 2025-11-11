# Changelog

## 2025-11-11 — Week 2 / Day 5
- Migrated dev workflow to Cursor on branch eat/week2-cursor.
- Fixed Workbench load + Analyze drawer; added DriveRecent panel.
- Repaired share viewer hook export (useScrollEvents default).
- ESLint v9 config stabilized; lint scope limited to src (no .next).
- Husky pre-commit switched to POSIX script; line endings set to LF.

## [v0.1.0-week2-day5] - 2025-11-11
- Lint pipeline normalized (ESLint 9 flat config) and green.
- Fixed ShareClient + useScrollEvents and Workbench analyze flow.
- Build and `next start` verified on Node 20, Next 16.
- Husky pre-commit simplified; runs lint only.
