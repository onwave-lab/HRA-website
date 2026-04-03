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
