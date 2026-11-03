#!/bin/sh
# Set up the local test WordPress: e2e/setup.sh /path/to/Divi.zip
# Safe to run again. Divi is installed into the site (Docker volume, never the repo: it is licensed) and activated;
# without it the tests skip. Start from scratch with: docker compose -f e2e/docker-compose.yml down -v
set -eu
DIVI_ZIP="$(realpath "${1:-/dev/null}")"
cd "$(dirname "$0")"

URL="http://localhost:${E2E_PORT:-8094}"

docker compose up -d
# Wait for WordPress with a working database (500 = database still starting).
until curl -s -o /dev/null -w '%{http_code}' "$URL" | grep -q '^[23]'; do sleep 2; done

wp() { docker compose run --rm -T cli wp "$@"; }
wp core is-installed 2>/dev/null || wp core install --url="$URL" --title=D5IM --admin_user=admin --admin_password=admin --admin_email=e2e@example.com --skip-email
wp rewrite structure '/%postname%/'
wp plugin activate divi5-image-mask
# An author for the upload test: may upload images, but has no unfiltered_html.
wp user get author >/dev/null 2>&1 || wp user create author author@example.com --role=author --user_pass=author
if [ -f "$DIVI_ZIP" ]; then
	docker compose cp "$DIVI_ZIP" wp:/var/www/html/wp-content/divi.zip
	wp theme install wp-content/divi.zip --force --activate
	docker compose exec -T wp rm -f wp-content/divi.zip
fi

docker compose exec -T wp rm -f wp-content/debug.log
echo "Ready: $URL (admin/admin). Run: cd e2e && pnpm install && CHROMIUM_PATH=/usr/bin/chromium pnpm test"
