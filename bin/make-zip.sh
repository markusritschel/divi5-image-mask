#!/usr/bin/env bash
# Builds dist/divi5-image-mask-<version>.zip, ready for Plugins > Add New > Upload Plugin.
# Includes the runtime vendor/ (the update checker): run `composer install --no-dev` first.
set -euo pipefail

cd "$(dirname "$0")/.."

slug="divi5-image-mask"
version="$(sed -n "s/^define( 'D5IM_VERSION', '\(.*\)' );$/\1/p" "$slug.php")"

if [ ! -d vendor ]; then
  echo "vendor/ is missing. Run 'composer install --no-dev' first." >&2
  exit 1
fi

staging="$(mktemp -d)"
trap 'rm -rf "$staging"' EXIT

mkdir -p "$staging/$slug"
cp -R "$slug.php" README.md assets languages vendor "$staging/$slug/"

mkdir -p dist
rm -f "dist/$slug-$version.zip"
(cd "$staging" && zip -qr - "$slug") > "dist/$slug-$version.zip"

echo "Created dist/$slug-$version.zip"
