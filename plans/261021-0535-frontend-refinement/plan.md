# Font marquee, paired shirt previews and direct popup chat

Status: complete · 21/10/2026. [Delivery evidence](../reports/implementation-261021-0535-frontend-refinement.md).

Outcome: font ribbon moves continuously right to left to show15 real Vietnamese fonts; story area shows front/back shirts side by side and cycles real design samples; support messaging remains in popup for customers/admins, including inline sign-in for guests; storefront copy describes concrete actions in natural Vietnamese. Verify and update existing shop VPS.

Design brief:
- Register: Brand storefront, Product chat.
- Scene: Vietnamese customers browsing custom shirts on phone/desktop, warm and approachable clothing shop.
- Direction: preserve cream paper, shirt photography and olive details; motion demonstrates fonts/designs instead of slogan decoration.
- Color: restrained; current paper #f7f5f0, ink #20201e, olive #4f5a40 tokens remain authority.
- Type: Be Vietnam Pro UI; all15 actual font-library samples are product content.
- Signature: two shirt faces visibly change together through actual template designs.
- Dials: variance5, motion7, density3; chat stays restrained and task-focused.

Constraints: preserve auth/role/security and stored chat history; no guest-message backend bypass; native dialogs/keyed account isolation; real catalog/templates/renderer; no external services/dependencies/fake designs; no other-project VPS/firewall changes. Respect reduced motion and provide pause/manual controls. Pause autoplay hidden/offscreen; no animation ownership conflicts. No live customer messages/orders/product edits.

Non-goals: new chat channels, anonymous chat accounts, new template storage/pricing/payment policies, redesign whole site or change stock/product data.

Acceptance:
- Marquee moves without scrolling; all15 labeled font previews use actual library families; seamless loop and pause/reduced-motion fallback.
- Both shirt sides visible together at375/768/1440, autoplay changes design visibly; manual controls and reduced-motion work; SPA cleanup leaves no pin/timer residue.
- Customer/admin can send/reply entirely inside popup, guest can sign in there, no forced history navigation; messages use current APIs and correct identities.
- Targeted real browser tests, global lint/build, production CSP compatibility, rendered review and read-only live smoke pass.

- [x] Homepage implementation and copy.
- [x] Inline chat fix and copy.
- [x] Other customer copy review.
- [x] Browser/motion/accessibility/review/build verification.
- [x] Backup, release/deploy/live smoke, docs, cleanup.

Ownership: home worker owns homepage components/hooks/home CSS; chat worker owns support components/CSS; tester owns browser specs/isolated fixtures; controller owns other storefront copy/docs/deploy/integration. No shared-file edits without coordination.

Unresolved questions: none.
