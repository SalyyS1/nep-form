# Text, uploaded fonts and size advice

Status: DONE. Local-only delivery; no schema changes or production deployment.

## Result

- Text composer directly below sticker grid in Hình, reused in Chữ: content, font, color, live preview, add to current face.
- Upload TTF/OTF/WOFF/WOFF2. Max3 fonts, 512KiB/file, 1MiB combined; native FontFace parsing in browser, fontkit parsing on server. Font records live inside immutable designs and exported/private SVG. Existing designs stay compatible.
- Layer inspector lists uploaded fonts. Reducer-based history merges asynchronous upload completion into the latest draft; undo/redo/drag preserved.
- Size advisor in Studio and ready-made shirt pages: height/weight → shared demo chart → explicit apply. Invalid/out-of-chart and missing-size feedback, no smaller-size substitution. Selected-color inventory checked; Studio subtracts sibling cart quantities. Body measurements are cleared on dialog close, never sent to API.
- Updated setup guide and local API contract (custom request body now5MB).

## Evidence

- npm test:21/21 pass. Includes real TTF/WOFF2 parsing, malformed/oversize/ID/resource rejection, missing font reference, private saved font/order artwork after restart, size chart boundaries and invalid/missing sizes.
- npm run test:assistance: PASS. Font composer location, invalid/valid upload, browser-loaded font, undo/redo, draft/save/reopen/SVG preservation; size apply, decimal comma, invalid/outside values, reset on close, actual zero stock via isolated admin API; Studio/product and375/768/1440.
- npm run test:studio: PASS. Existing drag, rotation, layer actions, two-face preview, save/reopen, checkout/COD, admin pricing and artwork. Isolated API3003/DB.
- npm run lint and npm run build: PASS.
- Frontend render checker:0 errors,0 warnings at375x812,768x1024,1440x900. Viewed actual modal/composer and desktop screenshots. New dialog centered with margin:auto after visual inspection.
- Only test harness defect encountered: first run clicked mobile-only tabs at768px; corrected to existing599px CSS breakpoint. Subsequent runs passed, no weakened product assertions.

## Review

Inspected changed shared types/renderers, server validation/body limit, history/composer integration and both size-advisor placements. Fixed missing explicit string guard on font ID (regex alone coerces undefined). Safe generated CSS family, bounded embedded file formats, no remote URL/font-name interpolation. No remaining blocking finding in touched scope. FontKit force-parses metrics/layout/sample outlines; this is local app validation, not a full hostile-font sanitizer. Font fixtures exercise TTF/WOFF2; OTF/WOFF rely on supported native/fontkit parsers.

## Runtime

Stopped old runtime, copied checkpointed SQLite to work/backups/store-before-fonts-size-20261019-173403.sqlite, restarted one runtime. UI5173 PID17788; API3001 PID30272; runner26192. Health returns {ok:true,mode:local}; temporary API3003/3004 stopped. Live database not used by tests. Runtime session12501 left for user preview.

## Limits

Size chart remains explicitly demo, needs supplier garment measurements before sales. Uploaded font may lack Vietnamese glyphs; UI states this. SVG embeds fonts but does not outline text or establish print color profiles. Existing production deployment/SePay work remains outside this request.

Unresolved questions: none.
