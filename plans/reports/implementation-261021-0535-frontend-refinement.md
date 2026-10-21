# Homepage motion and direct chat delivery

Status: COMPLETE · 21/10/2026.

## Result

- Font ribbon continuously moves right to left without scrolling. All15 actual Vietnamese library fonts have a labeled specimen; two repeated groups form a seamless loop. Pause/Play works immediately, including while the control retains pointer/focus. Reduced-motion exposes a static horizontally scrollable list.
- Old pinned single flipping-shirt scene replaced by simultaneous front/back mockups. Six actual editable Studio catalog templates cycle every6 seconds; manual selectors/arrows pause autoplay. Hidden/offscreen, hover/focus and reduced-motion pause controls share one hook. No GSAP/CSS transform conflict or stale pin after navigation.
- Chat root cause: customers already had an inline composer, while admin saw only a full-inbox link and guests were redirected to login. Guest sign-in now stays in popup; admin selects threads/replies there; customer composer remains direct. Full history/inbox pages remain optional. Drafts/read state/role isolation and idempotent API sends preserved. Closed guest form unmounts and clears credentials; inactive conversations stop polling.
- Natural concrete Vietnamese replaces repeated identity slogans: hero “Tự thiết kế áo. In theo ý bạn.”, footer “In áo theo thiết kế của bạn.”, about “Bạn thiết kế. Nếp in lên áo.” Operational text describes actions rather than promises. Text-only support exchange wording now asks for order ID before photo instructions, rather than implying file attachments.

Owners: [homepage report](home-motion-261021-0535-frontend-refinement.md), [chat/review report](chat-261021-0535-frontend-refinement.md), [browser evidence](browser-261021-0535-frontend-refinement.md), [current design guide](../../docs/design-guidelines.md), [usage guide](../../docs/setup-guide.md).

No new dependency, backend/schema/pricing policy, generated image or remote font. Existing renderer, cutout assets, template catalog and embedded font loader reused. Six preview pairs cache approximately3.79MB of URI strings plus447KB initial pair; only active two images mounted. Studio CTA opens its current draft/library without pretending to apply a template outside its URL contract.

## Verification and review

- Global ESLint passed; final changed playback/info/widget files also passed targeted lint. Final TypeScript/Vite production build passed after all runtime edits. Existing dotenv NODE_ENV warning nonfatal.
- Focused auth-security/support HTTP suite4/4 passed. Server/shared files byte-identical to prior security release with92/92 tests; no unnecessary full backend rerun.
- Real isolated Edge motion suite passed375/768/1440 and reduced-motion375:15 loaded font families, right-to-left/no-scroll/scroll behavior, pause/immediate explicit resume, six distinct paired real SVG designs, autoplay/manual/hidden/offscreen, no overflow/errors, Studio round trip without old pin markup.
- Real isolated popup suite passed320/375/768/1440: wrong/successful inline login, unchanged URL, customer send/admin reply, focus, drafts/back/history, retry errors, read/polling boundaries, credential clearing and one ordinary login Email field.
- Hosted production build over local HTTPS/actual PostgreSQL passed local fonts, all15 specimens, paired SVGs, inline admin inbox empty state, existing auth/admin/Studio/chat/mobile and strict CSP/inline-script blocking. No live provider sends.
- Independent source review checked animation owners/cleanup, reduced/hidden/offscreen policies, font mappings, CTA truth and unique SVG layer IDs. Controller corrected duplicate generated IDs before release, immediate Play semantics, closed guest form ambiguity and photo-support wording.

Observed failed development runs were investigated: Vite HMR reset mounted scenes during early animation measurements; final quiet complete run passed. Initial render-check captured lazy loading at375/768, so it was not accepted; helper warmed modules and repeated all actual pages. Hosted test initially exposed duplicate hidden Email inputs (product fixed by visible-only guest mounting); one local TLS/Chromium navigation returned ERR_TOO_MANY_RETRIES. Final sequential hosted run passed; local TLS adapter logged an expected client-cancelled SSL EOF while navigating. No production navigation error observed in live smoke.

## Rendered review

Bundled frontend render-check repeated against real loaded UI at375×812,768×1024,1440×900:0 errors/0 warnings. Report/screenshots ignored under work/frontend-refinement-render-check; real interaction screenshots under work/frontend-refinement. Controller visually inspected desktop overview, mobile paired garments/fonts and admin/customer popup.

Final rubric22/24 after behavior/copy/SVG fixes:

| Item | Score | Evidence |
|---|---:|---|
| Brief fidelity |2|Warm, practical, calm cream/olive clothing presentation; actual fonts/shirts lead.|
| Hierarchy |2|Clear hero action and labeled side-by-side garment pair.|
| Spacing |1|Roomy desktop showcase prioritizes garment scale; comparatively tall section remains.|
| Alignment |2|Paired figures/captions/selectors share grid edges.|
| Typography |2|One UI family;15 decorative families are deliberately labeled product specimens.|
| Color discipline |2|Neutral garment/background with restrained olive controls.|
| Depth/shape |2|Consistent outlined/rounded actions, soft garment shadow.|
| States/feedback |2|Visible selection, manual/auto pause, loading/error/empty/auth states.|
| Responsiveness |1|No overflow, both sides retained; fine artwork necessarily smaller at375px.|
| Slop tells |2|Concrete actions/templates, no fake metrics or testimonials.|
| Content/copy |2|Specific printing workflow, honest navigation and text-only support.|
| Craft |2|Immediate Play, native dialog focus, keyboard controls, unique SVG references.|

No score below1. No performance/load or full accessibility conformance audit claimed.

## Deployment

Live https://nepform.salyyy.tech; release `/opt/nep-form/releases/20261020-2255-frontend-refinement-895095d8`.

SHA256 `895095d8b26fb340149b6b23e2f88e6c355375e4a844f053eba0604189054fc3`.

Private Supabase backup before deploy: ignored `work/backups/postgres-1792536858324-edbfa8cc.json`. Runtime allowlist/configured-secret scan, archive/source match, remote checksum, Linux production dependency install, SQL/mail checks, Nginx syntax and verified HTTPS health passed. Private environment/queue/session/security settings retained; no schema, live catalog/promotion/order/message writes. Other-project services/firewall unchanged per user decision.

Public read-only smoke confirmed served HTML/entry bundle hashes, security headers,15 fonts physically moving left, paired artwork loaded, guest inline sign-in becoming admin inbox without navigation, existing admin controls and mobile storefront/admin. No customer conversation selected or message sent; probe session revoked. Empty own cart discovery correctly returned CART_EMPTY. Metadata ignored at work/vps-frontend-refinement-release.json and work/vps-frontend-refinement-browser-verification.json.

Previous release `/opt/nep-form/releases/20261020-2159-security-polish-f142d650` retained; private config/vhost backups under `/opt/nep-form/backups/20261020-2255-frontend-refinement-895095d8/`. Rollback code to that release preserves backend security/data but restores prior UI. Keep current DB; never restore old DB over new orders. Operational owner [deployment guide](../../docs/deployment-guide.md).

Owned Vite PID36200, render API3001 PID12096 and later temporary render process, browser fixtures3011/3013 and HTTPS3008/8443 cleaned. Final listener check recorded before finish. VPS disk897MB free/97%used; monitor before further releases, no unrelated cleanup.

Unresolved questions: none. SePay configuration and previously documented owner credential rotation unchanged.
