# Cross-Platform Parity Checklist

Last updated: 2026-02-12
Status scale: `PASS`, `FAIL`, `BLOCKED`, `PENDING`

## Scope

Gate 3 tracks startup and core workflow parity on Windows and Linux after macOS Gate 1 completion.

## Startup and Core Flows

| ID | Workflow | macOS | Windows | Linux | Notes |
|---|---|---|---|---|---|
| C-01 | App startup smoke (`npm run smoke:startup`) | PASS | PENDING | PENDING | CI matrix now includes startup smoke on all three OSes. |
| C-02 | Build + typecheck + lint gate (`npm run gate:check`) | PASS | PENDING | PENDING | Gate check runs in cross-platform CI matrix. |
| C-03 | Open project + translation screen | PASS | PENDING | PENDING | Needs Windows/Linux execution evidence. |
| C-04 | Import/export basic flow | PASS | PENDING | PENDING | Needs Windows/Linux execution evidence. |
| C-05 | Review flow basic navigation | PASS | PENDING | PENDING | Needs Windows/Linux execution evidence. |

## Gate 3 Exit Summary

- macOS evidence: `READY` (from Gate 1)
- Windows evidence: `PENDING`
- Linux evidence: `PENDING`
- Gate 3 readiness: `NOT READY`
