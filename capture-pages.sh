#!/bin/bash
# Capture all website pages as full-page screenshots for compliance record-keeping.
# Uses Chrome's --screenshot with a tall viewport to capture the full scrollable page.
# Source: Netlify preview site (for pre-approval of changes before going live).
#
# Usage: bash capture-pages.sh
# Output: PNGs saved to ./compliance-pdfs/

SITE_URL="https://hra-website.netlify.app"
OUTPUT_DIR="./compliance-pdfs"
TODAY=$(date +%Y-%m-%d)
CHROME="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
WIN_DIR=$(wslpath -w "$(pwd)/compliance-pdfs")
WIN_TEMP="C:\\Users\\Kyle\\AppData\\Local\\Temp"

mkdir -p "$OUTPUT_DIR"

declare -A PAGES
PAGES=(
  ["Home"]="/"
  ["About"]="/about.html"
  ["Services"]="/services.html"
  ["Contact"]="/contact.html"
  ["Disclosures"]="/disclosures.html"
  ["Client-Portal"]="/client-portal.html"
  ["Second-Opinion"]="/second-opinion.html"
  ["Thank-You"]="/thank-you.html"
  ["404"]="/404.html"
)

echo "=== High Ridge Advisory - Compliance Screenshot Capture ==="
echo "Source: $SITE_URL (Netlify preview)"
echo "Date: $TODAY"
echo ""

for name in Home About Services Contact Disclosures Client-Portal Second-Opinion Thank-You 404; do
  page_path="${PAGES[$name]}"
  url="${SITE_URL}${page_path}"
  filename="HighRidge_${name}_${TODAY}.png"

  echo "Capturing: $url"

  taskkill.exe /F /IM chrome.exe 2>/dev/null
  sleep 2

  "$CHROME" --headless --disable-gpu --no-sandbox --no-first-run \
    --screenshot="${WIN_DIR}\\${filename}" \
    --window-size=1440,8000 \
    --virtual-time-budget=5000 \
    --user-data-dir="${WIN_TEMP}\\chrome-ss-${name}" \
    "$url" 2>/dev/null
  sleep 3

  if [ -f "$OUTPUT_DIR/$filename" ]; then
    size=$(du -h "$OUTPUT_DIR/$filename" | cut -f1)
    echo "  -> Saved: $filename ($size)"
  else
    echo "  -> WARNING: Failed to save $filename"
  fi
done

taskkill.exe /F /IM chrome.exe 2>/dev/null

echo ""
echo "Done! All screenshots saved to $OUTPUT_DIR/"
echo ""
ls -lh "$OUTPUT_DIR"/HighRidge_*_${TODAY}.png 2>/dev/null
