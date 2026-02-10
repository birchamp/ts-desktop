# translationStudio Desktop Modernization Plan

Last updated: 2026-02-10

## Objective

Deliver a modern Electron + React + TypeScript desktop app that behaves the same as legacy translationStudio across macOS, Windows, and Linux.

## Current Verified State

- `npm run build:dev` passes.
- `npm run build` passes.
- `npm run type-check` passes.
- `npm run start:safe` launches the app on macOS and reaches the main window.
- The React app now receives `window.electronAPI` during launch.
- New project resource listing is wired to cached resource containers in user data.

Open risks still present:

- CI lint is non-blocking (`npm run lint || true`).
- Security posture is intentionally permissive (`nodeIntegration: true`, `contextIsolation: false`) while migration continues.
- Feature parity is not yet proven with a formal workflow checklist.
- Dependency risk remains high (legacy packages and known audit findings).

## Execution Strategy (Optimal Order)

This is a gate-based plan. We do not advance to the next gate until the current gate exit criteria are met.

### Gate 0: Stabilize Build and Runtime (In Progress)

Goal: Keep local development and CI trustworthy.

Completed:

- [x] Resolve AJV/webpack dependency conflict.
- [x] Restore missing TypeScript service modules for import/export interfaces.
- [x] Fix renderer startup blockers (`sql.js` compatibility, preload behavior, screen update loop).
- [x] Align new repository DB path with legacy data location (`library/index.sqlite`).

Exit criteria:

- [ ] CI enforces lint (remove `|| true`).
- [ ] CI runs `type-check`, `lint`, and `build:dev` as hard blockers.
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

- [ ] Parity checklist exists and is versioned in repo.
- [ ] Each macOS workflow marked Pass/Fail with notes.
- [ ] No P0/P1 functional regressions against legacy behavior.

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

1. Make CI truthful by enforcing lint failures.
2. Create a concrete parity checklist from legacy workflows and support docs.
3. Validate and close obvious import/export functional gaps behind the new service layer.
4. Add initial macOS smoke script to automate launch and core navigation checks.

## Decision Log

- 2026-02-10: Prioritized gate-based execution over phase-only progression to avoid advancing with hidden regressions.
- 2026-02-10: Kept security hardening after parity proof to reduce risk of simultaneous behavioral and platform breakage.
- 2026-02-10: Chose macOS-first parity validation before cross-platform expansion, per requested testing order.
