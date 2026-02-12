# Cross-Platform Parity Checklist

Last updated: 2026-02-12
Status scale: `PASS`, `FAIL`, `BLOCKED`, `PENDING`

## Scope

Gate 3 tracks startup and core workflow parity on Windows and Linux after macOS Gate 1 completion.

## Startup and Core Flows

| ID | Workflow | macOS | Windows | Linux | Notes |
|---|---|---|---|---|---|
| C-01 | App startup smoke (`npm run smoke:startup`) | PASS | PASS | PASS | Run `21963029888` passed startup smoke on all OSes after Linux CI `TS_SMOKE_NO_SANDBOX=1` mitigation. |
| C-02 | Build + typecheck + lint gate (`npm run gate:check`) | PASS | PASS | PASS | Run `21963029888` passed lint/build/typecheck on all OSes after Windows line-ending normalization and `.gitattributes` enforcement. |
| C-03 | Open project + translation screen | PASS | PASS | PASS | `npm run smoke:workflows` passed on all OSes in run `21963029888`. |
| C-04 | Import/export basic flow | PASS | PASS | PASS | `npm run smoke:workflows` passed on all OSes in run `21963029888`. |
| C-05 | Review flow basic navigation | PASS | PASS | PASS | `npm run smoke:workflows` passed on all OSes in run `21963029888`. |

## Gate 3 Exit Summary

- macOS evidence: `READY` (from Gate 1)
- Windows evidence: `READY`
- Linux evidence: `READY`
- Current CI matrix run: `success` (GitHub Actions run `21963245227`, started 2026-02-12T20:33:34Z, completed 2026-02-12T20:36:36Z; confirms passing PR run `21963029888`)
- Gate 3 readiness: `READY`
