# Local preview contract

User steering 19/10/2026: deliver a working local storefront and admin UI before production backend hardening and hosted deployment. Keep React/Vite; use a loopback Node/SQLite local adapter behind /api. Local SQLite remains available; hosted PostgreSQL/Node setup is owned by [deployment-guide.md](deployment-guide.md). SePay remains unconfigured; domain email is owned by the deployment guide and email service modules. Local changes persist in SQLite; no pretend successful bank payments.

## Design brief

Register: Brand storefront + Product admin.
Scene: Vietnamese shoppers create custom unisex shirts on a phone/laptop; a shop owner reviews artwork and orders.
Direction: cream/ink editorial with animated fabric folds and lime accents; 2D Studio uses a three-column tool workspace.
Color: restrained; background oklch(0.97 0.009 85), text oklch(0.24 0.005 85), olive oklch(0.45 0.035 115).
Type: Be Vietnam Pro; weight/size contrast, compact body copy.
Signature: NẾP unfolding letters/fabric folds, a blank shirt becoming a personal design.
Dials: variance 7, motion 7 storefront / 3 Studio, density 3 storefront / 6 tools.

## Shared JSON types

User: {id,name,email,role:'customer'|'admin',emailVerified:boolean}. Admins are trusted for checkout; legacy customer records without a flag are unverified when email verification is enabled.
Product: {id,slug,name,category,categoryLabel,price,salePrice?:number|null,saleStartsAt?:ISO|null,saleEndsAt?:ISO|null,description,material,fit,images:string[],colors:{name,hex}[],sizes:string[],stock:number,featured:boolean,isActive:boolean,isDemo:boolean,variants:{id,size,color,stock}[],version:number}. Existing local records default to version1. `price` remains the original price; sale fields never overwrite it.
CartItem: {id,productId,size,color,quantity}.
Address: {id,recipient,phone,province,ward,line1,isDefault}.
OrderItem: {productId,name,image,size,color,quantity,unitPrice}.
Order: {id,code,userId,customerName,customerEmail,items:OrderItem[],address:Address,subtotal,shipping,total,paymentMethod:'cod'|'bank',paymentStatus:'unpaid'|'pending'|'paid'|'review',status:'pending'|'confirmed'|'packing'|'shipping'|'delivered'|'cancelled',createdAt,note}.
Settings: {shopName,shippingFee:number,contactEmail,checkoutEnabled:boolean,bankEnabled:boolean}.
Category: {id,label}.

Custom extension: Product.isCustomBase?:boolean; CartItem/OrderItem.custom?:CustomSummary. Exact types are maintained in [shared/custom-types.ts](../shared/custom-types.ts), core JSON types in [src/lib/types.ts](../src/lib/types.ts). Bootstrap additionally exposes customPricing. Custom cart summary is recalculated from saved design, current blank price and current fees. Order custom summary and immutable design ID snapshot the accepted quote. The design record also stores colorHex so previews survive later palette changes.

## HTTP API

All response failures: {error:string,code?:string}. Cookies same-origin HttpOnly sessions; hosted adds Secure. Return 401/403/400/409 as appropriate. Mutations return {ok:true} or entity, frontend refreshes bootstrap.

- GET /api/health -> {ok:true,mode:'local'}.
- GET /api/bootstrap -> {user:User|null,products:Product[],categories:Category[],settings:Settings,cart:CartItem[],addresses:Address[],orders:Order[],mode:'local'}; active public catalog, account-owned records only.
- POST /api/auth/login {email,password} -> {user}.
- POST /api/auth/register {name,email,password,confirmPassword?} -> {user,queued?,verificationUrl?,localOnly?}; creates customer session and verification job when mail is configured. Register/reset UI require matching repeated passwords; API checks confirmation when supplied and preserves existing callers that omit it.
- POST /api/auth/logout -> {ok:true}.
- POST /api/auth/request-reset {email} -> {ok:true}; configured mail queues an expiring reset email with generic response. With mail disabled, only local mode may return resetUrl/localOnly; hosted returns503 EMAIL_NOT_CONFIGURED, never a token link.
- POST /api/auth/reset-password {token,password,confirmPassword?} -> {ok:true}; one-use expiring email-bound token; revokes existing sessions.
- POST /api/auth/verify-email {token} -> {ok:true};24-hour one-use token bound to user+email.
- POST /api/auth/resend-verification -> {queued:true}|{alreadyVerified:true}; login required. A60-second cooldown survives restarts; old pending links invalidated. Only disabled-mail local mode exposes an explicit local preview link.
- PATCH /api/account {name} -> {ok:true}.
- POST /api/cart {productId,size,color,quantity} -> {ok:true}.
- POST /api/cart/merge {items:{productId,size,color,quantity}[]} -> {ok:true}; merge once after login, quantity must fit availability.
- PATCH /api/cart/:id {quantity} and DELETE /api/cart/:id -> {ok:true}.
- POST /api/addresses and PATCH /api/addresses/:id accept address fields above; DELETE /api/addresses/:id. Own records; atomic unique default.
- POST /api/checkout/quote {couponCode?:string} -> {quote:{subtotal,shipping,discount,total,coupon?,items:[{productId,size,color,quantity,unitPrice,designId?}]}}; authenticated, checks current stock/pricing/coupon without reserving a use.
- POST /api/orders {addressId?:string,address?:addressFields,saveAddress?:boolean,paymentMethod,note,idempotencyKey,couponCode?:string,expectedQuote:{subtotal,shipping,discount?,coupon?,total,items:[{productId,size,color,quantity,unitPrice,designId?}]}} -> {order}; server recomputes and compares displayed quote before commit,409 CART_CHANGED requires refresh and explicit reconfirmation. Snapshots address/pricing/discount, deducts inventory, redeems coupon, queues receipt and clears purchased cart atomically. Bank order stays pending. Legacy expected quotes without discount/coupon remain valid for undiscounted orders.
- GET /api/orders/:id -> {order}; owner/admin.
- POST /api/orders/:id/cancel -> {ok:true}; customer may cancel pending only, restores stock once.
- GET /api/admin -> {orders:Order[],users:User[],products:Product[],settings:Settings,stats:{revenue,orderCount,pendingCount,lowStockCount},audit:object[]}; admin only.
- POST /api/admin/products and PATCH /api/admin/products/:id accept Product fields excluding computed IDs; PATCH requires expectedVersion, stale409 PRODUCT_VERSION_CONFLICT. Admin edits/order deductions/restores increment version. Support variant stock/name/price/images/colors/sizes; archive via isActive false.
- PATCH /api/admin/orders/:id {status?:Order.status,paymentStatus?:Order.paymentStatus,note?:string}; validate transitions; paid only explicit admin action, COD payment separate; cancellation restores stock once.
- PATCH /api/admin/settings accepts Settings fields.

## Custom Studio API

- GET /api/custom/pricing → {pricing}; public demo fees.
- POST /api/custom/designs {project} → {design}; authenticated, creates a new immutable saved version. Empty draft allowed.
- GET /api/custom/designs?offset=0&limit=12 → {designs,hasMore,nextOffset}; own metadata only (id,userId,createdAt,project:{name,productId,color,size}), max 50/page; nextOffset null at end. SQL projects metadata without reading embedded images into the response.
- GET /api/custom/designs/:id → {design}; full project, owner/admin only.
- GET /api/custom/designs/:id/preview/front or /back → private SVG shirt preview.
- GET /api/custom/designs/:id/artwork/front or /back → private flat SVG download, embedded Vietnamese fonts. Admin UI fetches the authorized file then downloads a Blob and reports errors.
- POST /api/custom/cart {project,quantity} → {ok:true}; full validation, at least one nonhidden layer required, immutable saved design and separate cart line. Regular cart route rejects custom blanks. Quote items include designId for custom lines.
- GET /api/admin/custom-pricing → {pricing}; PATCH {pricing,expectedVersion} → {pricing}; admin only, stale version409.

Pricing formula is owned by [shared/custom-core.mjs](../shared/custom-core.mjs), configurable fees by admin; per nonempty face: highest content-type fee + area fee + fee per extra layer. Empty faces have no charge. Geometry/layers/fonts/colors/text/raster content validated on server. Uploads PNG/JPEG/WebP only, total decoded source bytes2MB/project; full Sharp decode before transaction, dimensions≤8192 and≤16M pixels, one frame. Request body cap is 5,000,000 bytes for custom POST designs/cart,1,048,576 bytes otherwise. No SVG/remote-image uploads. Order stock is checked against aggregate quantity of every line with the same blank/size/color before atomic deduction; cancellation restores each line once.

Optional DesignProject.fonts embeds {id,name,dataUrl} records (max3,≤512KiB each,≤1MiB combined). dataUrl is canonical base64 font/ttf, font/otf, font/woff or font/woff2; signatures, container bounds and fontkit metrics/layout/outlines are parsed before persistence. Layer.fontFamily can use custom:{id} only when the font exists in this project; missing/invalid references are rejected. SVG preview/artwork embeds fonts under generated safe CSS families, never remote font URLs. Fonts stay inside private immutable designs, including order references and server restart; metadata lists omit font bytes. Old projects without fonts remain valid. Font uploads do not add a separate surcharge beyond the text-layer pricing rule.

Bundled library: Layer.fontFamily also accepts builtin:{id}, strictly allowlisted by shared/builtin-font-catalog.mjs.15 Vietnamese fonts including the existing Be Vietnam Pro (legacy key unchanged); no extra upload records or upload quota consumed. Browser font picker uses local WOFF2 assets; Studio dynamically imports separate SVG-data modules only for fonts used in the draft, including reload/opened designs. Server registers all local fonts at startup. Preview/artwork embeds only visible text fonts used on that face, plus legacy Vietnamese defaults and customer uploads. Built-in IDs remain stable; bundled assets and source hashes/licenses are tracked in data/studio-font-manifest.json. Existing serif/monospace legacy keys remain supported.

Size advice is client-only, owned by [shared/size-guide.mjs](../shared/size-guide.mjs). Uses both height and weight against the shared demo S–XL chart; no BMI or account/profile mutation. Out-of-chart input or an unoffered size has no automatic replacement; applying a suggestion requires stock in the selected color (Studio also subtracts cart quantities). Height/weight exists only while the dialog is open and is excluded from design/cart/order payloads.

Sticker/template library:48 shape IDs allowlisted through shared/sticker-catalog.mjs and rendered from original static shared/sticker-paths.mjs; six original IDs/paths retained. Shape layer contract unchanged, no arbitrary user SVG/path accepted. CurrentColor stroke/fill inherits the validated layer hex color.24 templates in shared/design-template-catalog.mjs expand to editable text/shape layers with fresh IDs; template references are not persisted, so recipe edits do not change saved layer layouts/text. Applying append/replace is a single history commit to the active face; other face untouched. Existing20-layer-per-face validation and pricing formula remain authoritative. New shape/font values persist through private saved designs, cart and order artwork after restart. Keep existing sticker paths/IDs stable when extending the catalog.

Text effects: optional text-layer-only DesignLayer.textEffects, type owned by shared/custom-types.ts; defaults/client bounds shared/text-effects.mjs, strict validation server/text-effects-validation.mjs. Partial objects normalize to defaults; absent field stays absent for legacy records. Curve [-100,100], outlineWidth [0,10], hex outlineColor; shadow has boolean enabled, hex color, opacity[0,1], blur[0,12], offsetX/offsetY[-20,20]. Nonfinite values, wrong types/colors, effects on nontext layers rejected400 INVALID_TEXT_EFFECTS. Effects remain part of one text layer; no pricing-formula change.

shared/text-svg.mjs renders identical content in shirt preview/artwork: each curved line uses a quadratic path, IDs hex-encoded from Unicode layer ID plus line index; references stay local. Outline uses paint-order stroke fill; one bounded feDropShadow filter per layer. Absent/zero effects preserve legacy linear geometry. Validated effect JSON snapshots with the immutable design through cart/order/admin/restart. SVG font embedding and privacy controls unchanged. Chromium renders exported textPath; Sharp/librsvg does not support it in this runtime, so browser pixel checks own curved-output verification and server raster checks own linear outline/shadow verification. The local app serves SVG directly, not Sharp-rasterized curved previews.

## Seed and local execution

Catalog at data/catalog.json, array of 24 Product objects. Images under public/images. Assets worker owns catalog file. Backend reads file at first DB creation; no overwrite existing DB.
Demo accounts: admin@nepform.local and khach@nepform.local, both password Nepform@2026!. Local demo data only, loopback binding. Do not publish this adapter publicly.
API binds 127.0.0.1:3001. Vite binds 127.0.0.1:5173 and proxies /api. Persist DB under work/local-data/store.sqlite. Back up existing DB before schema or bulk data mutations. Do not reset user-created data for tests.


## Admin operations and support extension — 19/10/2026

GET /api/admin stats additionally exposes unpaidTotal (active unpaid/pending orders only), reviewCount (all review payments), customOrderCount, supportOpen, daily (14 Vietnam calendar dates with orders/revenue by order-created date) and statuses. Revenue excludes cancelled orders and counts paid state only; it is not a dated cash receipt ledger. Customer page uses the same cancelled exclusion. Existing stats fields remain compatible.

Orders add optional version (legacy defaults1), updatedAt, carrier and trackingCode. PATCH /api/admin/orders/:id accepts carrier/trackingCode (trimmed,0–100 chars) and expectedVersion. When supplied, a stale version returns409 ORDER_VERSION_CONFLICT with no stock/payment/audit change. Current admin forms always send it; legacy API calls without it remain compatible and still validate state transitions. Admin saves/customer cancellation increment version. GET /api/admin/orders/:id/history returns {events}, all matching order audit events newest first, admin only; global /admin audit remains latest200. Tracking fields are included in order snapshots returned to owner/admin, not public routes.

Chat uses existing records table kinds support-thread (owner customer ID, one thread ID per customer), support-message (owner thread ID); no schema migration or reseed. Customer/admin access checked server-side. Records survive restart; no fake seeded conversations.

- GET /api/support -> {thread:SupportThread|null}; own thread only.
- GET /api/support/messages?before=N -> {thread,messages,hasMore}; latest50 or50 before exclusive sequence, ordered ascending. Empty conversation returns empty list/null thread.
- GET /api/support/messages?after=N -> first50 messages strictly after cursor, ascending, plus hasNewer; poll progressively catches up without gaps even when more than50 messages arrived. Cursor is sequence, never timestamp.
- POST /api/support/messages {text,requestId} -> {message,thread}; first send creates own thread. Trimmed1–2000 chars; requestId8–100 ASCII alphanumeric/underscore/hyphen. Idempotency scoped thread+sender+requestId; same content retry returns existing message, changed content409 MESSAGE_CONFLICT. Persistent20 sends/minute per sender/thread,429 MESSAGE_RATE_LIMIT. Retry dedupe precedes rate limit.
- PATCH /api/support/read {sequence} -> {ok:true}; bounded0..current thread.sequence, monotonic customerRead. Marks only through supplied rendered cursor, never future incoming messages. GET does not mutate unread state.
- GET /api/admin/support?q=&status=all|open|resolved|unread&page=1 -> {threads,total,page};20 summaries/page, latest activity first; q searches customer name/email/last-message preview.
- GET /api/admin/support/:id and GET/POST .../:id/messages and PATCH .../:id/read: same contracts for admin, read updates shared adminRead cursor.
- PATCH /api/admin/support/:id {status:'open'|'resolved',expectedVersion} -> {thread}; stale409 THREAD_CHANGED, status change and audit atomic. Both customer and admin new messages reopen the thread. Sending/status increment version; reads do not.

SupportThread: id,userId,customer(publicUser),status,sequence,adminRead,customerRead,version,createdAt,updatedAt,lastMessage(max160),adminUnread,customerUnread. Message: id,sequence,senderId,senderRole,text,createdAt. Body userId/senderRole never grants authority; all new metadata derives from session. Unknown customer ID routes are404; all /admin/support endpoints require admin. No uploads or arbitrary HTML accepted/rendered; React escapes message text. Polling4s open,10s customer badge, pauses hidden tabs. Chat read marks only when near bottom; older history merges by message IDs. No email/push or presence guarantees.

Before this extension, runtime stopped and DB copied to work/backups/store-before-admin-support-20261019-2031.sqlite. Existing production limits (loopback/demo auth/local reset/SePay not connected) are unchanged; this is a functional local backend, not a public deployment.


## Hosted SQL contract

Same API/domain validation now uses an async store interface. Local defaults to SQLite with serialized async transactions; hosted requires PostgreSQL. Postgres schema/constraints live in database/migrations/001-store.sql, storage/transactions in server/postgres-store.mjs, initialization/backup/restore in server/postgres-maintenance.mjs. A database row lock serializes mutation transactions across connections; all statements in a transaction use the same leased client. A slow image validation still finishes before entering the custom cart transaction, which rechecks availability.

Bootstrap/health mode is local|production; frontend hides local demo controls on production. Exact configured HTTPS APP_ORIGIN and same-site browser mutations are enforced; cross-site top-level GET navigation remains allowed; hosted serves built dist SPA and assets, never source/private DB files. Hosted initial DB has no demo users, no public token links and bank disabled until configured. Cookie/logout include Secure. Hosted auth rate limit is best-effort per process (account10/10min and peer100/10min), resets on restart. VPS explicitly enables TRUST_PROXY_LOOPBACK: only a loopback socket may supply valid X-Real-IP, which Nginx overwrites. Direct public peers cannot change identity with headers. Public responses/startup logging avoid connection secrets.

Current deployment path and external configuration lookup: docs/deployment-guide.md. No cloud project/connection is claimed by this contract. Hosted PostgreSQL retains current JSON domain snapshots rather than migrating business rules into Supabase Auth/RLS/RPC. The private schema is not exposed through Supabase's client Data API.


## Transactional email, product media and support UI

Bootstrap adds `email:{configured,verificationRequired}`. See [email service](../server/email-service.mjs) and [templates](../server/email-templates.mjs). When configured, new/legacy customer checkout requires a verified email; unverified customers can still log in and save designs/cart. Disabled mail keeps existing checkout available and reports unavailable delivery clearly.

Order receipt and state/payment/tracking changes queue immutable mail in the same SQL transaction as the order, using stable event IDs. Worker delivery occurs outside the transaction; failures preserve orders/stock and retry with provider idempotency keys. Retry count/time horizon, leases, encryption and terminal error handling are owned by the email service. Tokens are hashed; pending message bodies are encrypted with independent MAIL_QUEUE_KEY. Provider acceptance is not delivery confirmation. `GET /api/admin/email-status` returns admin-only configured/pending/failed/sent counts; no token/credential/recipient payloads.

Admin photos use [media route](../server/product-media.mjs) and [Pinterest importer](../server/pinterest-image-import.mjs): `POST /api/admin/media {dataUrl}|{url}` requires admin and allows a6MB JSON body; normalized public WebP persists in SQL. `GET /api/media/:id` serves immutable public product images. Product validation checks managed image existence. Custom customer artwork remains private under existing design endpoints. Removing a product photo reference retains its public stored image to preserve old orders; database quota includes photos.

The admin picker uploads files or stores direct HTTPS image URLs, previews/reorders/selects cover/removes photos. Pinterest page/CDN import is narrowly allowlisted, revalidates redirects, pins validated public IPv4 and bounds size/decode/time; arbitrary webpage import is unsupported. Blocked Pinterest pages offer file upload fallback.

Support launcher opens an in-place popup: guests sign in through the existing store login without navigation, customers compose directly, admins list/select threads and reply with existing admin APIs. Full-page history/inbox links are optional. Guest credential form mounts only while visible; closing clears entered credentials. Account-keyed customer/admin conversations retain drafts on close, admin drafts survive switching threads, and inactive/hidden/closed conversation polling pauses. Full history is `/tai-khoan/ho-tro`; popup is suppressed there. Auth fields support Up/Down and native Tab/Enter; register/reset confirmations are mandatory in the UI. Focused browser journeys: [account/media](../tests/browser/account-polish.spec.py), [popup](../tests/browser/support-popup.spec.py). Both use isolated databases; mail capture never invokes the live provider.


## Product sales and checkout coupons

Business policy: sale discounts only the garment base, keeping custom printing fees unchanged. One coupon stacks on the after-sale goods/custom subtotal, excluding shipping. Discounts cannot make goods negative. Percentage discounts round down to whole VND. Schedules begin inclusively and end exclusively; admin inputs use Vietnam time. No live prices or promotions are seeded by startup/deployment.

Source owners: [Product/Promotion/Order types](../src/lib/types.ts), [shared sale calculation](../shared/product-pricing.mjs), [product validation](../server/product-validation.mjs), [coupon validation](../server/promotion-validation.mjs), [admin/quota API](../server/promotions.mjs), [quote](../server/checkout-quote.mjs) and [order transaction](../server/orders.mjs). The admin API lives under `/api/admin/promotions`; deactivate instead of deleting so history remains attributable.

Quotes reserve neither inventory nor coupon uses. Checkout requires explicit reconfirmation after a changed total, and keeps invalidated codes removable so customers can continue without a discount. Accepted orders retain their price/coupon snapshots through later edits. Retries consume no extra use; cancellation returns usage once. Older undiscounted orders remain readable. Receipt/update display is owned by [email templates](../server/email-templates.mjs).

Coupon audience policy: optional firstOrderOnly defaults false; optional minQuantity defaults1 for legacy promotions. First order means the account has no noncancelled order, including pending/unpaid orders. Cancellation restores eligibility; this is account-based, not a new-person/household claim. Quantity counts the sum of all units, including identical/custom shirts, rather than distinct product IDs. Global and per-customer one-use presets reuse existing quotas; no extra quota mode is persisted. These conditions combine with existing dates, money and usage rules. The server derives history/quantity at preview and within the final order lock; restricted conditions are retained in accepted coupon snapshots. See [eligibility HTTP tests](../tests/server/promotion-eligibility.test.mjs), [PostgreSQL tests](../tests/server/promotion-eligibility-postgres.test.mjs), and [browser journey](../tests/browser/promotion-eligibility.spec.py).

Public coupon discovery is admin opt-in via showAtCheckout (legacy/new default false). Hidden codes still work through manual entry; updating this release never publishes existing codes. Authenticated GET `/api/checkout/promotions` uses actual server cart/account state, returns only whitelisted public offer data, eligibility/reason and actual discount. Disabled/expired/private codes are omitted; future offers may appear disabled. Recommendation ranks eligible positive VND savings after caps/subtotal, then earliest expiry and code; nothing is automatically applied or reserved. Existing quote/order validation remains final authority. Source owners: [discovery route](../server/checkout-promotions.mjs), [policy](../server/promotions.mjs), [typed DTO](../src/lib/types.ts), [voucher picker](../src/features/checkout/voucher-picker.tsx). [API regression](../tests/server/checkout-promotions.test.mjs) and [browser journey](../tests/browser/voucher-picker.spec.py) verify privacy, ranking, selection and stale-state handling.

## Security boundaries and resource limits

Production responses apply [security headers](../server/security-headers.mjs): CSP permits local scripts, local/data fonts, inline styles needed by the editor, and HTTPS/data/blob images; disallows inline/external scripts, objects, base overrides, foreign forms and framing. Private SVG retains its stricter sandbox policy. Local Vite mode omits production CSP. Unexpected internal errors expose neither exception details nor driver codes. [HTTP tests](../tests/server/security-http.test.mjs) cover error/header behavior.

[Customer resource limits](../server/customer-resource-limits.mjs) bound active carts to50 lines and saved addresses to20; existing entries remain editable/removable even if over a new bound. Studio save and custom-cart writes share30 accepted writes/hour and20MiB normalized serialized project JSON/24hours per account. Windows begin at the first accepted write and renew independently. One compact persistent budget record is updated in the same transaction as artwork/cart; rejected/rolled-back writes consume nothing. Budget refusal returns429 STUDIO_WRITE_LIMIT with Retry-After seconds. New cart/address entries beyond capacity return409 CART_LINE_LIMIT/ADDRESS_LIMIT; saving a new checkout address at capacity requires removing an old address or leaving saveAddress false. Existing immutable designs/orders are retained. [HTTP regression](../tests/server/customer-resource-limits.test.mjs) and [PostgreSQL regression](../tests/server/customer-resource-limits-postgres.test.mjs) verify concurrency, rollback and restart behavior.

Limits constrain individual/account growth, not distributed request floods or indefinite historical storage. Authentication throttling remains per instance; bounded raster/font parsing occurs before write accounting. Secrets belong only in private environment/credential files, never source, browser bundle or reports.

Time-dependent storefront prices update on rendering rather than an idle-page timer; final quote/order validation uses current server time. Operational instructions are in [setup-guide.md](setup-guide.md#giá-sale-và-mã-giảm-giá).

Verification: [coupon rules](../tests/server/promotions.test.mjs), [SQLite checkout](../tests/server/discount-checkout.test.mjs), [PostgreSQL lifecycle/concurrency](../tests/server/discount-postgres.test.mjs), [browser journey](../tests/browser/discounts.spec.py). All fixtures are isolated from shop data.


## Login navigation and tab reconciliation

A valid server session should continue directly through the login route to its intended internal destination. Explicit account switching uses `doi-tai-khoan=1`; protected views discard prior-account form state when identity changes. Login/logout/password reset reconcile other tabs without putting credentials in browser storage. Session cookie authority and server permissions remain unchanged. Sources: [store context](../src/lib/store-context.tsx), [auth route UI](../src/features/account/auth-page.tsx), [regression browser](../tests/browser/session-navigation.spec.py).
