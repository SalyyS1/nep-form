#!/usr/bin/env bash
set -eu
domain=nepform.salyyy.tech
config=/etc/nginx/sites-available/$domain
source=/opt/nep-form/current/deploy/vps/nepform-https.conf
test -f "$source"
test -f "$config"
getent ahostsv4 "$domain" >/dev/null || { printf 'Domain has no IPv4 DNS record yet.\n'; exit 1; }
certbot certonly --webroot --webroot-path /var/lib/nep-form-acme \
    --domain "$domain" --cert-name "$domain" \
    --non-interactive --agree-tos --register-unsafely-without-email
backup=/opt/nep-form/backups/nginx-before-https-$(date -u +%Y%m%dT%H%M%SZ).conf
cp -p "$config" "$backup"
install -m 644 "$source" "$config"
if nginx -t; then
    systemctl reload nginx
else
    cp -p "$backup" "$config"
    exit 1
fi
install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/nep-form-reload-nginx <<'HOOK'
#!/bin/sh
case "${RENEWED_LINEAGE:-}" in
    /etc/letsencrypt/live/nepform.salyyy.tech) nginx -t && systemctl reload nginx ;;
esac
HOOK
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/nep-form-reload-nginx
systemctl enable --now certbot.timer
# Verify this vhost without depending on a resolver's cached negative DNS response.
curl --fail --silent --show-error --resolve "$domain:443:127.0.0.1" "https://$domain/api/health"
printf '\nHTTPS configured; renewal timer enabled.\n'
