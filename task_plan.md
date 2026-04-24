# JSON to DB Refactor Plan

Goal: audit current JSON storage and promote data that is now core workflow state into DB schema.

## Phase 1 - Audit and Decide

Status: complete

- Find JSON fields and usage.
- Decide which JSON should remain flexible and which should become columns/tables.
- Record findings before code changes.

## Phase 2 - Schema and Access Layer

Status: complete

- Add DB schema for structured shot workflow state.
- Replace fixed character form JSON with explicit form prompt columns if practical.
- Add serializers/helpers so API/UI code has one conversion path.

## Phase 3 - API Integration

Status: complete

- Update shot generation, shot saving, preview, and panel generation APIs.
- Keep frontend contract stable where possible.

## Phase 4 - Local DB, Tests, Docs

Status: complete

- Generate/apply migration for local DB.
- Backfill existing development data.
- Run typecheck/tests/lint.
- Update `ai-collab` handoff docs.

## Errors Encountered

| Error | Resolution |
|-------|------------|
| Local SQLite backfill first used `coalesce(shots, "")`, which SQLite treated as an identifier. | Re-ran with single-quoted string literal `coalesce(shots, '')`. |
| First targeted eslint command included a non-existent `generate.ts` path. | Re-ran eslint with the correct route file list. |
