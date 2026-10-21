# Homepage motion starts automatically

Status: COMPLETE — deployed and public verification passed.

User explicitly requested automatic playback without enabling it. Fresh public browser with reduced-motion emulation reproduced the previous behavior: font data-playing=false and an enable button present. This was an intentional previous preference gate, now superseded by the owner's request.

Removed reduced-motion opt-in/media state from use-home-playback. Ribbon and paired garment showcase start automatically when visible and the tab is active. Both retain explicit Pause/Resume, hidden/offscreen guards and cleanup. Removed enable labels and reduced-only manual next. CSS overrides only these two showcases; other page effects retain their system-preference behavior. Layout, actual font/template assets, backend/shared/auth/chat/security and pricing unchanged.

Verification: ESLint and production TypeScript/Vite build passed. Existing motion suite normal1440 passed actual15 fonts, six-template loop/crossfade under stationary pointer, pause/resume/hidden/offscreen/layout/route cleanup. Updated375 reduced-motion branch reuses actual ribbon/showcase checks without an enabling click: all15 fonts move, all6 templates loop and crossfade, pause/resume still works. Initial combined run observed reduced showcase unexpectedly becoming inactive after an automatic change while release/docs files were being written; isolated quiet reduced-only rerun passed without product changes. Cause of that interrupted development observation not established; not attributed to production or cache. No assertion removed to bypass it. Code review checked consumers and narrow CSS overrides.

Release `/opt/nep-form/releases/20261021-0610-auto-default-3943c850`; SHA256 `3943c8506a9442142f5adbb130305e585b54ec9457ef39d8217456c39715384f`.245 archive files byte-match current runtime/build; allowlist/secret scan, remote checksum, production dependency install, SQL/private-mail checks, Nginx syntax and verified HTTPS production health passed. No schema/data change, so existing private backup from the immediately preceding deployment retained; no restore performed.

Fresh public Edge context with reduced-motion enabled confirmed no enable button, actual font movement and automatic paired-shirt template change under stationary hover. Served HTML/entry hashes match the build. Production health/mail/security headers, inline admin login/inbox, existing promotion/sale controls and mobile pages passed; no product/promotion/order/message writes, no JS errors and probe session revoked. Evidence ignored at work/vps-auto-default-browser-verification.json. This tests the built HTTPS deployment independently of the Vite run above.

Previous release `/opt/nep-form/releases/20261020-2322-autoplay-showcase-b7486bf7` and private config/vhost backups retained under `/opt/nep-form/backups/20261021-0610-auto-default-3943c850/`. Rollback code preserves SQL but restores the previous reduced-motion enable step. No other-project infrastructure changes. VPS623MB free/98%used; no unrelated cleanup performed.

Owned Vite tool session60105 stopped after testing; temporary SQLite API3013 cleaned in finally. Ports5173/3001/3013/3008/8443 verified free. Current behavior documented in design-guidelines/setup/deployment guide.

Unresolved questions: none.
