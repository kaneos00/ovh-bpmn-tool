#!/bin/sh
set -eu
: "${DEMO_AUTH_USER:?Set DEMO_AUTH_USER in Coolify}"
: "${DEMO_AUTH_PASSWORD:?Set DEMO_AUTH_PASSWORD in Coolify}"
if [ "$DEMO_AUTH_USER" = "demo" ] && [ "$DEMO_AUTH_PASSWORD" = "change-me" ]; then
  echo "Refusing to start with example credentials" >&2
  exit 1
fi
printf '%s\n' "$DEMO_AUTH_PASSWORD" | htpasswd -i -B -c /etc/nginx/.htpasswd "$DEMO_AUTH_USER"
chown root:nginx /etc/nginx/.htpasswd
chmod 0640 /etc/nginx/.htpasswd
exec /docker-entrypoint.sh nginx -g 'daemon off;'
