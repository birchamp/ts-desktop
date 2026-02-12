# Cross-Platform Parity Checklist

Last updated: 2026-02-12
Status scale: `PASS`, `FAIL`, `BLOCKED`, `PENDING`

## Scope

Gate 3 tracks startup and core workflow parity on Windows and Linux after macOS Gate 1 completion.

## Startup and Core Flows

| ID | Workflow | macOS | Windows | Linux | Notes |
|---|---|---|---|---|---|
| C-01 | App startup smoke (`npm run smoke:startup`) | PASS | PENDING | FAIL | Run `21954395398`: Linux startup failed due Electron sandbox helper requirements. CI mitigation now added (`TS_SMOKE_NO_SANDBOX=1` on Ubuntu). |
| C-02 | Build + typecheck + lint gate (`npm run gate:check`) | PASS | FAIL | PASS | Run `21954395398`: Windows lint failed from CRLF checkout (`Delete ␍` Prettier errors). CI mitigation now added (Windows line-ending normalization + `.gitattributes`). |
| C-03 | Open project + translation screen | PASS | PENDING | PASS | Linux workflow smoke passed in run `21954395398`; Windows workflow smoke was skipped after lint failure. |
| C-04 | Import/export basic flow | PASS | PENDING | PASS | Linux workflow smoke passed in run `21954395398`; Windows workflow smoke was skipped after lint failure. |
| C-05 | Review flow basic navigation | PASS | PENDING | PASS | Linux workflow smoke passed in run `21954395398`; Windows workflow smoke was skipped after lint failure. |

## Gate 3 Exit Summary

- macOS evidence: `READY` (from Gate 1)
- Windows evidence: `PENDING` (lint gate fixed locally, rerun pending)
- Linux evidence: `PENDING` (startup smoke fix committed locally, rerun pending)
- Current CI matrix run: `failed` (GitHub Actions run `21954395398`, started 2026-02-12T16:09:00Z, completed 2026-02-12T16:12:31Z)
- Gate 3 readiness: `NOT READY`
