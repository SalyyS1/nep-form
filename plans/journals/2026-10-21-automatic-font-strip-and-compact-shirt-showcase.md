---
title: Automatic font strip and compact shirt showcase
date: 2026-10-21
summary: "Reproduced hover pause, corrected autoplay/layout and verified public deployment."
---

# Automatic font strip and compact shirt showcase

Fixed a reproduced public autoplay bug: stationary pointer triggered broad hover/focus pause; earlier tests moved away and missed it. Removed those guards, retained explicit/hidden/offscreen pauses and added usable reduced-motion opt-in.

Rebuilt the sample area as a compact desktop title-left/front-and-back-right grid with automatic six-template 3.8s crossfades and small progress. Full stationary-pointer loop tests at375/768/1440, reduced-motion, render checker, lint/build and isolated hosted HTTPS/PostgreSQL/CSP passed. Local TLS fixture now waits for Studio font requests before navigation.

Deployed20261020-2322-autoplay-showcase-b7486bf7 after private backup and archive/secret checks. Fresh public browser confirmed automatic motion under hover, layout, inline chat and unchanged admin controls without customer data writes. Stopped owned local processes. Disk765MB free; no other-project changes. AgentWiki publish skipped; local journal only.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
