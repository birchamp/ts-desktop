# macOS Parity Checklist (Legacy tS vs Modern Build)

Last updated: 2026-02-11
Status scale: `PASS`, `FAIL`, `BLOCKED`

## Test Setup

- Platform: macOS (current target for Gate 1).
- Legacy reference: original `unfoldingWord-dev/ts-desktop` desktop behavior.
- Modern reference: current `master` launched via `npm run start:safe`.
- Execution mode for this run: hybrid validation (gate scripts + startup smoke + code-path audit + targeted integration tests). Full click-through interaction is still required for final parity sign-off of UI-driven workflows.

## Project Lifecycle

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| P-01 | Create project from Home/New Project flow | Project is created and appears in project list without restart | BLOCKED | Repository create + context persistence path is now covered in `__tests__/macos-parity-evidence.integration.test.js`; UI click-through validation is still pending. |
| P-02 | Open existing project | Existing project opens to expected working screen | BLOCKED | Open/read path is covered at repository level in `__tests__/macos-parity-evidence.integration.test.js`, but screen-level navigation still needs manual validation. |
| P-03 | Recent projects list | Recent entries update after open/create and can be reopened | BLOCKED | `recordRecent`/`listRecentProjects` behavior is now covered by integration evidence; Home screen interaction verification remains pending. |
| P-04 | Delete/remove project | Project removal updates list and does not corrupt remaining entries | BLOCKED | Delete behavior is covered in integration evidence, but UI list integrity after delete still requires manual verification. |

## Import and Export

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| I-01 | Import USFM project | Valid USFM imports successfully and appears as usable project | PASS | Automated integration test now validates `importUsfm` end-to-end with project + asset persistence (`__tests__/macos-parity-evidence.integration.test.js`). |
| I-02 | Import error handling | Invalid/partial USFM shows actionable error and does not crash app | PASS | Home import now surfaces warning notices for failed/malformed USFM imports. |
| I-03 | Export USFM project | Export creates expected files and folder structure | BLOCKED | Export dialog is now reachable from Print screen, but file output parity has not yet been manually verified in this pass. |
| I-04 | Backup export/import roundtrip | Backup export can be imported back with no major data loss | PASS | Automated integration test now validates backup roundtrip including translation draft and review draft restoration (`__tests__/macos-parity-evidence.integration.test.js`). |

## Translation and Review

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| T-01 | Open translation workspace | Selected project opens to translation screen with expected panes/content | PASS | Translation screen loads project context and preloads source + Door43 support resources where available. |
| T-02 | Save translation edits | Edits persist after navigation away and app restart | PASS | Verse/chapter editor state now saves to per-project draft storage and reloads on return. |
| T-03 | Review workflow navigation | Review flow opens and supports expected verse/project review actions | BLOCKED | Review queue now supports chapter/verse selection, status actions (approve/needs-work/pending), and review notes persistence; interactive parity sign-off still pending. |
| T-04 | Translation to review continuity | Data/state remains consistent when switching between screens | PASS | Shared `projectId` routing + shared draft loading maintain continuity between translate/review flows. |

## Print and Export Screen

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| X-01 | Open Print/Export screen | Screen loads without errors and exposes expected options | PASS | Screen loads and now exposes an active export dialog entry point. |
| X-02 | Export from Print/Export flow | Export output is created and matches legacy content expectations | BLOCKED | Print flow now opens export dialog, but manual artifact verification is still pending. |

## Settings, Profile, Updates, Legal

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| S-01 | Settings load | Settings screen loads and values are readable/editable | PASS | Settings screen loads and reads persisted `settings.json` when present. |
| S-02 | Settings persistence | Changed settings persist across app restart | PASS | Save path writes `settings.json`; persistence mechanism is present. |
| S-03 | Profile screen | Profile data loads and updates like legacy behavior | PASS | Profile now reads/writes `profile.json` and updates app context from persisted state. |
| S-04 | Updates screen | Updates screen loads and handles update checks safely | PASS | Updates screen now performs release checks against GitHub latest-release endpoint with safe error handling. |
| S-05 | Terms/legal screen | Terms/licensing content displays correctly | PASS | Terms screen renders legal summary content without runtime dependency. |

## Academy Window

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| A-01 | Open Academy window/content | Academy view opens and displays expected content | BLOCKED | Home screen now exposes Academy entry and sends `open-academy` IPC, but interactive behavior still needs validation. |
| A-02 | Academy navigation stability | Navigation in/out of academy does not destabilize main window | BLOCKED | Academy open path is re-enabled; stability behavior still requires interactive verification. |

## Gate 1 Exit Summary

- P0 blockers found: `0`
- P1 blockers found: `9`
- Overall Gate 1 readiness: `NOT READY`

P0 blockers tracked in this run:
- None
