# Debug Session: cloud-run-startup
- **Status**: [OPEN]
- **Issue**: Cloud Run revision fails to start and bind the expected HTTP port for the backend container.
- **Debug Server**: Pending startup
- **Log File**: .dbg/trae-debug-log-cloud-run-startup.ndjson

## Reproduction Steps
1. Build the backend container image from `backend/Dockerfile`.
2. Run the image locally with Cloud Run-like environment variables, especially `PORT=8080`.
3. Observe whether the process starts, whether it binds `0.0.0.0:8080`, and whether `/health` responds.
4. Compare the actual runtime behavior with the current Docker `CMD`.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Container command path is wrong, so the runner never reaches the Nest app entrypoint. | Medium | Low | Pending |
| B | The app starts but binds the wrong host/port instead of `0.0.0.0:$PORT`. | Medium | Low | Pending |
| C | Startup exits before bind because env/config or Atlas connectivity fails during bootstrap. | High | Medium | Pending |
| D | `npm run start:prod` is the unstable part in Cloud Run, and direct `node dist/main` will behave more predictably. | Medium | Low | Pending |
| E | The final image is missing required runtime files, so the process cannot start correctly. | Low | Low | Pending |

## Log Evidence
- Cloud Run revision log shows the process starts with `npm start` and then runs `nest start`, not the Docker runner command.
- `backend/package.json` had `"start": "nest start"` while Docker used `npm run start:prod`.
- `backend/dist/main.js` exists in the build output, so the production entrypoint file is present.
- Post-fix local verification shows `npm start` now runs `node dist/main.js`.
- After the entrypoint correction, the next observed failure is Mongo connectivity (`ECONNREFUSED` / Atlas connectivity in other environments), which confirms the command mismatch and the database/runtime dependency are separate issues.

## Verification Conclusion
- Hypothesis A: Rejected. This is not a missing executable named `backend`.
- Hypothesis B: Inconclusive from Cloud Run alone, but the app code is already configured to bind `0.0.0.0` and read `PORT`.
- Hypothesis C: Still possible in some environments, especially when Atlas is unavailable, but it does not explain the `npm start` / `nest start` mismatch.
- Hypothesis D: Confirmed. Cloud Run is following the `start` script path, so aligning `start` with `node dist/main.js` is the minimal fix.
- Hypothesis E: Rejected. The built output contains `dist/main.js`.
