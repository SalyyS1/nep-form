# Editable sticker and shirt-template library

Status: DONE. Local implementation; no schema/payment/production deployment changes.

## Result

-48 original vector stickers (42 added; six original IDs/paths retained), eight per style.24 layered templates (21 added; original3 preserved), four per style. Shared styles: Tối giản, Đường phố, Retro, Dễ thương, Thiên nhiên, Du lịch.
- Search insensitive to Vietnamese accents and Đ/đ, style filters, counts, load-more and empty states. Featured first page mixes styles. Artwork thumbnails use the real layered SVG and bundled Vietnamese fonts.
- Template dialog previews current shirt/color/face or flat artwork. Quick-edit each text line and choose original/dark/olive/terracotta/light ink palette. Apply as editable layers with fresh IDs; append preserves existing work, explicit replace changes only active face. One-step undo;20-layer limit never trims silently.
- Sticker shapes inherit validated primary fill/currentColor stroke. Static allowlisted paths, no arbitrary SVG upload. Pricing, account ownership, stock and immutable order-design references unchanged.
- Prevented Studio keyboard shortcuts from changing background layers while a native dialog is open. Documentation updated at setup guide, API contract and design guidelines.

## Evidence

- npm test:26/26 PASS. New tests verify counts/style distribution, safe original paths, render every48 vectors and24 artworks through Sharp, template geometry/font IDs, independent layer IDs/recolor/search. HTTP test verifies edited text/new sticker IDs on both faces persist through save/cart/order/restart and remain private.
- npm run test:library: PASS on final code. Styles/search/load-more, live text/palette, shirt/artwork preview, append/replace/undo, other-face retention,19+2 layer rejection, background keyboard isolation, save/reopen,375/768/1440; isolated API3005 and temporary DB.
- npm run test:studio: PASS. Updated intentional new preview→Dùng mẫu này step, preserved old template counts/drag/undo/rotate/layer actions/two faces/login/save/cart/COD/admin/artwork; isolated API3003/DB.
- npm run test:assistance: PASS. Existing text/font-upload/size flows and composer immediately below sticker grid preserved; isolated API3004/DB.
- npm run lint and npm run build: PASS on final revision. Largest app chunk290.67KB raw, Studio52.86KB raw; no build size warning.
- Native render checker375x812/768x1024/1440x900:0 errors,0 warnings. Visually inspected gallery, sticker grid, large desktop preview and mobile preview. Outputs: nep-template-library-{width}.png, nep-template-preview-{width}.png, nep-sticker-library-{width}.png.

## Review and fixes

Inline review, no independent review claimed. Handler initially named useTemplate triggered hook naming lint; renamed applyTemplate. First browser run exposed exact-label ambiguity: native label textContent included initial textarea value (Dòng chữ1chậm), although accessibility tree showed correct textbox name. Added explicit aria-labels to dynamic text fields; reran full scenario successfully. Review also found global Delete/arrow shortcuts could affect selected background layer inside the new modal; now all native open dialogs block Studio shortcuts, verified with Delete regression assertion. Reused existing per-font lazy loader instead of bundling font data again. No remaining blocking finding in reviewed scope.

Visual rubric22/24: brief2 (playful/editorial/practical), hierarchy2 (artwork and clear use action), spacing2 (grid and dialogue rhythm), alignment2, typography1 (tiny detailed thumbnail copy; full preview provided), color2 (neutral chrome, palette in artwork), depth2 (hairlines), states2, responsiveness1 (mobile quick-edit dialog scrolls vertically for preview and fields), slop2 (original motif/type combinations), copy2 (Vietnamese style labels and instructions), craft2. Improvements: mixed featured first page, proper preview/type rendering instead of generic cards, clear append/replace and undo feedback.

## Local operation

Stopped previous runtime, checkpointed SQLite copied to work/backups/store-before-studio-library-20261019-194259.sqlite. Restarted one local UI5173/API3001; runtime ownership recorded in work/local-runtime.json and exec session52147 retained. Health returns {ok:true,mode:local}; temporary test APIs closed. No live account/order/catalog writes by tests.

## Limits

Existing2D print-preview/embedded-font SVG limitations remain; production print dimensions/colors reviewed by shop. Sticker paths/IDs should remain stable across future library additions. Some motifs have paper-color negative details in addition to editable primary ink. No Canva assets or external asset dependency introduced.

Unresolved questions: none.
