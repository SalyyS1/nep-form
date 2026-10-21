# Support popup and storefront copy

Status: DONE. Implementation, focused lint, and isolated real browser journey passed.

Files: src/features/support/support-widget.tsx, support-conversation.tsx, support.css; src/features/storefront/home-page.tsx, home-designs.ts; tests/browser/support-popup.spec.py.

- Anchored native dialog keeps focus trap/Escape and returns focus to launcher; mobile sizing includes safe-area edges.
- Unsent draft and fetched messages survive close/reopen. Conversation polling pauses while closed or document hidden; badge request owner pauses while dialog open. Widget suppressed on /tai-khoan/ho-tro.
- Full history link /tai-khoan/ho-tro depends on main account integration. Guest login return uses local path/query/hash; auth pages return to full history.
- Unique composer labels; failed send copy/draft persist across successful polls; sequence merging/idempotent request IDs retained.
- Secondary home/Studio preview/process copy tightened. Existing main/tested headings retained. Sample back caption now “VỪA VẶN THEO CÁCH RIÊNG.”
- Footer lives in src/components/store-layout.tsx, outside ownership. Main received suggestions; not modified.

Validation: focused ESLint passed; python tests/browser/support-popup.spec.py passed against integrated account history route. Browser test requires existing UI5173; owns temporary SQLite API3011 and stops its process. Covers guest return, focus/Escape, draft, real send/history, failed-send retry, request ownership, document visibility, 320/375/768 sizing. No real store data touched. API3011 fixture cleaned; main-owned Vite5173 left running. Rapid post-login opening is stable: no delayed auth/route effects reset explicit open state. Chromium native-dialog browser-chrome focus cycling is allowed; underlying controls remain inert.

Questions: none.

