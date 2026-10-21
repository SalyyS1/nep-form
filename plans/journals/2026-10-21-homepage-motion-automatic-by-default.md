---
title: Homepage motion automatic by default
date: 2026-10-21
summary: Removed the enable step and verified automatic fonts and garments with reduced motion on the public site.
---

# Homepage motion automatic by default

Owner requested homepage font and garment motion start without an enable action, including reduced-motion systems. Public emulation reproduced the prior gate. Simplified playback hook and controls; kept Pause/Resume and hidden/offscreen cleanup, with CSS exceptions confined to those two showcases.

Lint/build, normal1440 motion suite and quiet reduced375 full font/template loop passed. Initial development run had interrupted reduced playback during workspace writes; exact cause unestablished, no product workaround. Fresh production HTTPS reduced-motion probe independently confirmed actual automatic movement, no enable action, inline chat and admin/mobile health. Deployed20261021-0610-auto-default-3943c850, prior release/config retained, no DB/schema changes or customer writes. Owned local fixtures stopped. AgentWiki publish skipped; local journal only.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
