Status: DONE
Summary: Delivered custom-first NẾP home/navigation with interactive shared-renderer shirts, moving fabric folds, GSAP scroll zoom/unfold/reveal, readywear secondary. Catalog hides custom bases and ao-custom; mobile category filter works.

Files changed:
- src/features/storefront/home-page.tsx
- src/features/storefront/catalog-page.tsx
- src/components/store-layout.tsx
- src/styles/custom-home.css

Validation:
- Narrow ESLint: PASS.
- npx tsc -b --pretty false: PASS before final visual refinements; final code also passed narrow ESLint.
- Bundled render-check page checks: 375/768/1440 all 0 errors, 0 warnings. A scratch copy adds CDP timeout/tracing only; page checks unchanged. One recapture interrupted by concurrent HMR, then remaining viewports rerun successfully.
- Dedicated Playwright: all 375/768/1440 no overflow or page errors; 4 readywear cards; actual shirt data URL changes with color/side controls; scroll changes computed stage transform; CTA hover changes transform; search and mobile menu open/close.
- Reduced-motion browser context: stage transform none before/after scroll; ambient animation none; folded-letter transforms none.
- Catalog: 12 readywear cards first page; mobile categories visible in modal; custom category hidden.
- Fixed observed issues: GSAP inline transform blocked CTA hover (clearProps); nth-child specificity defeated reduced-motion static letters; oversized desktop shirt; decorative contrast checker issue; room above Vietnamese folded-letter accent; mobile swatches minimum44px.

Evidence:
- work/render-custom-home/interaction-checks.json
- work/render-custom-home/final-check/*.png and render-report.json (latest JSON covers768/1440;375 earlier clean capture retained)
- outputs/nep-custom-home-375.png
- outputs/nep-custom-home-768.png
- outputs/nep-custom-home-1440.png

Visual rubric:23/24 (reviewed375/768/1440 screenshots).
| Item | Score | Evidence |
|---|---|---|
| Brief fidelity |2|Warm, personal, editorial; cream/ink/lime, NẾP fold signature|
| Hierarchy |2|Headline and studio CTA lead; readywear remains secondary|
| Spacing |2|Section rhythm and compact step groups|
| Alignment |2|Shared container edges, asymmetrical split layouts|
| Typography |1|Vietnamese display clear; secondary editorial labels intentionally small|
| Color |2|Lime on actions and shirt artwork; restrained neutral surfaces|
| Depth/shape |2|Flat hairline chrome with bounded garment shadows|
| States |2|Verified hover, selected swatches/tabs, focus/overlays|
| Responsiveness |2|Recomposes on mobile,44px controls,no overflow|
| Slop tells |2|No generic feature cards, invented statistics or testimonial blocks|
| Content |2|Specific Vietnamese customization copy and actual products|
| Craft |2|Unified icons, safe shared renderer, diacritics room|

Process cleanup: all worker browsers/checker processes closed. Root-owned runtime and Studio checker left untouched. Initial raw homepage checker stalled; its owned browser was closed via CDP and process exited. No runtime servers started by worker.

Concerns: none blocking. README.md and ~/.Codex/rules/development-rules.md absent; followed supplied rules and existing CSS. CSS import already present in main.tsx.
Unresolved questions: none.

Follow-up photo verification:
- Root spotted blank editorial image in checker1440 full-page screenshot.
- Cause verified: loading=lazy image not decoded during fast full-page capture (naturalWidth0 offscreen); real scrolling loads933x1400 WebP, displayblock/visibilityvisible/opacity1, visibly correct.
- No product code change needed. Re-captured all three user-facing outputs after scrolling into every image and awaiting decode(). Viewed final1440 image and editorial photo present.
- Evidence: work/render-custom-home/image-load-check.json; work/render-custom-home/photo-in-view-{375,768,1440}.png.
- Follow-up browser closed; root notified safe to restart runtime.
