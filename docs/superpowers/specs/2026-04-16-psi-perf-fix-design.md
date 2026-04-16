# PSI Performance Remediation — Design

**Date:** 2026-04-16
**Branch:** `perf/psi-fix` (off `main`, local-only during this session)
**Scope:** High Ridge Advisory website — all 9 pages
**Rollback target:** `git checkout drafts` (the Netlify preview branch)

---

## 1. Background

A PageSpeed Insights audit of `https://highridgeadvisory.com/` on 2026-04-16 returned:

| Metric | Desktop | Mobile |
|---|---|---|
| Performance score | 38 | 31 |
| First Contentful Paint | 0.7 s | 9.9 s |
| Largest Contentful Paint | 7.2 s | 59.7 s |
| Total Blocking Time | 1,850 ms | 1,260 ms |
| Cumulative Layout Shift | 0.011 | 0 |

PSI tests a single URL at a time, so this report covers only the homepage. However, the dominant issues are site-wide (same hero images, same third-party scripts, same inline booking widgets on index/about/services), so fixes propagate to every page.

### Root causes identified

1. **Hero images loaded via CSS `background-image` at full source size.**
   - `about-hero.webp` — 6.3 MB (used on index + about)
   - `services-hero.webp` — 19 MB (used on services)
   - `logo.webp` — 869 KB at 1024×1024 displayed at 100×100
   - `about-steps.jpg` — 1.4 MB at 3072×2048 displayed at 560×373

2. **TidyCal inline embed on index / about / services** loads `booking-page.js` (1.1–1.3 s CPU), reCAPTCHA (1.8 s CPU), and Stripe (480 ms CPU) on every page load — even though the booking modal (`booking-modal.js`) already handles scheduling from every CTA.

3. **Google Maps iframe on index + contact** pulls ~350 KB of Maps JS and runs ~230 ms of main-thread work.

4. **Render-blocking head content:**
   - Synchronous `analytics.js`
   - A placeholder `gtag` snippet (`G-XXXXXXXXXX`) downloading 133 KB for nothing — the real GA4 ID (`G-MDNVPSWCJ1`) and GTM container (`GTM-NTZ7CVBL`) are injected at deploy time via Netlify's Snippet Injection, not from the repo
   - `animations.css` blocks render even though its styles are non-critical
   - `second-opinion.css` blocks render on pages that don't have the quiz

---

## 2. Goals / Non-goals

### Goals
- Reduce homepage initial payload from ~16 MB to <500 KB.
- Reduce TBT by eliminating third-party JS from the initial load path.
- Maintain the current visual design — no user-visible regressions on desktop or mobile.
- Preserve all analytics / tracking behavior.
- Keep the work isolated on a local-only branch with a clean rollback path.

### Non-goals
- Changing the information architecture or copy.
- Introducing a build pipeline (bundler, minifier, image optimizer as a step). Image optimization is a one-time script; HTML/CSS/JS stay as source.
- Replacing TidyCal, GTM, Facebook Pixel, Clarity, or any other third party.
- Rewriting the scheduling flow. The existing booking modal stays as-is.

---

## 3. Design

### 3.1 Image remediation (LCP)

**Target:** Cut image payload on the critical path from ~8.6 MB to ~200 KB.

**New image set** (generated once via `scripts/optimize-images.sh` using `cwebp`):

| Source | New variants | Format | Notes |
|---|---|---|---|
| `about-hero.webp` (6.3 MB) | `about-hero-2560.webp` (~180 KB), `about-hero-1600.webp` (~90 KB), `about-hero-800.webp` (~40 KB) | WebP q=75 | index + about heroes |
| `services-hero.webp` (19 MB) | `services-hero-2560.webp`, `-1600.webp`, `-800.webp` | WebP q=75 | services hero |
| `logo.webp` (869 KB, 1024×1024) | `logo-200.webp` (~4 KB, 200×200) | WebP q=80 | nav + footer, displayed 100×100 |
| `about-steps.jpg` (1.4 MB, 3072×2048) | `about-steps-1200.webp`, `about-steps-600.webp` | WebP q=75 | intro section |

**Originals** move to `images/originals/` (tracked in git) for future re-encoding.

**HTML/CSS changes:**
- **Hero sections** — keep `background-image` but use CSS `image-set()` with `-webkit-` fallback and `@media` queries: 800px variant <768px, 1600px for tablet, 2560px for desktop. Add `<link rel="preload" as="image" imagesrcset="..." imagesizes="...">` in `<head>` of each page for the LCP image.
- **Logo** — swap `src` to `logo-200.webp`. Keep `width/height="100"`.
- **about-steps** — convert the two `<img>` tags to `<picture>` with `srcset` + explicit `sizes`. Add `fetchpriority="low"` (below the fold).

**Script:** `scripts/optimize-images.sh` — idempotent, runs `cwebp` over sources to regenerate variants. Committed so future image additions (nature-story work) can reuse the pipeline.

### 3.2 Calendar facade (TBT)

**Target:** Remove ~2 MB of JS and ~4 s of main-thread work from index / about / services initial loads.

**Remove:**
- `<div class="tidycal-embed" data-path="...">` on index.html:672, about.html:349, services.html:470
- `<script src="https://asset-tidycal.b-cdn.net/js/embed.js" async>` on the same three pages

**Add:** a CSS-rendered "Upcoming Availability" calendar facade:
- Static HTML/CSS, zero external requests, zero JS on load
- Visual: day-of-week header row, 5×7 grid of rounded date cells, a subset highlighted in brand blue as "open slots," a thin "Available slots this week" label
- Overlay CTA: solid **"Schedule a Consultation →"** button over the lower third with soft shadow and subtle backdrop blur on the calendar behind it
- Hover: gentle calendar shift + button glow
- Button carries `data-booking` → existing `booking-modal.js` opens the TidyCal modal on click
- No specific month shown (avoids the "stale dates" problem)

**CSS:** ~60 new lines added to `css/styles.css` under `.calendar-facade { ... }`.

**UX preservation:** The CTA banner's right column ("Ready to Take the Next Step?", subtext, urgency indicator) stays untouched — only the left column (currently the live calendar) becomes the facade.

### 3.3 Script loading + render-block cleanup (FCP / LCP)

**Changes:**
1. **Delete** the placeholder `<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>` from all 9 HTML files. (Real GA4 is injected via Netlify snippet injection — this tag does nothing useful and wastes 133 KB.)
2. **Delete** the `gtag('config', GA_MEASUREMENT_ID, ...)` block from `js/analytics.js:29-32`. GTM already calls config with the real ID. Custom events continue to flow through the shared `dataLayer` and get picked up by GTM.
3. **Add `defer`** to `<script src="js/analytics.js">` on all 9 HTML files.
4. **Make `animations.css` non-blocking** via:
   ```html
   <link rel="preload" href="css/animations.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
   <noscript><link rel="stylesheet" href="css/animations.css"></noscript>
   ```
5. **Remove `second-opinion.css`** from any page that doesn't render the quiz. (Quiz is embedded on index + second-opinion.html; all others should drop the CSS reference.)
6. **Add preconnect hints** in `<head>`:
   ```html
   <link rel="preconnect" href="https://asset-tidycal.b-cdn.net" crossorigin>
   <link rel="preconnect" href="https://tidycal.com">
   ```

### 3.4 Map facade

**Target:** Remove ~350 KB of Maps JS + ~230 ms main-thread work from index + contact.

**Remove:** the `<iframe src="https://www.google.com/maps/embed?...">` at index.html:722 and contact.html:285.

**Add:** a one-time screenshot facade.

- **Capture** `images/map-mckinney.webp` (~20–40 KB, 1024×400) via the same headless-Chrome approach used by `capture-pages.sh`. Captured once; regenerated manually only if address changes.
- **Markup:**
   ```html
   <a href="https://maps.google.com/?q=208+E+Louisiana+Street+Suite+301+McKinney+Texas+75069"
      target="_blank" rel="noopener" class="map-facade"
      aria-label="View High Ridge Advisory office location in Google Maps">
     <img src="images/map-mckinney.webp" alt="Map showing High Ridge Advisory office"
          width="1024" height="400" loading="lazy">
     <span class="map-facade-pin" aria-hidden="true">📍</span>
     <span class="map-facade-cta">Open in Google Maps →</span>
   </a>
   ```
- **Styling:** ~20 lines added to `styles.css`. Rounded corners matching the current iframe look, subtle hover (zoom or brightness), pin + CTA pill over the lower-right.
- **Behavior:** Click opens Google Maps in a new tab. Users lose inline drag/zoom but gain a direct path to native map apps on mobile.

### 3.5 Workflow and isolation

- Branch: `perf/psi-fix`, created off current `main`, local-only for this session.
- Rollback:
  - `git checkout drafts` → back to Netlify preview version
  - `git checkout main` → back to current production
  - `git branch -D perf/psi-fix` → discard the effort entirely
- Originals retained in `images/originals/`.
- Local preview: `python3 -m http.server 8000` at project root.

---

## 4. Verification

### 4.1 Manual browser checklist

Run through this before declaring the implementation complete. Test on `http://localhost:8000/`.

**Setup:**
- [ ] Start local server: `python3 -m http.server 8000`
- [ ] Keep a second tab on `https://highridgeadvisory.com/` (production) open for side-by-side comparison

**Visual regression (all 9 pages, 3 viewports each: 375 px, 768 px, 1440 px):**
- [ ] Home (`/`)
- [ ] About (`/about.html`)
- [ ] Services (`/services.html`)
- [ ] Contact (`/contact.html`)
- [ ] Disclosures (`/disclosures.html`)
- [ ] Client Portal (`/client-portal.html`)
- [ ] Second Opinion (`/second-opinion.html`)
- [ ] Thank You (`/thank-you.html`)
- [ ] 404 (`/404.html`)

For each page, verify:
- [ ] Hero image loads sharp (no blur), fills the container, correct crop / focal point
- [ ] Logo in nav is crisp, not pixelated
- [ ] Logo in footer is crisp, not pixelated
- [ ] No layout shift on load (hero area doesn't jump)
- [ ] Fonts render correctly (no FOUT longer than ~100 ms)

**Calendar facade (index / about / services only):**
- [ ] Calendar facade card renders in the CTA banner
- [ ] Day-of-week header + date grid visible
- [ ] Some cells highlighted as "available"
- [ ] "Schedule a Consultation →" button is prominently visible and clickable
- [ ] Hover effect triggers on desktop
- [ ] Click → TidyCal booking modal opens with the correct URL
- [ ] Modal's 3-second bot-gate still works (loads after brief wait on first click)
- [ ] Modal close button works, clicking the backdrop works, Escape key works

**Map facade (index + contact):**
- [ ] Static map image renders at correct aspect ratio
- [ ] Pin + "Open in Google Maps" CTA visible
- [ ] Hover effect triggers on desktop
- [ ] Click → opens Google Maps in a new tab to the McKinney office address

**Booking modal (site-wide):**
- [ ] Every "Book a Meeting" / "Schedule Consultation" CTA opens the modal
- [ ] Nav "Book a Meeting" button works
- [ ] Hero CTA works on index
- [ ] Footer "Book a Consultation" works
- [ ] Results screen CTA from the second-opinion quiz works
- [ ] Exit-intent popup's booking CTA works (trigger by moving cursor to top of viewport)

**Quiz (index + second-opinion.html):**
- [ ] Intro screen renders
- [ ] All 8 questions navigate forward/backward correctly
- [ ] Multi-select (Q4) allows multiple choices and continues without a selection
- [ ] Contact form validates
- [ ] Submission completes and results screen shows
- [ ] "Schedule a Free Consultation" CTA on results opens the booking modal

**Analytics / tracking:**
- [ ] DevTools Network tab on localhost: **no** calls to `googletagmanager.com` (expected — Netlify injection is deploy-only; local should be clean)
- [ ] DevTools Console: no errors from `analytics.js`
- [ ] `window.dataLayer` exists and contains events after interactions (click a CTA, check `dataLayer` in console)
- [ ] Cookie consent banner appears on first visit (clear localStorage first: `localStorage.clear()`)
- [ ] Accept/decline buttons work, banner dismisses, choice persists across reload

**Misc:**
- [ ] All nav links route correctly between pages
- [ ] Phone links (`tel:`) and email links (`mailto:`) are unchanged
- [ ] External links (LinkedIn, Instagram, Facebook, Csenge PDFs) still work
- [ ] Favicon loads

### 4.2 Lighthouse verification

Run a fresh Lighthouse audit in Chrome DevTools (incognito window, mobile emulation, throttling = "Slow 4G") against `http://localhost:8000/` for index, about, services, contact. Record before/after values.

### 4.3 Target success metrics

These are the numbers to beat. Document the actual result in a brief follow-up note.

| Metric | Desktop (before → target) | Mobile (before → target) |
|---|---|---|
| Performance score | 38 → ≥90 | 31 → ≥75 |
| First Contentful Paint | 0.7 s → ≤1.0 s | 9.9 s → ≤2.5 s |
| Largest Contentful Paint | 7.2 s → ≤2.5 s | 59.7 s → ≤4.0 s |
| Total Blocking Time | 1,850 ms → ≤200 ms | 1,260 ms → ≤300 ms |
| Cumulative Layout Shift | 0.011 → ≤0.1 (unchanged is fine) | 0 → ≤0.1 (unchanged is fine) |
| Total page weight (index) | ~16 MB → ≤500 KB | same |

**Why mobile LCP won't match desktop:** GTM + Facebook Pixel + Clarity still load via Netlify snippet injection on every page (on slow 4G that's a real cost). Removing them is out of scope for this fix — they're live marketing / analytics infrastructure.

---

## 5. Future improvements (not in this implementation)

Captured here so they're discoverable later without re-deriving the analysis.

### Higher-impact (>100 ms win each)

1. **Defer GTM until first interaction.** GTM is ~900 ms–1.2 s of CPU and is currently loaded via Netlify snippet injection on every page load. Wrapping it in a facade that initializes on first scroll or first meaningful click would reclaim that budget. Requires modifying the Netlify snippet, not a repo change.

2. **Audit Facebook Pixel usage.** If there are no active Meta ad campaigns, remove it. Loads ~290 KB / 370 ms CPU.

3. **Audit Microsoft Clarity usage.** If the team isn't actively reviewing session recordings, remove it. Loads ~53 KB / 168 ms CPU.

4. **Move GTM + Pixel + Clarity behind the existing cookie consent banner.** Today they load regardless of consent. Tying them to the "accepted" state is both a privacy win and a ~1.5 s perf win for users who decline or ignore consent (the majority on first visit).

5. **Convert hero background-image sections to `<picture>` / `<img>`.** The `image-set()` approach picked in this spec is simpler but gives the browser less information than a real responsive `<picture>` with `srcset`. Switching the hero template to an actual `<img>` layer behind text would unlock `fetchpriority="high"` and give Lighthouse better signals.

6. **Code-split `second-opinion.js`.** Currently loaded on every page. It's only used on index + second-opinion.html. Trimming it from the other 7 pages would save parse time.

### Medium-impact (quick wins)

7. **Subset the Google Fonts** (Cormorant Garamond + Inter) to only the glyph ranges actually used. Current fonts serve ~86 KB total of which much is unused CJK / extended Latin.

8. **Self-host the fonts** instead of loading from `fonts.googleapis.com`. Eliminates a cross-origin connection and gives full cache control.

9. **Regenerate the `risk-spectrum` image** on services with a responsive srcset. Not flagged in this PSI run but similar pattern to other oversized images.

10. **Critical CSS extraction.** Inline the ~3 KB of above-the-fold rules from `styles.css` into each page's `<head>`, load the rest async. Only worth it if styles.css grows past ~30 KB.

11. **CSS + JS minification.** Add a one-shot build step (e.g., `esbuild --minify`) for `styles.css`, `animations.css`, `main.js`, `analytics.js`. ~5 KB savings total — small, but free once set up.

### Low-impact / cleanup

12. **Accessibility fixes Lighthouse flagged** (95/100 score): footer contrast ratios on disclaimer + copyright text; heading hierarchy (h4s used out of sequence on the homepage).

13. **Remove the unused `about-hero-backup.jpg` and `about-hero-original.jpg`** from the `images/` folder (they're not referenced from any page). Keep in `images/originals/` instead.

14. **Add `Cache-Control: public, max-age=31536000, immutable`** for versioned assets once we introduce cache-busting filenames.

15. **Preload LCP font** alongside LCP image. Shaves ~50–100 ms off FCP.

### Architectural (larger efforts)

16. **Replace TidyCal with a lighter scheduling provider or a custom-built booking flow.** TidyCal's bundle (booking-page.js + reCAPTCHA + Stripe) is ~2.3 MB when the modal opens. A simpler form + Calendly-style provider (or a Netlify function + manual time selection) could cut that in half.

17. **Introduce an image optimization CI step.** The one-shot `scripts/optimize-images.sh` works now, but as the site grows it'd be nice to enforce "no uncompressed image over X KB enters the repo" via a pre-commit hook or Netlify build check.

18. **Set up Real User Monitoring (CrUX field data or similar).** Lab scores from PSI are one view; real user data tells you what actually hurts.

---

## 6. Out of scope for this implementation (explicit)

- GTM / Pixel / Clarity removal
- reCAPTCHA / Stripe (they load inside the TidyCal iframe on click — already lazy once the calendar becomes click-to-load)
- CSS / JS minification
- Font optimization / self-hosting
- Critical CSS inlining
- Accessibility contrast and heading-order fixes
- Any change to the scheduling provider

---

## 7. Rollback plan

If anything breaks or we decide to abandon:
- `git checkout drafts` — restore the Netlify preview
- `git checkout main` — restore current production
- `git branch -D perf/psi-fix` — discard the work entirely

Originals are preserved in `images/originals/` so we can regenerate variants at any time.
