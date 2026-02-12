# translationStudio Desktop Modernization Plan

Last updated: 2026-02-12 (Gate 3 first matrix evidence captured; CI remediation branch in progress)

## Objective

Deliver a modern Electron + React + TypeScript desktop app that behaves the same as legacy translationStudio across macOS, Windows, and Linux.

## Current Verified State

- `npm run build:dev` passes.
- `npm run build` passes.
- `npm run type-check` passes.
- `npm run start:safe` launches the app on macOS and reaches the main window.
- The React app now receives `window.electronAPI` during launch.
- New project flow merges cached resource containers and Door43 catalog resources.
- Door43 catalog discovery, manifest parsing, relation graphing, and TN/TWL/TW parsing are implemented.
- Project context persistence is wired (book/resource/support metadata).
- Translation screen preloads source text plus TN/TWL/TW support resources for Door43 catalog projects.
- Translation screen preloads source text plus TN/TWL/TW support resources for cached/local projects.
- Workflow parity operations are wired for backup import/export, print export access, academy launch entry, profile persistence, and update checks.
- Review workflow parity is expanded with chapter/verse queue actions, per-verse review status, reviewer notes, and review-draft persistence.
- Backup export/import now includes review draft payload (`review-draft.json`) in addition to translation draft payload.
- Scriptable gate and smoke commands are implemented and validated on macOS:
  - `npm run gate:check`
  - `npm run smoke:startup`
  - `npm run gate:macos`
- Gate validation now includes both downloader coverage and parity-evidence coverage:
  - `npm run gate:check` runs:
    - `npm run type-check`
    - `npm run lint` (warnings only; no errors)
    - `npm run build:dev`
    - `npm test -- __tests__/dcs-downloader.integration.test.js __tests__/macos-parity-evidence.integration.test.js --runInBand --watchman=false`
- Automated macOS click-through coverage now exists for previously blocked UI workflows via:
  - `npm run test:ui:macos`
  - `scripts/playwright-macos-clickthrough.js`
- Export path handling now supports absolute save targets through typed IPC (`fs:writeAbsoluteFile`) to match native save-dialog output paths.

Open risks still present:

- Lint debt is reduced to warnings, but a warning budget policy is not yet defined.
- Security posture for primary app windows is now hardened (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`); cross-platform verification remains pending.
- macOS parity evidence is now green, but Windows/Linux parity evidence is not yet established.
- Dependency risk remains high (legacy packages and known audit findings).

Current branch implementation status (`codex/g3-ci-run-evidence`):

- Gate 3 CI matrix branch (`codex/g3-ci-matrix-smoke`) has been merged to `master`.
- First cross-platform CI run after merge is complete:
  - GitHub Actions run id `21954395398`
  - Trigger: push to `master` on 2026-02-12T16:09:00Z
  - Result: `failure` (Windows lint CRLF issue, Linux startup sandbox issue)
- Remediations now implemented on this branch:
  - Windows: line-ending normalization step in CI + repository `.gitattributes` LF policy.
  - Linux: startup smoke runs with `TS_SMOKE_NO_SANDBOX=1` on Ubuntu CI, consumed by `scripts/smoke-startup.js`.
- Local validation after remediation passes:
  - `npm run lint`
  - `npm run smoke:workflows`
  - `npm run gate:check`
  - `npm run smoke:startup`

## Execution Strategy (Optimal Order)

This is a gate-based plan. We do not advance to the next gate until the current gate exit criteria are met.

## Branching Strategy

Use higher-level outcome branches. Each branch should close a related set of tasks (typically 2-5 checklist items), not just one small change.

Branch model:

- `master`: integration baseline, always merge-ready.
- `codex/g0-*`: Gate 0 stabilization work.
- `codex/g1-*`: Gate 1 macOS parity work.
- `codex/g2-*`: Gate 2 security hardening work.
- `codex/g3-*`: Gate 3 cross-platform CI/workflow work.
- `codex/g4-*`: Gate 4 release/distribution work.

Merge rules:

- One outcome theme per branch (multi-step, related scope).
- Rebase or merge latest `master` before final validation.
- Required pre-merge checks for every branch:
  - `npm run type-check`
  - `npm run build:dev`
  - Task-specific validation (for example CI workflow validation or smoke run)
- Merge using fast-forward when possible to keep history linear.

Planned near-term branches:

1. [x] `codex/g0-lint-remediation`
2. [x] `codex/g0-ci-lint-blocking`
3. [x] `codex/g0-ci-audit-check`
4. [x] `codex/g1-macos-parity-checklist`
5. [x] `codex/g1-import-export-parity`
6. [x] `codex/g1-door43-catalog-discovery`
7. [x] `codex/g1-door43-resource-schema`
8. [x] `codex/g1-core-translation-parity`

Planned next branches:

1. [x] `codex/g1-workflow-parity-ops`
   Scope: project lifecycle parity pass, import/export/print parity pass, academy entry flow, updates/profile parity closures.
2. [x] `codex/g0-smoke-and-gating-automation`
   Scope: scriptable macOS smoke run and repeatable gate-check execution support.
3. [x] `codex/g1-macos-parity-rerun`
   Scope: re-run and record updated macOS Gate 1 workflow evidence after recent parity implementations.
4. [x] `codex/g1-review-workflow-parity`
   Scope: close review workflow parity gap with actionable review queue behavior and persisted review outcomes.
5. [x] `codex/g1-playwright-clickthrough-validation`
   Scope: strengthen Gate 1 evidence with targeted automation and reduce manual-only verification surface.
6. [x] `codex/g2-typed-ipc-guardrails`
   Scope: begin Gate 2 by removing renderer-side direct Electron access patterns and adding migration guardrails.
7. [x] `codex/g3-ci-matrix-smoke`
   Scope: establish cross-platform CI matrix with startup + workflow smoke coverage for Gate 3.
8. [ ] `codex/g3-ci-run-evidence`
   Scope: capture first matrix run outcomes, apply CI remediations, and close first Windows/Linux Gate 3 evidence rerun.

### Gate 0: Stabilize Build and Runtime (Complete)

Goal: Keep local development and CI trustworthy.

Completed:

- [x] Resolve AJV/webpack dependency conflict.
- [x] Restore missing TypeScript service modules for import/export interfaces.
- [x] Fix renderer startup blockers (`sql.js` compatibility, preload behavior, screen update loop).
- [x] Align new repository DB path with legacy data location (`library/index.sqlite`).

Exit criteria:

- [x] Lint remediation branch reduces existing lint errors to a mergeable baseline.
- [x] CI enforces lint (remove `|| true`).
- [x] CI runs `type-check`, `lint`, and `build:dev` as hard blockers.
- [x] Basic startup smoke test is scriptable and repeatable.

### Gate 1: macOS Feature Parity (Highest Priority)

Goal: Match legacy behavior on macOS before platform expansion.

Scope:

- Project lifecycle: create, open, recent list, delete.
- Import/export: USFM and backup flows.
- Translation and review workflows.
- Print/export screen behavior.
- Settings/profile/updates/legal workflows.
- Academy window behavior.

Exit criteria:

- [x] Parity checklist exists and is versioned in repo.
- [x] Each macOS workflow marked Pass/Fail/Blocked with notes.
- [x] No P0/P1 functional regressions against legacy behavior.

Door43 alignment additions (required for parity):

- [x] Resource discovery uses Catalog API (`/api/v1/catalog/search`) with `stage=prod`, plus subject/language/owner filtering.
- [x] Manifest processing is content-structure based (not file-extension based), supporting RC and tool-generated formats.
- [x] Resource dependency loading follows `dublin_core.relation`.
- [x] TN/TWL TSV parsing aligns with current column schemas and `rc://` linking.
- [x] TW article loading supports `dict/bible/{kt,names,other}` organization.
- [x] Project creation persists selected book/resource metadata for preload-aware translation startup.
- [x] Translation screen preloads source + support resources for Door43 catalog-backed projects.
- [x] Translation screen preloads TN/TWL/TW support resources for cached/local-backed projects.

### Gate 2: Security Hardening

Goal: Move to modern Electron safety defaults without breaking parity.

Scope:

- Remove generic renderer `require` bridge.
- Ensure renderer code uses typed IPC only.
- Eliminate runtime renderer dependence on Node builtins.
- Flip browser window settings to:
  - `nodeIntegration: false`
  - `contextIsolation: true`
  - `sandbox: true`

Exit criteria:

- [x] App runs with secure defaults in dev mode.
- [x] Startup, import/export, and translation flows still pass parity checks.
- [x] Bundle/source guard exists to detect Node builtin reintroduction in renderer.

### Gate 3: Cross-Platform Validation (Windows + Linux)

Goal: Validate parity and stability outside macOS.

Scope:

- Expand CI matrix to `ubuntu-latest`, `macos-latest`, `windows-latest`.
- Add smoke flows per OS for app launch, open/save/import/export.

Exit criteria:

- [ ] CI matrix green on all three OSes.
- [ ] Workflow parity checklist includes Windows and Linux statuses.

### Gate 4: Release and Distribution

Goal: Produce production-ready artifacts and release flow.

Scope:

- Packaging strategy finalization (`electron-builder` vs retained flow).
- Signing/notarization implementation per platform.
- Release automation and artifact publication.
- Upgrade and migration documentation.

Exit criteria:

- [ ] Signed installers produced in CI.
- [ ] Release checklist is repeatable.
- [ ] Upgrade path from legacy builds documented and tested.

## Immediate Next Work (Recommended)

1. Push `codex/g3-ci-run-evidence` and run CI to verify Windows/Linux remediations.
2. Update `docs/cross-platform-parity-checklist.md` with rerun outcomes and Gate 3 readiness.
3. Merge `codex/g3-ci-run-evidence` after first all-green matrix run.

Progress update:

- `codex/g0-lint-remediation` and `codex/g0-ci-lint-blocking` are merged to `master`.
- `codex/g0-ci-audit-check` is merged to `master`.
- `codex/g1-macos-parity-checklist` is merged to `master`.
- `codex/g1-import-export-parity` is merged to `master`.
- `codex/g1-door43-catalog-discovery` is merged to `master`.
- `codex/g1-door43-resource-schema` is merged to `master`.
- `codex/g1-core-translation-parity` is merged to `master`.
- Project context persistence and translate preload wiring are merged to `master`.
- Cached/local TN/TWL/TW preload support is merged to `master`.
- `codex/g1-workflow-parity-ops` is merged to `master`.
- `codex/g0-smoke-and-gating-automation` is merged to `master`.
- `codex/g1-macos-parity-rerun` is merged to `master`.
- `codex/g1-review-workflow-parity` is merged to `master`.
- `codex/g1-playwright-clickthrough-validation` is merged to `master`.
- `codex/g2-typed-ipc-guardrails` is merged to `master`.
- `codex/g3-ci-matrix-smoke` is merged to `master`.
- `codex/g3-ci-run-evidence` is in progress.
- Gate 3 first matrix run evidence (`21954395398`) is recorded; remediation changes are implemented locally and awaiting CI rerun confirmation.
- macOS Gate 1 checklist execution run is recorded in `docs/macos-parity-checklist.md` (current result: `READY`).

Door43 2026 technical note:

- New implementation work must follow the current uW Tooling guides for resource structure and Door43 API workflows.

## Decision Log

- 2026-02-10: Prioritized gate-based execution over phase-only progression to avoid advancing with hidden regressions.
- 2026-02-10: Kept security hardening after parity proof to reduce risk of simultaneous behavioral and platform breakage.
- 2026-02-10: Chose macOS-first parity validation before cross-platform expansion, per requested testing order.
