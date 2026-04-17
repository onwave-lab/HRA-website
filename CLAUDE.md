# High Ridge Advisory Website - Project Instructions

## Project Acronyms & References

- **IHH** = Intention-Holistic-Health (website folder: `Intention-Holistic-Health-website`)
- **HRA** = High Ridge Advisory (this project)

---

## Compliance Screenshot Capture

Website pages must be periodically captured as full-page screenshots for industry compliance pre-approval before changes go live.

### How to Run

```bash
bash capture-pages.sh
```

### What It Does

- Captures all 9 website pages from the **Netlify preview site** (`hra-website.netlify.app`) as full-page PNG screenshots
- Uses the preview URL (not live production) so compliance can pre-approve changes before they go live
- Saves to `./compliance-pdfs/` with date-stamped filenames: `HighRidge_<Page>_YYYY-MM-DD.png`
- The `compliance-pdfs/` folder is gitignored (screenshots are for offline delivery, not version control)

### Pages Captured

| Page | URL Path |
|------|----------|
| Home | `/` |
| About | `/about.html` |
| Services | `/services.html` |
| Contact | `/contact.html` |
| Disclosures | `/disclosures.html` |
| Client Portal | `/client-portal.html` |
| Second Opinion | `/second-opinion.html` |
| Thank You | `/thank-you.html` |
| 404 | `/404.html` |

### Requirements

- **WSL2 environment** with Windows Chrome installed at the default path (`/mnt/c/Program Files/Google/Chrome/Application/chrome.exe`)
- No additional Node packages or Python libraries needed — uses Chrome's built-in `--screenshot` flag
- `wslpath` must be available (standard in WSL2) for path conversion

### Technical Notes

- **Why screenshots, not PDFs:** Chrome's `--print-to-pdf` applies print media styles, stripping backgrounds/colors/gradients and reformatting for paper. The result looks nothing like the actual site. Screenshots capture the page exactly as rendered on screen.
- **Full-page capture:** Uses `--window-size=1440,8000` to create a tall viewport so Chrome renders and captures the entire scrollable page in one shot.
- **`--virtual-time-budget=5000`** gives Chrome 5 seconds of virtual time to load lazy content, animations, and web fonts before capturing.
- The script kills and relaunches Chrome between each page to avoid session/cache issues, using a unique Windows-native temp dir per page.
- Puppeteer/Playwright were attempted but fail on WSL2 due to missing Linux system libraries (`libnspr4.so`, etc.) that require `sudo apt install`. Remote debugging via Puppeteer also fails due to WSL2's unreliable localhost port forwarding to Windows. Chrome's native `--screenshot` flag bypasses all of this.

### Delivery

Send the `compliance-pdfs/` folder contents to Jay for record-keeping and regulatory submission. Re-run the script whenever the site is updated to generate a fresh set from the preview.

---

## Image Optimization

All images in `images/` (except favicons and SVG logos) are WebP variants produced from sources in `images/originals/` by `scripts/optimize-images.sh`. When adding or updating an image:

1. Put the full-resolution source in `images/originals/`
2. Run `bash scripts/optimize-images.sh`
3. Reference the generated variants from HTML/CSS (not the original)

The script is idempotent — safe to re-run. Hero images get 800/1600/2560 variants; content images get 600/1200; logos get 200.

**Do not reference files inside `images/originals/` from production HTML or CSS.** Those are source files, not served assets.

---

## Responsive Images & Third-Party Embeds

Two patterns established 2026-04-16 that should be preserved:

- **Hero backgrounds** use CSS `image-set()` with a 768px media query (see `.hero--bg-about` / `.hero--bg-services` in `css/styles.css`) plus media-scoped `<link rel="preload">` hints in `<head>`. New hero pages should follow the same pattern, not inline `style="background-image: url(...)"`.
- **Third-party widgets that cost significant JS** (TidyCal, Google Maps) use the facade pattern: a static CSS/HTML stand-in that loads the real widget on user interaction. See `.calendar-facade` and `.map-facade` in `css/styles.css`. If you add a new heavy embed (chat widget, video player, etc.), follow the same click-to-load approach rather than loading on page load.

---

## Design Specs and Implementation Plans

Major feature work should be planned in `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` before implementation, with the task-level plan in `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`. This keeps architectural decisions and future-improvement lists discoverable in the repo rather than scattered across session notes.
