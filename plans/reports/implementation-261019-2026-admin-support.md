# Admin backend and support chat

Status: DONE

## Delivered
- Preserved existing authenticated product/variant/stock, customer/order, settings, custom fees and private artwork operations.
- Real persisted support-thread/message records using existing SQLite table; one thread/customer, customer/admin authorization,50-message cursors before/after,20-thread inbox pagination, query/status/unread filters.
- Transactional sequence/send deduplication and persistent20/min sender limit; monotonic read-through cursor, resolved/open lifecycle with optimistic version and audit. No seeded chats or fake online agent.
- Customer floating Hỏi Nếp + modal, shared conversation UI; admin responsive inbox. Poll4s open/10s customer unread badge, hidden tabs skip. Older pages preserve loaded messages; incremental after cursor avoids holes if more than50 messages arrive.
- Dashboard genuine14-day order bars in Vietnam time, paid vs awaiting/review metrics, custom-order and support counts, statuses; operations audit page. Cancelled payments excluded consistently from customer totals.
- Order carrier/tracking exposed to owner, UI sends expectedVersion and offers explicit refresh on conflict. Legacy omitted-version callers retained. Per-order audit history endpoint independent of global latest200.

## Verification
- npm test:33/33 PASS final revision, including new support isolation/idempotency/persistence/read/rate/paging and admin metrics/tracking/version/history tests.
- npm run typecheck, npm run lint, npm run build: PASS.
- npm run test:e2e: PASS guest/login/cart/COD/admin/product/settings/reset/bank-pending and regression scenarios.
- npm run test:studio: PASS full design/cart/COD/admin artwork journey and375/768/1440.
- npm run test:support: PASS two actual authenticated browser contexts, reply polling, unread badge closed/open, resolved/reopen/reload, tracking visible to customer, audit/dashboard, responsive375/768/1440. All use isolated temporary databases.
- Screenshots inspected: outputs/nep-admin-dashboard.png, nep-admin-support-{1440,768,375}.png, nep-customer-chat.png.
- Inline review via ak-code-review: checked route authorization, server-owned sender identity, parameterized storage, React escaped text, bounded input, atomic writes, cursor gaps/read races, lifecycle/version and polling cleanup. No independent reviewer claimed.
- Initial browser fixture raced login; now waits for authenticated navigation. Tracking assertion matched combined paragraph incorrectly; now checks correct scoped text. Screenshot found generic dialog CSS overriding sizing; specific support-dialog selector corrected and verified.

## Data/runtime
Backup before work: work/backups/store-before-admin-support-20261019-2031.sqlite. No schema migration/reset/production DB test writes. Existing records preserved.
One retained local runtime: npm run dev; runner33720/API24952:3001/UI23236:5173, exec session28426. Health ok/local and UI200. Test ports3002–3007 closed.
Docs updated: docs/setup-guide.md, docs/local-api-contract.md. Test entry npm run test:support.

## Limits / unresolved
- Functional local adapter retained; not deployed publicly. SePay/SMTP and production architecture remain unconfigured. No bank success simulated.
- Chat text only, polling while page open; no attachments/email/push/bot/presence guarantee.
- Dashboard daily revenue groups by order date/current paid state, not a cash receipt ledger.
- Unresolved questions: none.
