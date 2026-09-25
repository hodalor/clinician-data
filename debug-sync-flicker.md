# Debug Session: sync-flicker
- **Status**: [OPEN]
- **Issue**: Sync Status screen flickers and synced records fail with `verified_by: type did not match` / `verified_by must be of type: objectId`.
- **Debug Server**: http://172.20.10.10:7777/event
- **Log File**: .dbg/trae-debug-log-sync-flicker.ndjson

## Reproduction Steps
1. Open the Android app with completed records pending sync.
2. Navigate to Sync Status.
3. Tap `Sync now`.
4. Observe page flicker and per-record sync failures mentioning `verified_by`.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Mobile sync payload is sending `verified_by` as an empty string or non-ObjectId value for completed records. | High | Low | Rejected by current payload mapper: outcome payload only includes `outcome24`, `outcome_datetime`, and `outcome_source`. |
| B | Backend sync normalization preserves client-sent `verified_by` instead of clearing or coercing it for RA-submitted records. | High | Low | Confirmed: `upsertOutcome()` writes `verified_by: null` while Mongo validator requires `objectId` if field exists. |
| C | Sync Status flicker is caused by repeated provider invalidation / polling loops during sync state updates. | Medium | Medium | Pending instrumentation from `sync_providers.dart` and `sync_status_screen.dart`. |
| D | Retry button and auto-refresh are both triggering overlapping sync runs, causing the visible flicker. | Medium | Medium | Pending instrumentation; current code has an overlap guard but runtime evidence is still needed. |
| E | Local database rows already contain invalid QC fields from an older app version, and each retry resubmits them unchanged. | Medium | Medium | Rejected by current payload mapper; no QC verification fields are emitted from the mobile sync payload. |

## Log Evidence
- Screenshot/runtime evidence from device shows `verified_by: type did not match` and `verified_by must be of type: objectId`.
- `mobile/lib/features/abstraction/utils/record_payload_mapper.dart` does not include `verified_by` in the mobile outcome payload.
- `backend/src/modules/sync/sync.service.ts` currently sets `verified_by: null`.
- `backend/src/common/database/collection-definitions.ts` requires `verified_by` to be `objectId` when present.

## Verification Conclusion
- Root cause for sync failure is confirmed in backend outcome upsert.
- Flicker remains under investigation with instrumentation retained.
