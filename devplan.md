# Modernization Plan: translationStudio Desktop

## Vision
Bring translationStudio Desktop to a maintainable, secure, and performant Electron + React + TypeScript application while preserving existing user workflows across macOS, Windows, and Linux.

---

## Phase 0 – Baseline Snapshot ✅
- **Electron shell runs** on current tooling (Webpack bundle, legacy preload) and renders new React dashboard.
- **TypeScript + React scaffold** exists in `src/` with context/state helpers.
- **Webpack build** produces `dist/js/bundle.js`; legacy Polymer bundle still ships inside `dist/`.
- **Testing/QA status**: Jest wiring exists but suites are stale; no automated end-to-end coverage.

> Status: Completed. We can launch the app after splash and verify the new dashboard renders.

---

## Phase 1 – Foundation Hardening (in progress)
Goal: Stabilize the developer experience, ensure repeatable builds, and reintroduce core Electron security patterns.

1. **TypeScript & Build Health**
   - ✅ `tsconfig.json` and webpack-based pipeline in place.
   - ✅ Local `npm run build:dev` and `npm run type-check` succeed (2025‑09‑17).
   - ✅ CI workflow (`.github/workflows/ci.yml`) runs type-check, lint, and build on pushes/PRs.
2. **Coding Standards & Tooling**
   - ✅ ESLint/Prettier configs exist; integrate with npm scripts.
   - ✅ Lightweight git hook (`scripts/install-hooks.js`) enforces type-check + build before commit.
3. **Electron Security Pass**
   - ⚠️ `nodeIntegration` temporarily enabled; plan to restore `contextIsolation` + secure preload once React migration is complete.
   - ✅ Documented current IPC surface and Node dependency audit (`docs/electron-security-audit.md`).
   - ✅ Replaced `window.electronAPI` usage with typed IPC helpers; documented remaining Node builtins (`docs/webpack-node-audit.md`).
4. **Build Artifacts & Packaging**
   - 🔁 Defer removal of legacy `bower/gulp` tooling to Phase 3 when feature parity is closer.
   - 🔁 Evaluate packaging upgrade (electron-packager → electron-builder) during Phase 5 deployment work.

> Status: Active. Next actionable: keep foundation green by restoring the missing `HomeScreen` component so webpack builds succeed, then enable continuous type-check/lint runs.

---

## Phase 2 – UI Migration to React ✅
Goal: Replace Polymer/custom elements with React + MUI counterparts while maintaining functionality.

1. **Component Inventory**
   - ✅ `component-inventory.md` kept current with Polymer → React mapping and status.
2. **Navigation & Shell**
   - ✅ React `Dashboard` now includes sidebar navigation (`Sidebar.tsx`) and status reporting.
3. **Screen Conversion**
   - ✅ Home, New Project, Translation, Review, Settings, Profile, Print, Updates, and Terms screens migrated to React components.
4. **State & Data Flow**
   - ✅ Route transitions update global screen context; project/recent helpers integrated with new screens.
5. **Styling & Theming**
   - ✅ Core layout uses MUI components; remaining legacy CSS earmarked for future polish.

---

## Phase 3 – Services & Data Modernization
Goal: Type-safe access to filesystem, databases, and integrations.

1. **IPC & Preload APIs**
   - ⬜ Define typed interfaces for dialog, filesystem, network requests.
   - ⬜ Move ad-hoc `require('electron')` usage to preload bridges; re-enable `contextIsolation`.
2. **Database Layer**
   - ⬜ Finish TypeScript wrappers for `sql.js` (currently partial in `utils/database.ts`).
   - ⬜ Migrate migration scripts and ensure schema versioning.
3. **Import/Export & Git**
   - ⬜ Port exporter/importer/Git logic to TypeScript modules, surface via hooks/services.
4. **Resource Packaging**
   - ⬜ Replace manual `door43-client` scripts with typed task runners.

---

## Phase 4 – Quality & Automation
Goal: Confidence through automated validation.

1. **Unit & Integration Tests**
   - ⬜ Update Jest config for React 18 + TS; add React Testing Library coverage for critical components.
2. **End-to-End Tests**
   - ⬜ Evaluate Playwright or Spectron successor (e.g., `@playwright/test` + Electron).
3. **Static Analysis**
   - ⬜ Hook ESLint, Prettier, and TypeScript into CI.
4. **Performance Budgets**
   - ⬜ Track bundle size, startup time, and memory usage across platforms.

---

## Phase 5 – Release & Distribution
Goal: Ship a production-ready multi-platform build.

1. **Packaging & Updates**
   - ⬜ Adopt `electron-builder` or maintain `electron-packager` scripts with signing/notarization steps.
   - ⬜ Integrate auto-update (Squirrel, Electron-updater, or custom).
2. **Release Automation**
   - ⬜ GitHub Actions workflow for lint/test/build/package on tags.
3. **Documentation**
   - ⬜ Update README, contributor guide, migration docs, and release notes templates.

---

## Current Position
- **Phase**: Early **Phase 1 – Foundation Hardening**.
- **Immediate focus**: Keep TypeScript/Webpack builds passing, then tighten Electron security posture once React migration reduces direct Node dependencies.

## Next Action Checklist
1. ✅ Recreate missing `HomeScreen.tsx` so webpack builds pass again.
2. ✅ Run `npm run build:dev` / `npm run type-check`; tracked fixes for `usfm-js` typings.
3. ✅ Audit referenced screens (`Home`, `NewProject`, `Translation`, `Settings`) and confirm exports.
4. ✅ Document security debt (see `docs/electron-security-audit.md`) and schedule mitigation in Phase 3 backlog.
5. ✅ Finish migrating React utilities to the typed IPC wrapper (dialog/files now consume it; remaining helpers validated).
6. ✅ Evaluate remaining webpack externals that force Node builtins and plan shims (`docs/webpack-node-audit.md`).
