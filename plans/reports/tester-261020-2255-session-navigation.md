# Session navigation browser verification

Status: DONE

Scope: isolated SQLite API on 127.0.0.1:3014, existing Vite on 5173, headless Microsoft Edge through Python Playwright. Only new browser test and API fixture authored; no app source changed by this worker.

## Baseline

Before the app fix, `python tests/browser/session-navigation.spec.py` exited 1. Login API returned 200 and bootstrap reported admin. Opening `/dang-nhap?tiep=/quan-tri/khuyen-mai` then stayed on the login URL; the expected admin navigation timed out after 10 seconds. Controller notified before app changes.

## Final validation

`python tests/browser/session-navigation.spec.py` exited 0 after the fix. Verified:

- Authenticated login URL returns to the requested promotions page; no login form remains.
- Reload, fresh same-context tab, and an external-origin link with target blank preserve admin access.
- UI logout updates three already-open protected tabs to login; anonymous bootstrap exposes no orders/addresses and admin API returns 401 without admin payload.
- UI login updates those signed-out login tabs without reload.
- Explicit account-switch URL keeps the form; switching to customer blocks admin UI and API (403), with no admin request from a newly opened customer tab.
- The blocked customer can use the switch-account link and return as admin to the intended page.
- Cookie changes outside SPA state reconcile on focus and pageshow.
- A real anonymous background bootstrap response held in flight cannot overwrite a newer completed foreground bootstrap from UI login when released late.
- A focus refresh waits behind a pending login bootstrap; after login completes, the queued background request can fail without discarding the authenticated snapshot or showing the global connection error.
- An aborted background bootstrap on focus keeps the Studio draft value and original editor DOM node mounted.
- Password reset while signed in invalidates the reset page and another protected tab to login; logging in with the new password succeeds and resynchronizes the protected tab.
- Mobile login at 390 x 844 has no horizontal overflow. No JavaScript page errors.

`node --check tests/server/session-browser-api.mjs` and `python -m py_compile tests/browser/session-navigation.spec.py` passed.

The first run of the additional reset coverage reached the account page after successful new-password login, then failed because its Email locator omitted the field's accessible help text. Corrected the test locator; the entire suite passed on rerun against the final source.

## Isolation and evidence

Fixture uses `NEP_SESSION_DB` under a temporary directory, `mailEnv: {}`, seeded local test accounts, and real API requests through a browser route proxy. No live store, live credentials, or external providers used. External HTML and network abort are controlled browser stimuli, not substitutes for application/API behavior.

Owned fixture PIDs 32532 (baseline), 32244 (main coverage), 21040 (extended coverage), 21952 (added reset/priority coverage), and 30052 (final full passing run) terminated in test cleanup. Final listener check: no port 3014; controller's Vite PID 32264 still serves 5173.

Ignored screenshots: `work/session-navigation/admin-new-tab.png`, `work/session-navigation/switch-account-mobile.png`.

Unresolved questions: none.
