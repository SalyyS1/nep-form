# Vietnamese font library and expressive storefront

Status: DONE. Scope local preview; no production/payment/schema changes.

## Delivered

-15 curated Vietnamese typefaces: existing Be Vietnam Pro plus14 OFL font subsets from Google Fonts. Source hashes, actual weights, modifications and licenses in data/studio-font-manifest.json. Renamed internal font families preserve OFL reserved-name boundaries. Upper/lower Vietnamese glyph coverage verified mechanically for all15.
- Shared preview picker in new text composer and layer inspector: live sample of typed text, style groups, search, selected/disabled/empty/loading feedback. Two legacy system families and customer-uploaded fonts remain available. Own-font upload retained.
- Strict builtin:{id} allowlist across browser/server renderer, save/cart/order; existing keys unchanged. Bundled fonts don't consume upload quota. SVG embeds only bundled fonts used visibly on that face; private server preview/artwork renders after restart. Browser imports SVG-data per used font and reports loading/error; server registers local assets at startup.
- Storefront: animated floating print samples, moving dashed seam path and unfolding ambient layers, pointer tilt on accurate-pointer devices, scroll-driven type ribbon, scroll progress, process/editorial reveals, soft product/card/button hover. Existing garment print/back story and wheel scroll preserved; reduced motion static, listeners/timelines clean up on SPA navigation.

## Validation

- npm test:23/23 PASS, including15-font glyph/license verification, built-in private order artwork after restart, per-face font embedding and unknown-ID rejection.
- npm run test:fonts: PASS on final runtime. Actual font loads, group/search, sample content, apply/edit/draft reload/export, no uploaded font records,375/768/1440. Read-only API, browser-local draft only.
- npm run test:assistance: PASS; uploaded font and existing size-advice flow still works with picker replacement. Isolated API3004/DB.
- npm run test:studio: PASS; text/drag/undo/layers/two faces/login/save/reopen/cart/COD/admin/artwork. Isolated API3003/DB.
- npm run test:motion: PASS with new ambient dash movement, pointer matrix3d tilt and ribbon transform assertions, plus reversible pinned garment story, responsive bounds, hover, route cleanup and reduced-motion assertions at375/768/1440.
- npm run lint, npm run build: PASS. Final build has no oversized-chunk warning. Largest app chunk290.67KB raw; SVG font data split into14 separate19.8–141.95KB chunks loaded only for selected design fonts.
- Native render checker home375/768/1440:0 errors,0 warnings. Viewed native font-picker screenshots and final animated hero screenshots375/1440. Screenshots under outputs/nep-font-library-{width}.png and outputs/nep-home-expressive-{width}.png.

## Review and iteration

Inline review only; no independent-agent review claimed. Checked legacy font compatibility, private SVG paths, safe IDs, per-face embedding, async restore, reduced-motion and listener ownership. Initial aggregate font-data implementation produced a899.76KB chunk/build warning; replaced with per-font dynamic modules, verified clean build. Fixed hero side-note/card overlap after screenshot inspection. Recorded actual static source weight for Chakra Petch instead of claiming requested variable weight. No remaining blocking issue in inspected scope.

Visual rubric:22/24. Brief2 (tactile/playful/editorial), hierarchy2 (shirt and design CTA), spacing2 (card overlap corrected), alignment2 (existing grid), typography1 (multiple display families intentionally demonstrate the font library), color2 (olive/ivory/lime), depth2 (hairline and shallow print-paper shadow), states2 (preview/filter/selection/error/locked), responsiveness2 (recomposed375 layout), slop2 (garment and print-related decoration), copy1 (local/demo copy remains functional, not final merchandising), craft2 (shared picker, consistent icons and tokens). Weak points addressed: overlap, excessive initial font bundle, fixed font-selection samples; typography variety and provisional shop copy remain deliberate/current constraints.

## Local runtime

Backed up checkpointed DB to work/backups/store-before-builtin-fonts-20261019-180443.sqlite before restart. One runner27544, API20976 on3001, UI7036 on5173, exec session69132 retained for user. Health {ok:true,mode:local}; temporary APIs3003/3004 closed. No live account/product/order writes from tests.

## Limits

Built-in IDs/assets are stable in this release; changing existing font assets later should be treated as design-rendering compatibility work. SVG text remains embedded-font text, not outlined printer paths. Production deployment/SePay still outside scope.

Unresolved questions: none.
