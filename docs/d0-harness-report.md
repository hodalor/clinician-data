# D0 Full-Stack Harness Report

Overall: PASS

- PASS - Backend build
- PASS - Admin build
- PASS - Mobile analyze
- PASS - Backend D0 scenario harness

## Backend Scenarios

- PASS - 1. Four-device offline creation ends with exactly 40 unique PILOT records
- PASS - 2. Interrupted sync stays atomic and retry remains idempotent
- PASS - 3. Duplicate detection flags both records and surfaces them in the queue
- PASS - 4. Outcome-pending records move to Complete after the outcome arrives later
- PASS - 5. QC blind re-abstraction stays blind and reports mismatches correctly
- PASS - 6. QC correction return creates an audit trail and audit routes stay append-only
- PASS - 7. Locked records reject ordinary edits until PI reopens them with an audit reason
- PASS - 8. Device replacement leaves synced records untouched and lets the RA resume on the new device
- PASS - 9. Production export keeps PILOT and TRAINING out and preserves canonical columns

## Notes

- The detailed backend scenario report is stored at `backend/test-reports/d0-backend-scenarios-report.md`.
- In this sandbox, the Mongo shell prints a local log-file permission warning after the test run, but the nine D0 scenarios themselves completed successfully.
- The real Phase 3 pilot still requires human execution on real devices and real accounts. The runbook is in `docs/phase3-pilot-runbook.md`.
