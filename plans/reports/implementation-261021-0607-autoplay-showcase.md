# Automatic font strip and compact garment showcase

Status: COMPLETE — public deployment verified21/10/2026.

## Cause and correction

Fresh anonymous public reproduction confirmed the font moved before hovering and paused immediately under a stationary pointer. Broad hover/focus playback guards caused the reported stillness. The previous browser test moved the pointer outside; it therefore missed the user's ordinary viewing condition. No stale deployment/cache cause established.

Removed hover/focus pause from the shared homepage playback hook. Explicit pause, offscreen and hidden-tab guards remain. The15 actual font specimens continuously travel right to left. Reduced-motion starts static; each section has an enabled explicit opt-in. Narrow opt-in CSS overrides the existing global reduced-motion reset only within the enabled section.

Desktop now puts title/copy left and both shirt faces right on one row. Six real Studio templates automatically crossfade every3.8seconds with650ms opacity overlap. Removed the six selection tiles and ordinary next/previous controls; small noninteractive progress, current template and pause remain. Mobile keeps both faces side by side below the title. Measured1440px section height661.33px; previous section approximately1383px. CTA retains the user's Studio draft.

Sources: playback hook, home-type-ribbon, home-design-showcase, expressive-home.css and home-design-showcase.css. No dependency, renderer/catalog/font asset, backend/shared contract, schema, chat/security or commerce policy changed. Twelve scene images stay mounted for decoded crossfades; performance/load benchmarking was not performed. Existing six preview pairs contain about3.79MB of URI strings.

## Verification

- Global ESLint and production TypeScript/Vite build passed after runtime source freeze. Existing dotenv NODE_ENV warning remains nonfatal.
- Quiet isolated Edge motion suite passed375/768/1440 plus reduced-motion375. Stationary pointer remains over font/showcase, first automatic change within5seconds, all6 templates loop and return without selector clicks, both scenes have intermediate opacity during crossfade, all15 actual font families load. Explicit pause/resume, reduced static/manual next/opt-in, hidden/offscreen pause, route cleanup, alignment and no overflow/page errors passed.
- Installed frontend render checker against fully loaded pages375/768/1440:0 errors,0 warnings. Controller visually inspected full desktop section, mobile pair and final public screenshot.
- Hosted built SPA over isolated HTTPS/PostgreSQL passed Secure/HttpOnly auth, admin/Studio/inline chat/mobile, local fonts, strict CSP and inline-script blocking. First local TLS navigation returned ERR_TOO_MANY_RETRIES after Studio; fixture now awaits Studio networkidle before replacing the document. Final sequential run passed. No product server change or weakened assertion made. Earlier render helper's now-ambiguous image selector corrected to active scene.
- Independent read-only review found no actionable issue in playback cleanup, pointer behavior, reduced-motion opt-in specificity, actual font/template reuse or desktop grid. Backend/shared unchanged; prior security suite92/92 remains applicable, not rerun for this UI-only correction.

Evidence: [browser report](browser-261021-0607-autoplay-showcase.md), [component report](home-261021-0607-autoplay-showcase.md); ignored work/autoplay-showcase/motion/report.json, section-layout-1440.json, screenshots and work/autoplay-showcase-render-check.log. Final screenshot work/autoplay-showcase/live-showcase-1440.png captured on actual HTTPS while automatic playback enabled, before any login.

Rendered rubric23/24: brief, hierarchy, spacing, alignment, typography, color, shape, states, concrete copy, content and craft2 each; mobile artwork legibility1 because fine designs remain smaller at375px. No full accessibility or performance certification claimed.

## Deployment and rollback

Live https://nepform.salyyy.tech. Release `/opt/nep-form/releases/20261020-2322-autoplay-showcase-b7486bf7`; SHA256 `b7486bf7c943012a797175ad35c7b530b91b0f467ba29a72cfc710974892608a`.

Private Supabase backup before deployment: ignored work/backups/postgres-1792538297393-12555940.json. Allowlist/configured-secret scan passed; all245 archive files byte-match current source/build. Remote checksum,46 production dependencies, SQL/private-mail checks, Nginx syntax, restart and verified HTTPS production health passed. Existing environment/mail queue key/session/security settings retained. Other-project containers/firewall untouched. No live orders/messages/catalog/promotion writes.

Fresh public Edge probe confirmed exact HTML/entry hashes, production health/mail configuration/security headers, fonts moving left under stationary hover and automatic shirt template change under hover; title and shirts horizontally separated with vertical overlap and section below800px. Inline guest sign-in becomes admin inbox without navigation. Existing admin sale/coupon/public opt-in and mobile pages passed; only local form edits, no save. Own empty-cart offer lookup correctly returns CART_EMPTY. No JS errors; probe session revoked. Ignored evidence work/vps-autoplay-showcase-browser-verification.json.

Previous release `/opt/nep-form/releases/20261020-2255-frontend-refinement-895095d8` retained. Private config/vhost/prior-target backup `/opt/nep-form/backups/20261020-2322-autoplay-showcase-b7486bf7/`. Code rollback restores older motion/layout while keeping current SQL; never restore old DB over new orders. Operational owner [deployment guide](../../docs/deployment-guide.md).

Owned VitePID24236 stopped; render API3001PID22200 and temporary motion/hosted fixtures cleaned in finally. Ports5173/3001/3013/3008/8443 verified free. VPS disk765MB free/98%used; monitor before further releases, no unrelated cleanup performed.

Unresolved questions: none. Existing SePay setup/owner credential rotation outside this correction unchanged.
