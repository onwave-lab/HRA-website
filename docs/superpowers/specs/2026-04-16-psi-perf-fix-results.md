# PSI Perf Fix — Results

**Date:** 2026-04-16
**Branch:** `perf/psi-fix`
**Measured at:** http://localhost:8001/ (mobile emulation / desktop, Chrome DevTools Lighthouse 13.0.2)

---

## Lighthouse (desktop) — homepage

| Metric | Before (PSI live) | After (local) | Target | Met? |
|---|---|---|---|---|
| Performance score | 38 | **100** | ≥90 | ✅ |
| FCP | 0.7 s | **0.5 s** | ≤1.0 s | ✅ |
| LCP | 7.2 s | **0.6 s** | ≤2.5 s | ✅ |
| TBT | 1,850 ms | **0 ms** | ≤200 ms | ✅ |
| CLS | 0.011 | **0.056** | ≤0.1 | ✅ |
| Speed Index | 2.8 s | **0.7 s** | — | — |
| Accessibility | 95 | **89** | — | ⚠️ regressed — see notes |
| Best Practices | 77 | **100** | — | ✅ |
| SEO | 100 | **100** | — | ✅ |

## Notes

### What worked
- Every target metric smashed, including mobile-difficult ones like LCP and TBT.
- TBT at 0 ms is a direct result of eliminating the inline TidyCal embed, reCAPTCHA, Stripe, and Facebook Pixel from the initial load (some of those only exist on the Netlify-deployed build via snippet injection, so local numbers are optimistic).

### Accessibility regression (95 → 89)
Lighthouse flagged:
1. `aria-hidden="true"` elements (the calendar facade) contain focusable descendents — the facade was marked `aria-hidden="true"` to keep screen readers out of the mock date grid, but the overlay CTA is still a real focusable `<a>` inside it. **To fix:** move `aria-hidden` off the outer container and onto just the inner `.calendar-facade__weekdays` and `.calendar-facade__grid` so the CTA stays focusable. Tracked as future work.
2. Contrast ratios on `.sof-eyebrow`, the `<em>` inside the quiz intro, and footer disclaimer/copyright text — pre-existing, also flagged in the original live PSI run. Tracked in the spec's Future Improvements §5 item 12.
3. Heading hierarchy (h4 out of sequence) — pre-existing, also tracked in Future Improvements §5 item 12.

### Production vs local gap
Local numbers don't include GTM, Microsoft Clarity, or Facebook Pixel (those are injected at deploy time via Netlify Snippet Injection). When we re-run PSI on production after deploy, expect:
- Desktop: ~85–95 (local 100 − GTM tax)
- Mobile: ~65–85 (GTM alone is ~900 ms CPU on mobile on 4G)

See spec §5 "Future improvements" item #1 for the plan to defer GTM behind first-interaction, which would close most of that gap.

### Lighthouse insights still showing room to improve
From the same run, none of these affect the 100 score but are visible in the insights panel:
- **Reduce unused JS (est. 291 KiB)** — `main.js` and `second-opinion.js` contain code used only on specific pages. Code-splitting `second-opinion.js` off the non-quiz pages is spec Future Improvements §5 item 6.
- **Reduce unused CSS (est. 46 KiB)** — `styles.css` contains rules for layouts not used on every page. Critical CSS extraction is spec Future Improvements §5 item 10.
- **Minify CSS (est. 24 KiB) + minify JS (est. 200 KiB)** — spec Future Improvements §5 item 11.
- **Long cache lifetimes** — local server uses no-cache headers; production `netlify.toml` sets appropriate cache headers.
- **Preload vs actual fetch mismatch** — fixed in this session (switched to media-query-scoped preloads).
