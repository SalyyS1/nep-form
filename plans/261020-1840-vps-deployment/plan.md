# VPS deployment

Status: completed
Outcome: shop runs on user-selected VPS at https://nepform.salyyy.tech, retaining Supabase and existing VPS applications.
Constraints: no secrets in source/logs; preserve other services, system Node22, existing data; verified TLS; backup before data changes.
Non-goals: move SQL off Supabase, configure SePay/email, replace VPS-wide infrastructure.

- [x] SSH target confirmed, host key pinned, Ubuntu24/x86_64 inspected; existing Nginx80/443 and unrelated apps preserved.
- [x] Build and validate locally; upload minimal release, install isolated Node24/runtime dependencies.
- [x] Configure private environment, unprivileged systemd service on loopback3101; Supabase read-only check.
- [x] Add dedicated Nginx vhost, verify DNS, issue/renew HTTPS certificate.
- [x] Public health, SPA/studio, authentication/admin smoke; record release, logs, rollback and unresolved limits.

Dependency resolved: DNS A record points to supplied VPS; public HTTPS and browser flows verified. Evidence: ../reports/deployment-261020-1840-vps.md.
Recovery: stop only new nep-form service and disable only new vhost; keep Supabase unchanged; preserve release for inspection. Later releases use current symlink for code rollback.
