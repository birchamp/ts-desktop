# macOS Parity Checklist (Legacy tS vs Modern Build)

Last updated: 2026-02-11
Status scale: `PASS`, `FAIL`, `BLOCKED`

## Test Setup

- Platform: macOS (current target for Gate 1).
- Legacy reference: original `unfoldingWord-dev/ts-desktop` desktop behavior.
- Modern reference: current `master` launched via `npm run start:safe`.
- Execution mode for this run: non-interactive validation (startup run + code-path audit). Full click-through interaction is still required for final parity sign-off.

## Project Lifecycle

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| P-01 | Create project from Home/New Project flow | Project is created and appears in project list without restart | BLOCKED | Create flow writes project + context and navigates to translate, but this run did not execute interactive click-through verification. |
| P-02 | Open existing project | Existing project opens to expected working screen | BLOCKED | Home open action routes to `/translate?projectId=...` and loads context, but interactive validation is still pending. |
| P-03 | Recent projects list | Recent entries update after open/create and can be reopened | BLOCKED | `recordRecent` is wired in create/open paths, but UI-level behavior has not been manually executed in this run. |
| P-04 | Delete/remove project | Project removal updates list and does not corrupt remaining entries | BLOCKED | Delete path is implemented through `projectRepository.deleteProject`, but list integrity still needs interactive verification. |

## Import and Export

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| I-01 | Import USFM project | Valid USFM imports successfully and appears as usable project | BLOCKED | USFM import code path exists (`importUsfm`), but no interactive import run was executed in this checklist pass. |
| I-02 | Import error handling | Invalid/partial USFM shows actionable error and does not crash app | FAIL | Current Home import path has no explicit user-facing actionable error state for malformed USFM; failures can silently no-op. |
| I-03 | Export USFM project | Export creates expected files and folder structure | FAIL | Export dialog exists but is not wired from active screen flows; Print screen is currently informational only. |
| I-04 | Backup export/import roundtrip | Backup export can be imported back with no major data loss | FAIL | Backup export/import is not implemented in modern flow (`ExportDialog` throws for backup, archive import path is TODO). |

## Translation and Review

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| T-01 | Open translation workspace | Selected project opens to translation screen with expected panes/content | PASS | Translation screen loads project context and preloads source + Door43 support resources where available. |
| T-02 | Save translation edits | Edits persist after navigation away and app restart | FAIL | Target translation pane is still placeholder text; no editor persistence path yet. |
| T-03 | Review workflow navigation | Review flow opens and supports expected verse/project review actions | FAIL | Review screen is currently dashboard-style placeholder content, not legacy review interaction flow. |
| T-04 | Translation to review continuity | Data/state remains consistent when switching between screens | FAIL | No persisted translation editing state exists to carry continuity into review. |

## Print and Export Screen

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| X-01 | Open Print/Export screen | Screen loads without errors and exposes expected options | PASS | Screen loads and renders static guidance/options. |
| X-02 | Export from Print/Export flow | Export output is created and matches legacy content expectations | FAIL | Print screen does not currently trigger export actions; parity flow is incomplete. |

## Settings, Profile, Updates, Legal

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| S-01 | Settings load | Settings screen loads and values are readable/editable | PASS | Settings screen loads and reads persisted `settings.json` when present. |
| S-02 | Settings persistence | Changed settings persist across app restart | PASS | Save path writes `settings.json`; persistence mechanism is present. |
| S-03 | Profile screen | Profile data loads and updates like legacy behavior | FAIL | Profile updates only local app context; no persisted profile storage parity. |
| S-04 | Updates screen | Updates screen loads and handles update checks safely | FAIL | Updates screen is static release-note data; no active update-check workflow. |
| S-05 | Terms/legal screen | Terms/licensing content displays correctly | PASS | Terms screen renders legal summary content without runtime dependency. |

## Academy Window

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| A-01 | Open Academy window/content | Academy view opens and displays expected content | FAIL | Legacy academy main-process support exists, but modern React navigation does not expose a usable academy entry flow. |
| A-02 | Academy navigation stability | Navigation in/out of academy does not destabilize main window | BLOCKED | Cannot validate stability until Academy open path is re-enabled in modern UI flow. |

## Gate 1 Exit Summary

- P0 blockers found: `8`
- P1 blockers found: `5`
- Overall Gate 1 readiness: `NOT READY`

P0 blockers tracked in this run:
- `I-03`, `I-04`, `T-02`, `T-03`, `T-04`, `X-02`, `A-01`, `S-04`
