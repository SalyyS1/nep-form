# Automatic font and garment previews

Status: DONE

Updated `tests/browser/home-motion.spec.py` for the corrected behavior. Removed the old six-button manual-selection assumption; the new regression holds the pointer over each preview and requires automatic playback without selecting any design.

`python tests/browser/home-motion.spec.py` — PASS on Microsoft Edge/Playwright at375/768/1440, plus reduced-motion375. Final run followed source freeze without intermediate workspace writes.

- All15 actual loaded font families render the Vietnamese specimen. The strip moves right to left under a stationary pointer, with and without scroll; explicit Pause/Play works with retained pointer/focus.
- Without clicking a design selector, all six real templates automatically appear and return to the first: own → retro-slow → afterhours → cat-day → wildflower → weekend → own. First observed change occurs within5s at every width. Both outgoing/incoming scenes have intermediate opacity during the650ms crossfade.
- Each active scene shows distinct front/back garment renderer SVGs, fully in the viewport and side by side. Normal mode contains no large selector grid or interactive progress buttons.
- At1440, title/copy bounds are left of both shirts and vertically overlap them. Screenshot capture measures section height661.33px; title width396.80px; each garment image about413.60×438.86px. Mobile375 screenshot inspected: two shirts and labels/current design/pause fit the compact section.
- Explicit pause, resume, hidden-tab pause, offscreen pause and Studio route cleanup pass. Reduced motion defaults static; manual next stays static; explicit opt-in enables the font strip and automatic garment changes under the pointer.
- No browser page errors or horizontal overflow at tested widths.

Evidence:

- `work/autoplay-showcase/motion/report.json`: complete font/template/timing evidence for375/768/1440 and reduced motion.
- `work/autoplay-showcase/motion/showcase-section-1440.png`: settled full section, captured after real autoplay and explicit pause; visually inspected title-left/two-shirts-right composition.
- `work/autoplay-showcase/motion/section-layout-1440.json`: measured section/title/front/back bounds.
- `work/autoplay-showcase/motion/two-faces-{375,768,1440}.png`, `fonts-{375,768,1440}.png`, `reduced-motion-375.png`.

Process ownership: free ports checked first. Owned strict Vite command `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort`, PID24236, tool session59719, workspace`t`; stopped after controller render checks. Normal taskkill required `/F`; targeted force termination succeeded. Motion suite and post-pass screenshot used temporary SQLite API3013, each stopped in finally. Final cleanup verified5173/3013 free and Vite tool session exited. No production data, environment files, mail or credentials used. Controller owns global lint/build, render checker and deployment.

Unresolved questions: none.
