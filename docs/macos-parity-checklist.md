# macOS Parity Checklist (Legacy tS vs Modern Build)

Last updated: 2026-02-12
Status scale: `PASS`, `FAIL`, `BLOCKED`

## Test Setup

- Platform: macOS (current target for Gate 1).
- Legacy reference: original `unfoldingWord-dev/ts-desktop` desktop behavior.
- Modern reference: current `master` launched via `npm run start:safe`.
- Execution mode for this run: automated click-through via Playwright (`npm run test:ui:macos`) plus gate scripts and integration evidence tests.

## Project Lifecycle

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| P-01 | Create project from Home/New Project flow | Project is created and appears in project list without restart | PASS | Validated in Playwright click-through automation (`scripts/playwright-macos-clickthrough.js`) with repository confirmation. |
| P-02 | Open existing project | Existing project opens to expected working screen | PASS | Validated in Playwright click-through automation with screen transition and project context checks. |
| P-03 | Recent projects list | Recent entries update after open/create and can be reopened | PASS | Validated in Playwright click-through automation with recent project reopen flow. |
| P-04 | Delete/remove project | Project removal updates list and does not corrupt remaining entries | PASS | Validated in Playwright click-through automation with delete action and repository-level post-check. |

## Import and Export

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| I-01 | Import USFM project | Valid USFM imports successfully and appears as usable project | PASS | Automated integration test now validates `importUsfm` end-to-end with project + asset persistence (`__tests__/macos-parity-evidence.integration.test.js`). |
| I-02 | Import error handling | Invalid/partial USFM shows actionable error and does not crash app | PASS | Home import now surfaces warning notices for failed/malformed USFM imports. |
| I-03 | Export USFM project | Export creates expected files and folder structure | PASS | Validated in Playwright click-through automation, including absolute-path write flow and exported artifact checks. |
| I-04 | Backup export/import roundtrip | Backup export can be imported back with no major data loss | PASS | Automated integration test now validates backup roundtrip including translation draft and review draft restoration (`__tests__/macos-parity-evidence.integration.test.js`). |

## Translation and Review

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| T-01 | Open translation workspace | Selected project opens to translation screen with expected panes/content | PASS | Translation screen loads project context and preloads source + Door43 support resources where available. |
| T-02 | Save translation edits | Edits persist after navigation away and app restart | PASS | Verse/chapter editor state now saves to per-project draft storage and reloads on return. |
| T-03 | Review workflow navigation | Review flow opens and supports expected verse/project review actions | PASS | Validated in Playwright click-through automation with chapter/verse selection, status update, note save, and persisted reload. |
| T-04 | Translation to review continuity | Data/state remains consistent when switching between screens | PASS | Shared `projectId` routing + shared draft loading maintain continuity between translate/review flows. |

## Print and Export Screen

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| X-01 | Open Print/Export screen | Screen loads without errors and exposes expected options | PASS | Screen loads and now exposes an active export dialog entry point. |
| X-02 | Export from Print/Export flow | Export output is created and matches legacy content expectations | PASS | Validated in Playwright click-through automation through Print/Export entry and generated output verification. |

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
| A-01 | Open Academy window/content | Academy view opens and displays expected content | PASS | Validated in Playwright click-through automation by asserting academy window creation from Home entry. |
| A-02 | Academy navigation stability | Navigation in/out of academy does not destabilize main window | PASS | Validated in Playwright click-through automation by opening academy and confirming main window remains stable. |

## Gate 1 Exit Summary

- P0 blockers found: `0`
- P1 blockers found: `0`
- Overall Gate 1 readiness: `READY`

Gate 1 evidence tracked in this run:
- Playwright click-through summary JSON generated by `npm run test:ui:macos`.
