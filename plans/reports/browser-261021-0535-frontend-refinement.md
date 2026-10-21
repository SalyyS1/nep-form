# Frontend browser verification

Status: DONE

- Owned test changes: `tests/browser/home-motion.spec.py`, `tests/browser/support-popup.spec.py`. Runtime implementation remained with the homepage/support owners.
- Runner: Python 3.12 Playwright, installed Microsoft Edge, headless, real temporary SQLite APIs. No live database, credentials or mail used.
- `python tests/browser/home-motion.spec.py` — PASS, final quiet run across 375/768/1440; reduced-motion375. Fifteen distinct loaded font families; actual Vietnamese specimens; right-to-left movement with and without scrolling; pause and explicit resume while pointer/focus stay on Play. Six real catalog templates (`own`, `retro-slow`, `afterhours`, `cat-day`, `wildflower`, `weekend`) render distinct front/back SVGs simultaneously. Automatic changes, all manual selectors, pause, hidden-tab/offscreen guards, reduced-motion manual selection, no horizontal overflow/page errors, Studio navigation and return without stale pin markup.
- `python tests/browser/support-popup.spec.py` — PASS after final guest mounting fix. Guest wrong-password feedback and successful inline sign-in preserve storefront URL; composer focuses. Closing clears guest credentials and unmounts the form; ordinary sign-in has exactly one Email. Customer sends and admin selects/replies through popup without navigation. Drafts survive close/back; failed sends retain text/error; inactive/closed/hidden conversations stop polling/read requests; customer history persists. Popup controls fit320/375/768/1440.
- Mobile admin popup375 and dual-face375/768 screenshots inspected visually: legible messages/composer and both garment faces, no horizontal clipping.

Evidence: `work/frontend-refinement/motion/report.json`, `work/frontend-refinement/motion/fonts-{375,768,1440}.png`, `work/frontend-refinement/motion/two-faces-{375,768,1440}.png`, `work/frontend-refinement/motion/reduced-motion-375.png`, `work/frontend-refinement/support/admin-popup-{320,375,768,1440}.png`, `work/frontend-refinement/support/customer-popup-{320,375,768}.png`.

Earlier development runs overlapped Vite HMR. Observed source updates at05:49:27(home components),05:50:12(info page),05:53:00(guest popup fix); one run observed section temporarily absent, another navigation to `/` reset template/pause state. Diagnostic capture showed zero page errors and intact homepage. This did not reproduce in the final quiet complete run; no product fix claimed from reruns. Hidden-admin polling boundary also initially counted a request already initiated by reselect; waiting for that selection's network idle before simulating hidden state removed the false positive.

Processes: strict owned Vite command `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort`, PID36200/tool session22756, workspace`t`; stopped after controller completed render checks. Normal taskkill reported this process required `/F`; targeted force termination succeeded. Support API3011 and motion API3013 started with unique temporary SQLite directories and stopped in test finally blocks. Final check:5173/3011/3013 free. Controller owns production build, live/hosted validation and fixture3001.

Unresolved questions: none.
