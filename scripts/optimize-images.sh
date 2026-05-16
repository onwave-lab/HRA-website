#!/bin/bash
# Regenerate responsive image variants from images/originals/.
# Idempotent — run any time originals change or variants are missing.
#
# Requires: cwebp (webp package), convert (ImageMagick).
# Usage: bash scripts/optimize-images.sh

set -euo pipefail

ORIG="images/originals"
OUT="images"

if [ ! -d "$ORIG" ]; then
  echo "ERROR: $ORIG does not exist. Originals must be archived there first."
  exit 1
fi

encode_webp_widths() {
  # $1 = source file path
  # $2 = output basename (no extension)
  # $3..$n = widths in pixels
  local src="$1"; shift
  local base="$1"; shift
  for w in "$@"; do
    local dest="$OUT/${base}-${w}.webp"
    echo "Generating $dest (width=$w)..."
    convert "$src" -resize "${w}x>" -quality 75 -define webp:method=6 "$dest"
  done
}

# Heroes: 2560 (retina desktop), 1600 (desktop / retina tablet), 800 (mobile)
encode_webp_widths "$ORIG/about-hero.webp"     about-hero     2560 1600 800
encode_webp_widths "$ORIG/services-hero.webp"  services-hero  2560 1600 800
# Contact hero source is 1486w, so 2560 would just upscale — skip it.
encode_webp_widths "$ORIG/contact-hero.jpg"    contact-hero   1600 800

# About-steps intro image: 1200 (retina display at 600 CSS px), 600 (1x)
encode_webp_widths "$ORIG/about-steps.jpg"     about-steps    1200 600

# About-hiking intro image: 1200 (retina at 600 CSS px), 600 (1x)
encode_webp_widths "$ORIG/about-hiking.jpg"    about-hiking   1200 600

# Logo: single 200x200 variant (display size 100x100, covers retina)
echo "Generating $OUT/logo-200.webp..."
convert "$ORIG/logo.webp" -resize "200x200" -quality 80 "$OUT/logo-200.webp"

# Schwab logo: display 64x64, generate 128 for 2x retina
echo "Generating $OUT/schwab-logo-128.webp..."
convert "$ORIG/schwab-logo.png" -resize "128x128" -quality 85 -define webp:method=6 "$OUT/schwab-logo-128.webp"

echo ""
echo "Done. File sizes:"
du -h "$OUT"/about-hero-*.webp "$OUT"/services-hero-*.webp "$OUT"/contact-hero-*.webp \
      "$OUT"/about-steps-*.webp "$OUT"/about-hiking-*.webp \
      "$OUT"/logo-200.webp "$OUT"/schwab-logo-128.webp
