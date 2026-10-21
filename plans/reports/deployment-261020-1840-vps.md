# VPS deployment evidence

Status: DONE; public website verified at https://nepform.salyyy.tech.

Target: user-selected VPS, Ubuntu24.04/x86_64; shop domain supplied by user. SSH password stored only in ignored private work file. First-use SSH host key pinned; all subsequent connections reject unknown host keys.

Existing Nginx, system Node22 and unrelated services preserved. Installed official Node24.22.0 LTS under isolated /opt/nep-form/runtime; HTTPS download and official SHA256 verification passed. Created unprivileged nepform service user, dedicated systemd unit and loopback listener127.0.0.1:3101. Dedicated vhost only; nginx -t passed, reload performed. New service active/enabled and retained as requested deployment, no temporary dev servers left.

Artifact: /opt/nep-form/releases/20261020-1850-0854c239 via current symlink. Uploaded minimal6.03MiB runtime archive; SHA256 0854c239ccf9e16798bb3ae9ab21a15a8c8790d0a42ac2ba0acfd2759a365f3e verified remotely. Later HTTPS activation script staged separately. No dotenv, local databases, backups or node_modules in source archive. Installed46 production packages on Linux; sharp/font loading checks passed. Environment transferred separately mode600 root:root; CA mode640 root:nepform, directory750. Bootstrap admin credentials not transferred. No SQL migrations or bulk data changes during deployment; browser login test created then revoked its session after a fresh private backup.

Validation: npm run build passed (Vite warning about NODE_ENV in .env; production build still generated). Focused host selection assertions and both PostgreSQL hosting tests passed. Remote real Supabase check passed; health production,26 product bootstrap, SPA routes /thiet-ke,/quan-tri,/dang-nhap, built asset, unauthenticated admin rejection, private file blocking all passed. Public HTTP redirects301 to HTTPS. Backend verified bound only loopback. Disk after deployment1.9GiB free; do not remove unrelated data.

One local SSH helper exited on Windows console Unicode encoding after remote installation had completed; helper stdout switched to UTF-8, then remote service/config/permissions verification repeated successfully. This was a reporting failure, not a failed server rollout.

User created DNS record; fresh public resolver query and local/VPS resolution confirmed supplied IP. Certificate issued by Let's Encrypt, valid until2027-01-18; automatic certbot timer active/enabled, deployment hook present. Dedicated vhost backup saved before switching to HTTPS; nginx -t passed and reload succeeded. VPS resolver intermittently kept negative cache even after issuance, so activation's final health curl reported DNS failure despite successful TLS rollout. Corrected local health verification to curl --resolve domain:443:127.0.0.1, preserving certificate/hostname verification. Public HTTPS independently passed from local urllib and real browser without TLS bypass.

Browser validation: homepage, admin login, Secure/HttpOnly session cookie, PostgreSQL dashboard, Studio preview, admin support inbox,375px layout, no JavaScript exceptions; explicit logout and unauthenticated admin401 verify session revoked. No customer/order/chat messages added. Results only booleans in work/vps-browser-verification.json; browser closed cleanly. Temporary commands/SSH connections ended; retained only requested production service and renewal timer.

Unresolved: SePay and mail remain unconfigured; bank payment stays disabled. No open deployment questions.
