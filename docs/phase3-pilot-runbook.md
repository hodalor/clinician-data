# Phase 3 Pilot Runbook

This pilot must start only after `D0` passes.

## Before The Pilot

1. Run the automated preflight:

```bash
cd /Users/macbook/Documents/projects/ReactJS/seu/backend
npm run test:d0
```

2. Confirm all four RA devices are configured for `PILOT` mode.
3. Confirm each RA device is registered to a real RA account, not a test account.
4. Confirm the PI and QC accounts can log in to the admin app.
5. Confirm the backend and admin app are running and reachable.

## Pilot Execution

1. Assign 15-20 real pilot-safe ED presentations through the normal assignment workflow.
2. Split the work across the four real RA devices.
3. Require at least one fully offline entry per RA, then sync later.
4. Ask the PI to assign at least 2 records to QC for blind re-abstraction.
5. Ask the PI to review the Dashboard, Progress, and Missingness pages daily.
6. Record every confusion point, unclear label, and extra click reported by the team.
7. At pilot close, run the export checks:
   - PRODUCTION-filtered export contains no `PILOT` records
   - Codebook still matches the data dictionary
   - QC agreement numbers look sensible

## Defect And Friction Log

Capture each item with:

- date
- role
- screen
- action being attempted
- what was confusing or broken
- impact
- suggested fix

## Gate To Phase 4

Move to Phase 4 only after:

1. D0 remains green.
2. Pilot feedback has been reviewed.
3. Pilot defects and friction points have been sent back as bug-fix prompts.
4. The PI signs off that the workflow is simple enough for daily use.
