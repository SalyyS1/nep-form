# Support popup refinement

Status: Implemented; source frozen for browser verification.

## Root cause

Customer sessions already mounted `SupportConversation` inside the launcher dialog. Admin sessions rendered only a link to `/quan-tri/ho-tro`; guest sessions linked to the full login route. Testing as an admin therefore still required a separate page.

## Changes

- `support-widget.tsx`: role-specific inline customer conversation, admin inbox, or guest login. History/full inbox links remain secondary. Account IDs key both authenticated branches, resetting private state on identity changes.
- `support-popup-inbox.tsx`: real admin inbox API, search/status filters, unread counts, pagination, loading/empty/error/retry states, selection and back navigation. Each visited thread retains its own draft; hidden details and closed/hidden-tab inboxes pause polling. Back focuses the list heading.
- `support-popup-signin.tsx`: existing store login and auth fields, inline error/busy state, native Tab/Enter and Up/Down focus. Successful login renders the role-specific conversation without navigating away.
- `support-conversation.tsx`: optional popup composer autofocus on opening/login/selection and after sending, guarded when hidden. Explicit connection retry. Existing API identity/ownership, version, idempotency and read cursors retained.
- `support.css`: responsive inbox/sign-in layout and popup-scoped minimum44px touch targets for actions. Existing full-page admin layout retained.

## Verification

- PASS `npx eslint src/features/support`.
- PASS `npm run typecheck`.
- PASS final `node node_modules/eslint/bin/eslint.js src/features/support` after focus guard refinement.
- PASS real browser verification by frontend_motion_chat_verify: guest invalid-password recovery and successful inline login, composer focus and unchanged URL; customer send; admin selection/reply without navigation; per-thread drafts and back; inactive/hidden/closed polling pause;320/375/768/1440px layouts. Screenshots: `work/frontend-refinement/support/`. Polling checks settle existing requests before applying the hidden-tab boundary.
- No servers, live environment, database or mail processes started by this worker. No backend/auth/common/admin files changed.

## Browser selectors

- `dialog.support-dialog[open]`.
- `[data-testid="support-popup-login"]`, inputs `name=email` / `name=password`.
- `[data-testid="support-popup-inbox"]`, `[data-testid="support-popup-thread"]`.
- Active admin detail: `.support-popup-detail:not([hidden])`.
- Composer: `.support-composer textarea`; send accessible label `Gửi tin nhắn`.
- Back: `Danh sách hội thoại`; list focus heading `Tin nhắn của khách`.
- Search: `#support-popup-search`; status `aria-label="Lọc hội thoại"`.

Unresolved questions: none.

## Read-only homepage peer review

Reviewed after homepage worker confirmed source freeze and unique-ID repair. No homepage source edits made.

- Ribbon CSS owns its single transform animation; GSAP no longer writes ribbon transforms. Equal duplicated groups support a complete cycle; duplicate is hidden from assistive technology.
- Ribbon/showcase playback stops on hover/focus, document hidden, below12% intersection and reduced motion. Timer/listener/observer cleanup is present. GSAP matchMedia revert and guarded font-ready refresh handle route/preference cleanup.
- Reduced motion exposes native horizontal font scrolling and manual garment selectors; automatic garment changes stop. Front/back remain separately visible.
- Font loading keeps a valid UI-font initial garment pair. Actual catalog templates and embedded-font runtime generate later pairs; CTA opens the existing Studio without claiming selected-template transfer.
- Pure Node check PASS:15 catalog fonts, no missing builtin CSS/file mappings, six showcase templates, unique layer IDs within every generated project and font-registration project. Main UI font is locally declared by `src/styles/theme.css`.
- One copy concern sent to controller: `src/features/storefront/info-page.tsx:8` asks users to send order ID and photos via support, although chat is text-only. Suggested asking for the order ID first, then shop guidance for sending photos.
- Browser behavior/screenshots remain owned by browser peer; no broad tests or servers started for this review.

Review status: DONE. Controller corrected the photo-support wording.

## Hosted auth regression correction

Hosted browser verification found the closed popup retained a second guest email/password form on `/dang-nhap`, making label lookup and autofill ambiguous. Guest `SupportPopupSignin` now mounts only when the popup is visible, also clearing guest credentials on close. Customer/admin mounted conversation state still preserves drafts. Browser peer notified for a final guest popup rerun; controller owns hosted rebuild/retest.
