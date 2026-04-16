# PSI Performance Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the High Ridge Advisory homepage from PSI 38/31 (desktop/mobile) to 90+/75+ by fixing oversized images, replacing live third-party embeds with CSS facades, and removing render-blocking head content.

**Architecture:** Three passes on a single local-only branch: (1) regenerate all oversized images into responsive variants via a one-shot shell script, (2) replace live TidyCal + Google Maps embeds with static HTML/CSS facades that reuse the existing booking modal on click, (3) clean up head-of-page script loading order (defer analytics, remove placeholder GA tag, make animations.css non-blocking). All work stays on `perf/psi-fix` until user approves deploying.

**Tech Stack:** Static HTML/CSS/JS, no build pipeline. `cwebp` for WebP encoding, `convert` (ImageMagick) for resizing, Chrome headless (WSL2) for the one-time map screenshot, `python3 -m http.server` for local preview.

**Reference spec:** `docs/superpowers/specs/2026-04-16-psi-perf-fix-design.md`

---

## Task 1: Set up isolation branch

**Files:**
- Modify: git working tree (branch switch only, no file changes)

- [ ] **Step 1: Confirm working tree is clean**

Run:
```bash
git status
```
Expected: `nothing to commit, working tree clean` on branch `main`.

If not clean, STOP and resolve pending changes before continuing.

- [ ] **Step 2: Create and switch to perf branch off main**

Run:
```bash
git checkout -b perf/psi-fix
git status
```
Expected: `On branch perf/psi-fix ... nothing to commit, working tree clean`.

- [ ] **Step 3: Verify rollback paths still work**

Run:
```bash
git branch
```
Expected: at minimum `drafts`, `main`, `perf/psi-fix *`. Branch `perf/psi-fix` exists and is current.

(No commit yet — this task is branch setup only.)

---

## Task 2: Archive originals and regenerate image variants

**Files:**
- Create: `images/originals/` (directory)
- Create: `scripts/optimize-images.sh`
- Create: `images/about-hero-2560.webp`, `images/about-hero-1600.webp`, `images/about-hero-800.webp`
- Create: `images/services-hero-2560.webp`, `images/services-hero-1600.webp`, `images/services-hero-800.webp`
- Create: `images/logo-200.webp`
- Create: `images/about-steps-1200.webp`, `images/about-steps-600.webp`
- Move: the large source files (`about-hero.webp`, `services-hero.webp`, `about-steps.jpg`, and the existing `logo.webp`) into `images/originals/`

- [ ] **Step 1: Create originals directory and move source files into it**

Run:
```bash
mkdir -p images/originals
mv images/about-hero.webp images/originals/about-hero.webp
mv images/services-hero.webp images/originals/services-hero.webp
mv images/about-steps.jpg images/originals/about-steps.jpg
mv images/logo.webp images/originals/logo.webp
ls -la images/originals/
```
Expected output shows all 4 files in `images/originals/`.

- [ ] **Step 2: Create scripts directory and write the optimize script**

Run:
```bash
mkdir -p scripts
```

Create `scripts/optimize-images.sh` with:
```bash
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

# About-steps intro image: 1200 (retina display at 600 CSS px), 600 (1x)
encode_webp_widths "$ORIG/about-steps.jpg"     about-steps    1200 600

# Logo: single 200x200 variant (display size 100x100, covers retina)
echo "Generating $OUT/logo-200.webp..."
convert "$ORIG/logo.webp" -resize "200x200" -quality 80 "$OUT/logo-200.webp"

echo ""
echo "Done. File sizes:"
du -h "$OUT"/about-hero-*.webp "$OUT"/services-hero-*.webp "$OUT"/about-steps-*.webp "$OUT"/logo-200.webp
```

- [ ] **Step 3: Make the script executable and run it**

Run:
```bash
chmod +x scripts/optimize-images.sh
bash scripts/optimize-images.sh
```

Expected: all 9 variants are created. Approximate sizes (within 50% is fine):
- `about-hero-2560.webp` ~180 KB, `-1600.webp` ~90 KB, `-800.webp` ~40 KB
- `services-hero-2560.webp` ~180 KB, `-1600.webp` ~90 KB, `-800.webp` ~40 KB
- `about-steps-1200.webp` ~80 KB, `-600.webp` ~30 KB
- `logo-200.webp` ~4 KB

If any file is dramatically larger (say, >2× the target), bump `-quality 75` down to `70` in the script and re-run.

- [ ] **Step 4: Verify production images removed from top-level**

Run:
```bash
ls images/about-hero.webp images/services-hero.webp images/about-steps.jpg 2>/dev/null || echo "removed (expected)"
```
Expected: `removed (expected)`. The only top-level `about-hero*`, `services-hero*`, `about-steps*`, `logo*` files should be the new variants.

- [ ] **Step 5: Commit**

Run:
```bash
git add scripts/optimize-images.sh images/originals/ images/about-hero-*.webp images/services-hero-*.webp images/about-steps-*.webp images/logo-200.webp
git rm --cached images/about-hero.webp images/services-hero.webp images/about-steps.jpg images/logo.webp 2>/dev/null || true
git add -u
git commit -m "Generate responsive image variants and archive originals

Adds scripts/optimize-images.sh to produce WebP variants at the widths
actually used by the site (800/1600/2560 for heroes, 600/1200 for
about-steps, 200 for logo). Sources moved to images/originals/ so
variants can be regenerated at any time.

Cuts about-hero.webp from 6.3 MB to ~90 KB at typical desktop size
and services-hero.webp from 19 MB to ~90 KB.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Update logo `src` site-wide

**Files:**
- Modify: `index.html:128`, `index.html:743`
- Modify: `about.html` (nav logo + footer logo)
- Modify: `services.html` (nav logo + footer logo)
- Modify: `contact.html` (nav logo + footer logo)
- Modify: `disclosures.html` (nav logo + footer logo)
- Modify: `client-portal.html` (nav logo + footer logo)
- Modify: `second-opinion.html` (nav logo + footer logo)
- Modify: `thank-you.html` (nav logo + footer logo)
- Modify: `404.html` (nav logo + footer logo)

- [ ] **Step 1: Find every reference to `images/logo.webp`**

Run:
```bash
grep -rn "images/logo.webp" --include="*.html" .
```
Expected: 2 references per page × 9 pages = ~18 hits.

- [ ] **Step 2: Replace all references with `images/logo-200.webp`**

Run:
```bash
for f in index.html about.html services.html contact.html disclosures.html client-portal.html second-opinion.html thank-you.html 404.html; do
  sed -i 's|images/logo\.webp|images/logo-200.webp|g' "$f"
done
grep -rn "images/logo" --include="*.html" . | grep -v "logo-200"
```
Expected: second command shows no hits (every `logo.webp` is now `logo-200.webp`).

- [ ] **Step 3: Visual spot-check in the browser**

In one terminal, start the local server:
```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/` in the browser. Verify:
- Nav logo (top-left) renders sharp at 100×100 display size
- Scroll to footer. Footer logo renders sharp at 100×100 display size

Stop the server with Ctrl+C once confirmed.

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "Swap logo references to 200x200 variant

Display size is 100x100 in nav and footer; source was 1024x1024 (869 KB).
New logo-200.webp is ~4 KB and still crisp at 2x display density.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Replace hero `background-image` with responsive `image-set()` + preload

**Files:**
- Modify: `css/styles.css` (add new utility classes near `.hero` block starting at line 1006)
- Modify: `index.html:171` (hero section), `index.html:38-48` (head, preload hint)
- Modify: `about.html` (hero section + head)
- Modify: `services.html` (hero section + head)

The current pattern uses inline `style="background-image: url(...)"` on the hero `<section>`. We'll move the image URL into responsive CSS classes and add a preload hint in `<head>`.

- [ ] **Step 1: Add three new CSS utility classes to `styles.css`**

Append at the end of `css/styles.css`:

```css
/* ----------------------------------------
   Responsive hero backgrounds (PSI fix)
   ---------------------------------------- */
.hero--bg-about {
  background-image: url('../images/about-hero-800.webp');
  background-image: -webkit-image-set(
    url('../images/about-hero-800.webp') 1x,
    url('../images/about-hero-1600.webp') 2x
  );
  background-image: image-set(
    url('../images/about-hero-800.webp') 1x,
    url('../images/about-hero-1600.webp') 2x
  );
}
@media (min-width: 768px) {
  .hero--bg-about {
    background-image: url('../images/about-hero-1600.webp');
    background-image: -webkit-image-set(
      url('../images/about-hero-1600.webp') 1x,
      url('../images/about-hero-2560.webp') 2x
    );
    background-image: image-set(
      url('../images/about-hero-1600.webp') 1x,
      url('../images/about-hero-2560.webp') 2x
    );
  }
}

.hero--bg-services {
  background-image: url('../images/services-hero-800.webp');
  background-image: -webkit-image-set(
    url('../images/services-hero-800.webp') 1x,
    url('../images/services-hero-1600.webp') 2x
  );
  background-image: image-set(
    url('../images/services-hero-800.webp') 1x,
    url('../images/services-hero-1600.webp') 2x
  );
}
@media (min-width: 768px) {
  .hero--bg-services {
    background-image: url('../images/services-hero-1600.webp');
    background-image: -webkit-image-set(
      url('../images/services-hero-1600.webp') 1x,
      url('../images/services-hero-2560.webp') 2x
    );
    background-image: image-set(
      url('../images/services-hero-1600.webp') 1x,
      url('../images/services-hero-2560.webp') 2x
    );
  }
}
```

- [ ] **Step 2: Update `index.html` hero to use the class + add preload hint**

In `index.html`, change line 171 from:
```html
<section class="hero hero--left" style="background-image: url('images/about-hero.webp');">
```
to:
```html
<section class="hero hero--left hero--bg-about">
```

And in the `<head>` of `index.html`, add this line immediately after the `<meta name="theme-color">` tag (around line 34, before the Google Analytics block):
```html
<link rel="preload" as="image" href="images/about-hero-1600.webp"
      imagesrcset="images/about-hero-800.webp 800w, images/about-hero-1600.webp 1600w, images/about-hero-2560.webp 2560w"
      imagesizes="100vw" fetchpriority="high">
```

- [ ] **Step 3: Update `about.html` hero the same way**

In `about.html` line 177, change:
```html
<section class="hero hero--compact hero--about-left" style="background-image: url('images/about-hero.webp'); min-height: 75vh;">
```
to:
```html
<section class="hero hero--compact hero--about-left hero--bg-about" style="min-height: 75vh;">
```

Add the same preload hint in `about.html` `<head>` after the `<meta name="theme-color">` line:
```html
<link rel="preload" as="image" href="images/about-hero-1600.webp"
      imagesrcset="images/about-hero-800.webp 800w, images/about-hero-1600.webp 1600w, images/about-hero-2560.webp 2560w"
      imagesizes="100vw" fetchpriority="high">
```

- [ ] **Step 4: Update `services.html` hero**

In `services.html` line 187, change:
```html
<section class="hero hero--compact hero--services" style="background-image: url('images/services-hero.webp');">
```
to:
```html
<section class="hero hero--compact hero--services hero--bg-services">
```

Add preload hint in `services.html` `<head>` after `<meta name="theme-color">`:
```html
<link rel="preload" as="image" href="images/services-hero-1600.webp"
      imagesrcset="images/services-hero-800.webp 800w, images/services-hero-1600.webp 1600w, images/services-hero-2560.webp 2560w"
      imagesizes="100vw" fetchpriority="high">
```

- [ ] **Step 5: Visual verification in browser**

Run local server:
```bash
python3 -m http.server 8000
```

Open DevTools Network tab, set throttling to "Fast 3G", reload each page:
- `http://localhost:8000/` — hero image loads, matches production's crop/position
- `http://localhost:8000/about.html` — same
- `http://localhost:8000/services.html` — same

In Network tab filter by "Img", confirm:
- Mobile viewport (375 px emulation): the 800 variant loads
- Desktop viewport (1440 px): the 1600 variant loads
- 2x density emulation or a 4K viewport: the 2560 variant loads

Stop server with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add css/styles.css index.html about.html services.html
git commit -m "Serve hero backgrounds responsively via image-set + preload LCP

Replaces inline background-image style with hero--bg-about /
hero--bg-services utility classes that use image-set() and a
768px media query to pick the right variant. Adds preload hints
with fetchpriority=high so the LCP image downloads alongside HTML.

Cuts hero download on mobile from 6.3 MB/19 MB to ~40-90 KB.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Convert `about-steps` images to `<picture>` with `srcset`

**Files:**
- Modify: `index.html:193` (mobile intro image), `index.html:199` (desktop intro image)

- [ ] **Step 1: Replace the mobile-only `<img>` at line 193**

In `index.html`, change line 193 from:
```html
<img src="images/about-steps.jpg" alt="Person walking up steps symbolizing financial progress" width="600" height="400" loading="lazy">
```
to:
```html
<picture>
  <source type="image/webp"
          srcset="images/about-steps-600.webp 600w, images/about-steps-1200.webp 1200w"
          sizes="(max-width: 768px) 100vw, 600px">
  <img src="images/about-steps-600.webp"
       alt="Person walking up steps symbolizing financial progress"
       width="600" height="400" loading="lazy" fetchpriority="low">
</picture>
```

- [ ] **Step 2: Replace the desktop intro image at line 199**

In `index.html`, change line 199 from:
```html
<img src="images/about-steps.jpg" alt="Person walking up steps symbolizing financial progress" width="600" height="400" loading="lazy" style="width: 100%; height: auto; object-fit: contain; border-radius: 8px;">
```
to:
```html
<picture>
  <source type="image/webp"
          srcset="images/about-steps-600.webp 600w, images/about-steps-1200.webp 1200w"
          sizes="(max-width: 768px) 100vw, 600px">
  <img src="images/about-steps-600.webp"
       alt="Person walking up steps symbolizing financial progress"
       width="600" height="400" loading="lazy" fetchpriority="low"
       style="width: 100%; height: auto; object-fit: contain; border-radius: 8px;">
</picture>
```

- [ ] **Step 3: Verify in browser**

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`, scroll to the "We're Here to Simplify Your Financial Life" section. On mobile viewport (375 px) the image appears in the stacked mobile layout; on desktop (1440 px) it appears to the right of the copy. Both render without pixelation.

Stop server with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "Serve about-steps intro image via picture with responsive srcset

Was a single 3072x2048 JPG (1.4 MB) displayed at max 600x400.
Now a picture with 600/1200 WebP variants and fetchpriority=low
since the image is below the fold.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Add calendar facade CSS

**Files:**
- Modify: `css/styles.css` (append new `.calendar-facade` block)

- [ ] **Step 1: Append calendar facade styles**

Append to end of `css/styles.css`:

```css
/* ----------------------------------------
   Calendar facade (replaces live TidyCal embed on index/about/services)
   ---------------------------------------- */
.calendar-facade {
  position: relative;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  min-height: 360px;
  display: flex;
  flex-direction: column;
}
.calendar-facade__label {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--gray-500);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 12px;
  text-align: center;
}
.calendar-facade__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 8px;
}
.calendar-facade__weekday {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--gray-700);
  text-align: center;
  padding: 6px 0;
}
.calendar-facade__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  filter: blur(0.5px);
  opacity: 0.85;
}
.calendar-facade__day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--gray-100);
  color: var(--gray-500);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
}
.calendar-facade__day--available {
  background: var(--navy-800);
  color: #fff;
  box-shadow: 0 2px 4px rgba(26, 54, 93, 0.25);
}
.calendar-facade__day--muted {
  opacity: 0.3;
}
.calendar-facade__overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 32px 24px 24px;
  background: linear-gradient(to top, rgba(255, 255, 255, 0.98) 50%, rgba(255, 255, 255, 0) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.calendar-facade__cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--navy-800);
  color: #fff;
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 600;
  padding: 14px 28px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  text-decoration: none;
  box-shadow: 0 8px 20px rgba(15, 39, 68, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.calendar-facade__cta:hover,
.calendar-facade__cta:focus-visible {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(15, 39, 68, 0.4);
}
.calendar-facade__cta-sub {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--gray-500);
}
```

- [ ] **Step 2: Commit**

```bash
git add css/styles.css
git commit -m "Add calendar facade styles

New .calendar-facade component renders a static mock booking
calendar with a prominent CTA overlay. Used on index/about/services
to replace the live TidyCal iframe and eliminate its ~2 MB JS load.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Replace inline TidyCal with calendar facade on all three pages

**Files:**
- Modify: `index.html:672`, `index.html:691`
- Modify: `about.html:349`, `about.html:354`
- Modify: `services.html:470`, `services.html:475`

The three pages have the same structure: a `<div class="tidycal-embed">` followed (sometimes several lines later) by `<script src="https://asset-tidycal.b-cdn.net/js/embed.js" async>`. Both get replaced.

- [ ] **Step 1: Replace `<div class="tidycal-embed">` on index.html:672**

In `index.html`, replace line 672:
```html
<div class="tidycal-embed" data-path="high-ridge-advisory/initial-consultation"></div>
```
with this full facade block:
```html
<div class="calendar-facade" aria-hidden="true">
  <div class="calendar-facade__label">Upcoming Availability</div>
  <div class="calendar-facade__weekdays">
    <div class="calendar-facade__weekday">Mon</div>
    <div class="calendar-facade__weekday">Tue</div>
    <div class="calendar-facade__weekday">Wed</div>
    <div class="calendar-facade__weekday">Thu</div>
    <div class="calendar-facade__weekday">Fri</div>
    <div class="calendar-facade__weekday">Sat</div>
    <div class="calendar-facade__weekday">Sun</div>
  </div>
  <div class="calendar-facade__grid">
    <div class="calendar-facade__day calendar-facade__day--muted">28</div>
    <div class="calendar-facade__day calendar-facade__day--muted">29</div>
    <div class="calendar-facade__day calendar-facade__day--muted">30</div>
    <div class="calendar-facade__day">1</div>
    <div class="calendar-facade__day calendar-facade__day--available">2</div>
    <div class="calendar-facade__day">3</div>
    <div class="calendar-facade__day">4</div>
    <div class="calendar-facade__day">5</div>
    <div class="calendar-facade__day calendar-facade__day--available">6</div>
    <div class="calendar-facade__day">7</div>
    <div class="calendar-facade__day">8</div>
    <div class="calendar-facade__day calendar-facade__day--available">9</div>
    <div class="calendar-facade__day">10</div>
    <div class="calendar-facade__day">11</div>
    <div class="calendar-facade__day calendar-facade__day--available">12</div>
    <div class="calendar-facade__day">13</div>
    <div class="calendar-facade__day">14</div>
    <div class="calendar-facade__day calendar-facade__day--available">15</div>
    <div class="calendar-facade__day">16</div>
    <div class="calendar-facade__day">17</div>
    <div class="calendar-facade__day">18</div>
    <div class="calendar-facade__day calendar-facade__day--available">19</div>
    <div class="calendar-facade__day">20</div>
    <div class="calendar-facade__day">21</div>
    <div class="calendar-facade__day">22</div>
    <div class="calendar-facade__day calendar-facade__day--available">23</div>
    <div class="calendar-facade__day">24</div>
    <div class="calendar-facade__day">25</div>
    <div class="calendar-facade__day">26</div>
  </div>
  <div class="calendar-facade__overlay">
    <a href="#" data-booking class="calendar-facade__cta">Schedule a Consultation →</a>
    <div class="calendar-facade__cta-sub">30-minute complimentary discovery call</div>
  </div>
</div>
```

- [ ] **Step 2: Remove the TidyCal embed script on index.html**

In `index.html`, delete line 691 entirely:
```html
<script src="https://asset-tidycal.b-cdn.net/js/embed.js" async></script>
```

- [ ] **Step 3: Repeat the same two replacements on `about.html`**

Replace `about.html:349` with the same full facade block from Step 1. Delete `about.html:354` (the TidyCal embed script).

- [ ] **Step 4: Repeat on `services.html`**

Replace `services.html:470` with the same full facade block. Delete `services.html:475` (the TidyCal embed script).

- [ ] **Step 5: Verify no TidyCal embed references remain**

Run:
```bash
grep -rn "tidycal-embed\|asset-tidycal.b-cdn.net" --include="*.html" .
```
Expected: no output (all references removed).

- [ ] **Step 6: Browser verification**

```bash
python3 -m http.server 8000
```

On each of `/`, `/about.html`, `/services.html`:
- CTA banner section renders with calendar facade on the left and "Ready to Take the Next Step?" column on the right
- Calendar facade shows a weekly grid with some highlighted cells
- "Schedule a Consultation →" button is prominent over the lower portion
- Click the button → booking modal opens with TidyCal iframe inside (after ≤3 s bot-gate on first click)
- Modal close, Escape key, backdrop click all still work
- Also verify the nav "Book a Meeting" button on each page still opens the same modal

Stop server with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add index.html about.html services.html
git commit -m "Replace inline TidyCal embed with calendar facade

Removes 2+ MB of third-party JS (booking-page.js, reCAPTCHA, Stripe)
from index/about/services initial loads. Facade reuses the existing
booking modal: clicking the CTA opens TidyCal on demand.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Clean up analytics script loading

**Files:**
- Modify: `js/analytics.js:6`, `js/analytics.js:29-32`
- Modify: `<head>` of all 9 HTML files (remove placeholder gtag tag, add `defer` to analytics.js)

- [ ] **Step 1: Remove placeholder `gtag` config from `analytics.js`**

In `js/analytics.js`, delete lines 5-6:
```javascript
// Google Analytics Measurement ID - Replace with actual ID when available
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
```

And delete lines 27-32 (the placeholder `gtag('config', ...)` block):
```javascript
// Initialize GA4
gtag('js', new Date());
gtag('config', GA_MEASUREMENT_ID, {
  'anonymize_ip': true,
  'cookie_flags': 'SameSite=None;Secure'
});
```

Keep everything else — the `dataLayer` init, consent logic, custom event handlers all stay.

- [ ] **Step 2: Remove the placeholder gtag script tag from all 9 HTML files**

Run:
```bash
for f in index.html about.html services.html contact.html disclosures.html client-portal.html second-opinion.html thank-you.html 404.html; do
  # Remove the Google Analytics script tag with the XXXXXXXXXX placeholder, plus the preceding comment line
  python3 <<PY
import re
with open("$f", "r") as fh:
    content = fh.read()
# Remove the comment + tag pair
content = re.sub(r'\s*<!-- Google Analytics -->\s*\n\s*<script async src="https://www\.googletagmanager\.com/gtag/js\?id=G-XXXXXXXXXX"></script>\s*\n', '\n', content)
# In case comment is absent on some pages, also remove bare tag
content = re.sub(r'\s*<script async src="https://www\.googletagmanager\.com/gtag/js\?id=G-XXXXXXXXXX"></script>\s*\n', '\n', content)
with open("$f", "w") as fh:
    fh.write(content)
PY
done
grep -rn "G-XXXXXXXXXX" --include="*.html" .
```
Expected: second command shows no hits.

- [ ] **Step 3: Add `defer` attribute to `analytics.js` script tag in all 9 HTML files**

Run:
```bash
for f in index.html about.html services.html contact.html disclosures.html client-portal.html second-opinion.html thank-you.html 404.html; do
  sed -i 's|<script src="js/analytics\.js"></script>|<script src="js/analytics.js" defer></script>|' "$f"
done
grep -rn "js/analytics.js" --include="*.html" . | grep -v "defer"
```
Expected: second command shows no hits (every `analytics.js` now has `defer`).

- [ ] **Step 4: Verify analytics still work in browser**

```bash
python3 -m http.server 8000
```

Open DevTools Console on `http://localhost:8000/`:
- Run: `window.dataLayer` — should return an array (not undefined)
- Click any CTA button on the page
- Run: `window.dataLayer` again — should now include a `cta_click` event object
- Confirm: no errors in Console related to `analytics.js` or `gtag`

Clear localStorage (`localStorage.clear()` in Console) and reload. Verify the cookie consent banner appears after the 1-second delay.

Stop server with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add js/analytics.js index.html about.html services.html contact.html disclosures.html client-portal.html second-opinion.html thank-you.html 404.html
git commit -m "Remove placeholder GA tag and defer analytics.js

The G-XXXXXXXXXX placeholder was loading 133 KB of useless JS on
every page. Real GA4 (G-MDNVPSWCJ1) is injected at deploy time via
Netlify snippet injection, so removing the placeholder is safe.

Also removes the dead gtag('config') call from analytics.js and
defers the script so it no longer blocks render. Custom event
tracking still fires via dataLayer.push, which GTM picks up.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Non-blocking `animations.css` + preconnect hints

**Files:**
- Modify: `<head>` of all 9 HTML files

- [ ] **Step 1: Replace every blocking `animations.css` link with a preload + noscript fallback**

For each HTML file, replace:
```html
<link rel="stylesheet" href="css/animations.css">
```
with:
```html
<link rel="preload" href="css/animations.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="css/animations.css"></noscript>
```

Run (one-shot across all 9):
```bash
for f in index.html about.html services.html contact.html disclosures.html client-portal.html second-opinion.html thank-you.html 404.html; do
  python3 <<PY
with open("$f", "r") as fh:
    content = fh.read()
old = '<link rel="stylesheet" href="css/animations.css">'
new = '<link rel="preload" href="css/animations.css" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">\n  <noscript><link rel="stylesheet" href="css/animations.css"></noscript>'
content = content.replace(old, new)
with open("$f", "w") as fh:
    fh.write(content)
PY
done
grep -c 'rel="preload" href="css/animations.css"' index.html about.html services.html contact.html disclosures.html client-portal.html second-opinion.html thank-you.html 404.html
```
Expected: each file returns `1`.

- [ ] **Step 2: Add preconnect hints for TidyCal origins to all 9 HTML files**

The current `<head>` has preconnect hints for Google Fonts. Add two more lines immediately after the existing `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` line:
```html
<link rel="preconnect" href="https://asset-tidycal.b-cdn.net" crossorigin>
<link rel="preconnect" href="https://tidycal.com">
```

Run:
```bash
for f in index.html about.html services.html contact.html disclosures.html client-portal.html second-opinion.html thank-you.html 404.html; do
  python3 <<PY
with open("$f", "r") as fh:
    content = fh.read()
old = '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
new = old + '\n  <link rel="preconnect" href="https://asset-tidycal.b-cdn.net" crossorigin>\n  <link rel="preconnect" href="https://tidycal.com">'
if old in content and '<link rel="preconnect" href="https://asset-tidycal.b-cdn.net"' not in content:
    content = content.replace(old, new)
with open("$f", "w") as fh:
    fh.write(content)
PY
done
grep -c 'preconnect.*asset-tidycal' index.html about.html services.html contact.html disclosures.html client-portal.html second-opinion.html thank-you.html 404.html
```
Expected: each file returns `1`.

- [ ] **Step 3: Verify `second-opinion.css` is only on pages that need it**

Run:
```bash
grep -rn 'second-opinion\.css' --include="*.html" .
```
Expected: 2 hits only — `index.html` and `second-opinion.html`. If any other HTML file references it, remove that reference. (Based on inspection today there should be no others — this is a confirmation step.)

- [ ] **Step 4: Browser verification**

```bash
python3 -m http.server 8000
```

On `http://localhost:8000/`:
- Animations still work (scroll the page, the `data-animate` fade-in sections still animate in)
- No FOUT longer than ~100 ms on initial load
- DevTools Network → confirm `animations.css` loads but doesn't block render (no "pending" delay before first paint)

Also spot-check `/second-opinion.html` — the quiz renders with all its styling.

Stop server with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "Make animations.css non-blocking and add TidyCal preconnect hints

animations.css now loads via rel=preload with onload swap, so it
doesn't delay first paint. TidyCal preconnects let the browser
establish the connection early so the booking modal opens faster
when a user clicks a scheduling CTA.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Capture static map image and add facade CSS

**Files:**
- Create: `images/map-mckinney.webp`
- Create: `images/map-mckinney.png` (temporary intermediate — deleted after conversion)
- Modify: `css/styles.css` (append `.map-facade` block)

- [ ] **Step 1: Capture one-time map screenshot via headless Chrome**

Run (uses the same WSL2 Chrome pattern as `capture-pages.sh`):
```bash
CHROME="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
WIN_DIR=$(wslpath -w "$(pwd)/images")
WIN_TEMP="C:\\Users\\Kyle\\AppData\\Local\\Temp"

taskkill.exe /F /IM chrome.exe 2>/dev/null
sleep 2

MAPS_URL='https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3343.5484896344776!2d-96.61626788481045!3d33.19817598085188!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x864c15d7f9b4e6c9%3A0x7c4d7e7a8d1b3f0e!2s208%20E%20Louisiana%20St%2C%20McKinney%2C%20TX%2075069!5e0!3m2!1sen!2sus!4v1702500000000!5m2!1sen!2sus'

"$CHROME" --headless --disable-gpu --no-sandbox --no-first-run \
  --screenshot="${WIN_DIR}\\map-mckinney.png" \
  --window-size=1024,400 \
  --virtual-time-budget=8000 \
  --user-data-dir="${WIN_TEMP}\\chrome-map-capture" \
  "$MAPS_URL"

sleep 2
ls -la images/map-mckinney.png
```

Expected: `images/map-mckinney.png` exists, ~200–400 KB.

- [ ] **Step 2: Visual check of the captured map**

Open `images/map-mckinney.png` in a file viewer. Confirm:
- Shows the McKinney location (street-level zoom)
- Pin is visible
- No "log in to Google Maps" overlay obscuring the map
- Street names legible

If the image is wrong (e.g., all-gray because Maps didn't finish loading in 8 s), bump `--virtual-time-budget=12000` and re-run Step 1.

- [ ] **Step 3: Convert to WebP and clean up PNG**

```bash
cwebp -q 80 images/map-mckinney.png -o images/map-mckinney.webp
ls -la images/map-mckinney.webp
rm images/map-mckinney.png
```
Expected: WebP is ~30–60 KB.

- [ ] **Step 4: Append `.map-facade` styles to `styles.css`**

Append to end of `css/styles.css`:

```css
/* ----------------------------------------
   Map facade (replaces Google Maps iframe on index + contact)
   ---------------------------------------- */
.map-facade {
  position: relative;
  display: block;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  text-decoration: none;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.map-facade:hover,
.map-facade:focus-visible {
  transform: translateY(-2px);
  box-shadow: var(--shadow-xl);
}
.map-facade img {
  display: block;
  width: 100%;
  height: auto;
}
.map-facade__pin {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 32px;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
  pointer-events: none;
}
.map-facade__cta {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  color: var(--navy-800);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 600;
  padding: 10px 16px;
  border-radius: 999px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
```

- [ ] **Step 5: Commit**

```bash
git add images/map-mckinney.webp css/styles.css
git commit -m "Capture static office map image and add map facade styles

One-time screenshot of the McKinney office location via headless
Chrome. WebP at ~30-60 KB replaces the ~350 KB Google Maps iframe
on click-to-open-in-Google-Maps pattern.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Replace Google Maps iframe on index.html and contact.html

**Files:**
- Modify: `index.html:720-731` (iframe wrapper block)
- Modify: `contact.html:285` (iframe — exact line needs confirmation on the file; search for `google.com/maps/embed`)

- [ ] **Step 1: Replace iframe block on `index.html`**

Find the block in `index.html` that starts around line 720:
```html
<div data-animate="fade-in" style="border-radius: 8px; overflow: hidden; box-shadow: var(--shadow-lg);">
  <iframe
    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3343.5484896344776!2d-96.61626788481045!3d33.19817598085188!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x864c15d7f9b4e6c9%3A0x7c4d7e7a8d1b3f0e!2s208%20E%20Louisiana%20St%2C%20McKinney%2C%20TX%2075069!5e0!3m2!1sen!2sus!4v1702500000000!5m2!1sen!2sus"
    width="100%"
    height="400"
    style="border:0;"
    allowfullscreen=""
    loading="lazy"
    referrerpolicy="no-referrer-when-downgrade"
    title="High Ridge Advisory office location on Google Maps">
  </iframe>
</div>
```

Replace with:
```html
<div data-animate="fade-in">
  <a href="https://maps.google.com/?q=208+E+Louisiana+Street+Suite+301+McKinney+Texas+75069"
     target="_blank" rel="noopener noreferrer"
     class="map-facade"
     aria-label="View High Ridge Advisory office location in Google Maps">
    <img src="images/map-mckinney.webp"
         alt="Map showing High Ridge Advisory office in McKinney, Texas"
         width="1024" height="400" loading="lazy">
    <span class="map-facade__pin" aria-hidden="true">📍</span>
    <span class="map-facade__cta">Open in Google Maps →</span>
  </a>
</div>
```

- [ ] **Step 2: Find the iframe block on `contact.html`**

Run:
```bash
grep -n "google.com/maps/embed\|maps/embed?pb" contact.html
```
Note the line number(s) where the iframe appears. Inspect ~10 lines around it to capture the full wrapper `<div>` or `<figure>` block.

- [ ] **Step 3: Replace iframe block on `contact.html` with the same map facade markup**

Using the same replacement pattern from Step 1, substitute the iframe for the `<a class="map-facade">` block. Preserve any surrounding wrapper element classes (`data-animate`, section wrapper, etc.) — only the iframe itself changes.

- [ ] **Step 4: Verify no Maps iframes remain**

Run:
```bash
grep -rn "google.com/maps/embed" --include="*.html" .
```
Expected: no output.

- [ ] **Step 5: Browser verification**

```bash
python3 -m http.server 8000
```

On `http://localhost:8000/`:
- Scroll to the "Get In Touch" section near the footer. Map facade renders at the right side, showing the McKinney map with pin + "Open in Google Maps" pill
- Hover: subtle lift
- Click: opens Google Maps in a new tab with the correct query

On `http://localhost:8000/contact.html`:
- Same behavior for the contact page's map block

Stop server with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add index.html contact.html
git commit -m "Replace Google Maps iframes with static map facades

Saves ~350 KB of Maps JS and ~230 ms of main-thread work per page.
Facade links to Google Maps in a new tab so users still get
directions — arguably better UX on mobile where the native map
app opens.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Clean up unused backup images

**Files:**
- Delete: `images/about-hero-backup.jpg`, `images/about-hero-original.jpg`, `images/about-hiking-original.jpg`, `images/about-steps-original.jpg`, `images/contact-hero-original.jpg`, `images/eric-caisse-original.jpg`, `images/jay-madden-original.jpg`, `images/kyle-harrison-original.jpg`, `images/risk-spectrum-original.png`, `images/services-hero-backup.avif`

- [ ] **Step 1: Confirm none of these files are referenced in the codebase**

Run:
```bash
for img in about-hero-backup.jpg about-hero-original.jpg about-hiking-original.jpg about-steps-original.jpg contact-hero-original.jpg eric-caisse-original.jpg jay-madden-original.jpg kyle-harrison-original.jpg risk-spectrum-original.png services-hero-backup.avif; do
  hits=$(grep -rn "images/$img" --include="*.html" --include="*.css" --include="*.js" . | wc -l)
  echo "$img: $hits references"
done
```
Expected: every file shows `0 references`.

If any file has references, STOP. Do not delete it. Report the finding and skip it from this task.

- [ ] **Step 2: Delete unreferenced backup images**

Run:
```bash
git rm images/about-hero-backup.jpg images/about-hero-original.jpg images/about-hiking-original.jpg images/about-steps-original.jpg images/contact-hero-original.jpg images/eric-caisse-original.jpg images/jay-madden-original.jpg images/kyle-harrison-original.jpg images/risk-spectrum-original.png images/services-hero-backup.avif
```

If any file doesn't exist or was skipped in Step 1, remove it from the command.

- [ ] **Step 3: Commit**

```bash
git commit -m "Remove unreferenced backup images from /images/

None of these files were linked from HTML, CSS, or JS. Removing
them trims the repo size and reduces confusion about which images
are actually in use.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Final verification — full manual checklist and Lighthouse

**Files:**
- No code changes. This is the verification gate before handing control back.

- [ ] **Step 1: Start local server for verification**

```bash
python3 -m http.server 8000
```
Leave running through the rest of this task.

- [ ] **Step 2: Run through the manual browser checklist from the spec**

Open the design spec: `docs/superpowers/specs/2026-04-16-psi-perf-fix-design.md`. Run through the entire "§4.1 Manual browser checklist" section. Any item that fails: STOP, note it, and fix before continuing.

Walk through all 9 pages at 3 viewport widths (375 px, 768 px, 1440 px) and check every item listed. Do not shortcut this — it's the entire safety net.

- [ ] **Step 3: Run Lighthouse against the homepage**

In Chrome (not incognito necessarily — localhost usually avoids extension interference anyway):
- Open DevTools → Lighthouse tab
- Mode: Navigation
- Device: Mobile, then Desktop (two separate runs)
- Categories: Performance (minimum)
- Throttling: Simulated throttling (default)
- Run twice for each device to confirm stability

Record the following numbers in a new file `docs/superpowers/specs/2026-04-16-psi-perf-fix-results.md`:

```markdown
# PSI Perf Fix — Results

**Date:** [today]
**Branch:** perf/psi-fix
**Measured at:** http://localhost:8000/

## Lighthouse (mobile)

| Metric | Before | After | Target | Met? |
|---|---|---|---|---|
| Performance score | 31 | ? | ≥75 | ? |
| FCP | 9.9 s | ? | ≤2.5 s | ? |
| LCP | 59.7 s | ? | ≤4.0 s | ? |
| TBT | 1,260 ms | ? | ≤300 ms | ? |
| CLS | 0 | ? | ≤0.1 | ? |

## Lighthouse (desktop)

| Metric | Before | After | Target | Met? |
|---|---|---|---|---|
| Performance score | 38 | ? | ≥90 | ? |
| FCP | 0.7 s | ? | ≤1.0 s | ? |
| LCP | 7.2 s | ? | ≤2.5 s | ? |
| TBT | 1,850 ms | ? | ≤200 ms | ? |
| CLS | 0.011 | ? | ≤0.1 | ? |

## Notes

[Anything unexpected, any checklist items that failed, any targets missed and why]
```

- [ ] **Step 4: Run Lighthouse against a second page to confirm fixes propagate**

Same procedure on `http://localhost:8000/services.html` (the page with the former 19 MB hero). Record results in the same results file under a new heading "Services page Lighthouse." Document both mobile and desktop.

- [ ] **Step 5: Stop local server**

Ctrl+C the server.

- [ ] **Step 6: Commit results file**

```bash
git add docs/superpowers/specs/2026-04-16-psi-perf-fix-results.md
git commit -m "Record Lighthouse before/after numbers for PSI fix

Captures actual measured performance improvements after
implementing the design. Full numbers recorded for index and
services pages, mobile and desktop.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 7: Hand back to user**

Report to the user:
1. Lighthouse numbers (paste the tables)
2. Whether all target metrics were met
3. Any items from the manual checklist that couldn't be verified or failed
4. Branch state: `perf/psi-fix` with 12 commits since `main`
5. Next step options:
   - Merge to `drafts` for Netlify preview deploy (requires user approval — not auto)
   - Keep iterating on items that missed targets
   - Abandon and `git checkout main`

Do not push, merge, or deploy without explicit user approval.

---

## Self-review notes (kept for the plan author only)

**Spec coverage check:**
- §3.1 image remediation → Tasks 2, 3, 4, 5 ✓
- §3.2 calendar facade → Tasks 6, 7 ✓
- §3.3 script loading cleanup → Tasks 8, 9 ✓ (including `second-opinion.css` verification in Task 9 Step 3)
- §3.4 map facade → Tasks 10, 11 ✓
- §3.5 workflow (branch + local preview) → Task 1 ✓
- §4.1 manual checklist → Task 13 Step 2 ✓
- §4.2 Lighthouse verification → Task 13 Steps 3-4 ✓
- §4.3 target metrics → Task 13 Step 3 (results file uses the target table) ✓
- §5 future improvements → documented in spec, not in plan (out of scope for this implementation) ✓
- §6 out of scope → respected (no GTM/Pixel/Clarity touches, no build pipeline) ✓
- §7 rollback → Task 1 Step 3, also mentioned in Task 13 Step 7 ✓

**Type / name consistency:**
- `.calendar-facade` + BEM-style modifiers used consistently between Task 6 (CSS) and Task 7 (HTML) ✓
- `.map-facade` + `__pin` + `__cta` consistent between Task 10 (CSS) and Task 11 (HTML) ✓
- Image variant filenames (`about-hero-2560.webp` etc.) consistent between Task 2 (generation), Task 4 (CSS), and the preload hints ✓
- Branch name `perf/psi-fix` consistent throughout ✓
