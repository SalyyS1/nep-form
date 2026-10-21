# Live curved text, outline and shadow

Status: DONE. Local-only; optional JSON extension, no schema/payment/deploy changes.

## Delivery

- Text inspector offers straight/up/down presets, signed curvature slider and precise number. Outline toggle/color/width; shadow toggle/color/opacity/blur/horizontal and vertical offset. Reset only effects, respect locked layers, visible touch controls and typed negative/decimal input handling.
- Shared renderer uses quadratic textPath per row, stroke behind fill and feDropShadow with bounded user-space region. IDs hex-encode Unicode layer IDs, avoiding injection and punctuation-normalization collisions. Duplicate layers get independent references. SVG1 and SVG2 fragment references supplied.
- Direct shirt, two-face preview and artwork use same renderer. Draft/save/reopen/cart/order/admin/restart preserve optional textEffects. Existing no-effect geometry/font/pricing unchanged. Effects stay inside one text layer, no extra layer fees.
- Documentation updated in setup guide, local API contract and design guidelines. Centered Studio preview dialog after visual inspection.

## Verification

- npm test:30/30 PASS. Includes strict effect validation/bounds/color/type rejection; effects only allowed on text; local safe IDs/multiline/Unicode/escaping/duplicate geometry; legacy text coordinates; real raster outline/shadow differences; private immutable order artwork identical after restart.
- npm run test:text-effects: PASS on final behavior. Real Chromium shirt-image pixel comparisons prove curve up/down and outline/shadow; multiline, reset/undo/lock, duplicate path IDs, sticker drag/composition, draft/save/reopen/export,375/768/1440. Typed negative precision value tested through actual sequential keystrokes. API3006/DB temporary, no live data writes.
- npm run test:studio: PASS, existing drag/undo/rotate/layer actions/uploads/two faces/login/save/cart/COD/admin pricing/artwork; isolated API3003/DB.
- npm run build, npm run lint, npm run typecheck: PASS. Largest app chunk290.67KB raw; Studio57.28KB raw; no size warnings.
- Native render checker375x812/768x1024/1440x900:0 errors,0 warnings. Browser checks expanded effect controls for overflow on all widths. Viewed real effect pane/mobile and two-shirt preview screenshots under outputs/nep-text-effects-{width}.png and outputs/nep-text-effects-shirt-preview.png.

## Evidence-based fixes/review

Inline review; no independent reviewer claimed. Preserved exact legacy linear font size/baseline/text-length formulas and shared renderer ownership. Confirmed bounded numeric data, safe hex colors, local-only path/filter URLs, duplicate IDs and immutable persistence. Improved number editing to preserve minus/decimal intermediate input until valid/blur, rather than snapping to zero while typing. New ranges have44px touch targets.

Two test-harness issues investigated rather than hidden: an unrestricted NaN regex matched embedded font base64, so numeric geometry checking moved to the rendered layer markup. Sharp/librsvg2.63.2 produced blank curved text even for a minimal textPath probe; native Chromium already rendered visible curves. Kept server raster tests for supported linear outline/shadow and retained real-browser pixel checks for both curve signs; no tests skipped or dependency installed to mask it. Compatibility limitation recorded in current docs. References: [SVG textPath](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/textPath), [feDropShadow](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDropShadow), [librsvg feature support](https://gnome.pages.gitlab.gnome.org/librsvg/devel-docs/features.html).

Visual rubric22/24: brief2 (practical/editorial/playful), hierarchy2, spacing2, alignment2 after centering preview, typography1 (compact helper copy), color2, depth2, states2, responsiveness1 (expanded inspector requires vertical scrolling on phone), slop2, copy2, craft2. Weak points improved: precise-input editing, full-size touch ranges, centered preview. Existing compact typography/long phone inspector remain deliberate workspace tradeoffs.

## Runtime

Stopped previous runtime, checkpointed DB backed up to work/backups/store-before-text-effects-20261019-202128.sqlite; restarted one UI5173/API3001 pair. Ownership in work/local-runtime.json, exec session91456 retained for user preview. Health {ok:true,mode:local}; temporary APIs3003/3006 closed. No schema or live account/order bulk mutations.

## Limits

SVG contains editable text and embedded fonts, not outlined printer glyph paths. Some rasterizers, including current Sharp/librsvg, do not render textPath; local app serves SVG directly and browser rendering is verified. Curvature fits the existing text area, each line independently; print-area clipping still applies at edges. Production print workflow remains separate.

Unresolved questions: none.
