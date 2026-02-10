# macOS Parity Checklist (Legacy tS vs Modern Build)

Last updated: 2026-02-10
Status scale: `PASS`, `FAIL`, `BLOCKED`, `NOT RUN`

## Test Setup

- Platform: macOS (current target for Gate 1).
- Legacy reference: original `unfoldingWord-dev/ts-desktop` desktop behavior.
- Modern reference: current branch build launched with `npm run start:safe`.
- Record exact notes for any behavior drift, even if minor.

## Project Lifecycle

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| P-01 | Create project from Home/New Project flow | Project is created and appears in project list without restart | NOT RUN | |
| P-02 | Open existing project | Existing project opens to expected working screen | NOT RUN | |
| P-03 | Recent projects list | Recent entries update after open/create and can be reopened | NOT RUN | |
| P-04 | Delete/remove project | Project removal updates list and does not corrupt remaining entries | NOT RUN | |

## Import and Export

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| I-01 | Import USFM project | Valid USFM imports successfully and appears as usable project | NOT RUN | |
| I-02 | Import error handling | Invalid/partial USFM shows actionable error and does not crash app | NOT RUN | |
| I-03 | Export USFM project | Export creates expected files and folder structure | NOT RUN | |
| I-04 | Backup export/import roundtrip | Backup export can be imported back with no major data loss | NOT RUN | |

## Translation and Review

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| T-01 | Open translation workspace | Selected project opens to translation screen with expected panes/content | NOT RUN | |
| T-02 | Save translation edits | Edits persist after navigation away and app restart | NOT RUN | |
| T-03 | Review workflow navigation | Review flow opens and supports expected verse/project review actions | NOT RUN | |
| T-04 | Translation to review continuity | Data/state remains consistent when switching between screens | NOT RUN | |

## Print and Export Screen

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| X-01 | Open Print/Export screen | Screen loads without errors and exposes expected options | NOT RUN | |
| X-02 | Export from Print/Export flow | Export output is created and matches legacy content expectations | NOT RUN | |

## Settings, Profile, Updates, Legal

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| S-01 | Settings load | Settings screen loads and values are readable/editable | NOT RUN | |
| S-02 | Settings persistence | Changed settings persist across app restart | NOT RUN | |
| S-03 | Profile screen | Profile data loads and updates like legacy behavior | NOT RUN | |
| S-04 | Updates screen | Updates screen loads and handles update checks safely | NOT RUN | |
| S-05 | Terms/legal screen | Terms/licensing content displays correctly | NOT RUN | |

## Academy Window

| ID | Workflow | Legacy Expected Behavior | Status | Notes |
|---|---|---|---|---|
| A-01 | Open Academy window/content | Academy view opens and displays expected content | NOT RUN | |
| A-02 | Academy navigation stability | Navigation in/out of academy does not destabilize main window | NOT RUN | |

## Gate 1 Exit Summary

- P0 blockers found: `0` (update after run)
- P1 blockers found: `0` (update after run)
- Overall Gate 1 readiness: `NOT READY`
