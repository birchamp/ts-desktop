# translationStudio Desktop Modernization Plan

Last updated: 2026-02-11 (post Gate 1 checklist execution)

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

Open risks still present:

- Lint debt is reduced to warnings, but a warning budget policy is not yet defined.
- Security posture is intentionally permissive (`nodeIntegration: true`, `contextIsolation: false`) while migration continues.
- Feature parity is not yet proven with executed workflow results (checklist exists, but entries are still `NOT RUN`).
- Gate 1 checklist execution identified multiple P0/P1 blockers; Gate 1 remains `NOT READY`.
- Dependency risk remains high (legacy packages and known audit findings).
- Translation workflow parity is incomplete (no verse-level navigation/editor persistence parity yet).
- Cached-resource support-resource preloading parity (TN/TWL/TW) is not complete.
- Basic startup smoke test is not yet scriptable/repeatable.

## Execution Strategy (Optimal Order)

This is a gate-based plan. We do not advance to the next gate until the current gate exit criteria are met.

## Branching Strategy

Use short-lived, goal-specific branches and merge only after gate checks pass.

Branch model:

- `master`: integration baseline, always merge-ready.
- `codex/g0-*`: Gate 0 stabilization work.
- `codex/g1-*`: Gate 1 macOS parity work.
- `codex/g2-*`: Gate 2 security hardening work.
- `codex/g3-*`: Gate 3 cross-platform CI/workflow work.
- `codex/g4-*`: Gate 4 release/distribution work.

Merge rules:

- One objective per branch.
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

Planned next branches:

1. [ ] `codex/g1-translation-navigation`
2. [ ] `codex/g1-translation-save-persistence`
3. [ ] `codex/g1-cached-support-preload`
4. [ ] `codex/g1-macos-parity-execution`
5. [ ] `codex/g0-startup-smoke-script`

### Gate 0: Stabilize Build and Runtime (In Progress)

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
- [ ] Basic startup smoke test is scriptable and repeatable.

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
- [ ] No P0/P1 functional regressions against legacy behavior.

Door43 alignment additions (required for parity):

- [x] Resource discovery uses Catalog API (`/api/v1/catalog/search`) with `stage=prod`, plus subject/language/owner filtering.
- [x] Manifest processing is content-structure based (not file-extension based), supporting RC and tool-generated formats.
- [x] Resource dependency loading follows `dublin_core.relation`.
- [x] TN/TWL TSV parsing aligns with current column schemas and `rc://` linking.
- [x] TW article loading supports `dict/bible/{kt,names,other}` organization.
- [x] Project creation persists selected book/resource metadata for preload-aware translation startup.
- [x] Translation screen preloads source + support resources for Door43 catalog-backed projects.
- [ ] Translation screen preloads TN/TWL/TW support resources for cached/local-backed projects.

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

- [ ] App runs with secure defaults in dev mode.
- [ ] Startup, import/export, and translation flows still pass parity checks.
- [ ] Bundle guard exists to detect Node builtin reintroduction in renderer.

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

1. Execute `docs/macos-parity-checklist.md` and fill Pass/Fail notes for all Gate 1 workflows.
2. Implement verse/chapter navigation state and book-aware pane filtering in translation workflow.
3. Implement target editor write/save/reload persistence and validate continuity between Translate and Review.
4. Complete cached-resource support preloading (TN/TWL/TW) for parity with Door43 catalog-backed flows.
5. Add an initial scriptable macOS smoke test (launch + create/open + translate screen load).

Progress update:

- `codex/g0-lint-remediation` and `codex/g0-ci-lint-blocking` are merged to `master`.
- `codex/g0-ci-audit-check` is merged to `master`.
- `codex/g1-macos-parity-checklist` is merged to `master`.
- `codex/g1-import-export-parity` is merged to `master`.
- `codex/g1-door43-catalog-discovery` is merged to `master`.
- `codex/g1-door43-resource-schema` is merged to `master`.
- Project context persistence and translate preload wiring are merged to `master`.
- macOS Gate 1 checklist execution run is recorded in `docs/macos-parity-checklist.md` (current result: `NOT READY`).

Door43 2026 technical note:

- New implementation work must follow the current uW Tooling guides for resource structure and Door43 API workflows.

## Decision Log

- 2026-02-10: Prioritized gate-based execution over phase-only progression to avoid advancing with hidden regressions.
- 2026-02-10: Kept security hardening after parity proof to reduce risk of simultaneous behavioral and platform breakage.
- 2026-02-10: Chose macOS-first parity validation before cross-platform expansion, per requested testing order.
