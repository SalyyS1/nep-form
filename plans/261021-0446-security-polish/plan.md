# Security review and Vietnamese copy polish

Status: complete within confirmed shop-only scope. Owner explicitly chose to retain other-project services unchanged on21/10/2026. [Delivery and residual risks](../reports/implementation-261021-0446-security-polish.md).
Outcome: verify and repair reachable security defects across app/backend/deployment, polish awkward Vietnamese, test and deploy existing VPS.

Assets: customer accounts/password hashes/session cookies; saved addresses, private designs and orders; stock/pricing/coupon integrity; support conversations; mail tokens/provider credentials. Actors: anonymous, customer, administrator. Boundaries: browser/API, public product media/private artwork, SQL, third-party image/email/payment services and Nginx loopback proxy.

Constraints: preserve accepted commerce and session policies, private coupons, Vietnamese brand, existing live data and credentials; no real customer orders/mail/security attack traffic. Local isolated regression tests; read-only production probes. Do not promise absence of every possible vulnerability. Backup before schema/data changes or deployment. No SSH/password/API-key rotation without preserving operational access and explicit coordination.

Acceptance: confirmed issues have evidence, cause-aligned fixes and regression coverage; dependency/secret/static/access-control checks; full server/lint/build and relevant browser checks pass; deploy and verify public app; document limitations and concrete residual work.

- [x] Auth/email/support review and confirmed fixes.
- [x] Commerce/custom/media review and confirmed fixes.
- [x] Transport/static/proxy/dependencies/secret scan and confirmed fixes.
- [x] Vietnamese copy/frontend review.
- [x] Integrated regression tests, independent review and final source freeze.
- [x] Backup, deploy, read-only production smoke, docs and process cleanup.

Ownership: auth worker owns auth/common/auth-rate-limit/email/support+tests; business worker owns orders/cart/custom/media/admin/promotions+tests; copy worker owns src except lib/types.ts; controller owns index/runtime/static/storage/deploy/config/docs/plans/integration. Shared-file changes must coordinate.

Scope decision: owner answered “Giữ nguyên, chỉ vá website NẾP FORM”. Do not change other-project database ports, containers or host firewall under this task.

Unresolved questions: none within confirmed scope. Credential rotation remains a separately coordinated owner action.
