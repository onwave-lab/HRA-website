# High Ridge Advisory Website

A professional website for High Ridge Advisory, a boutique wealth management firm in McKinney, Texas.

## Quick Reference

### File Locations

| Content | File |
|---------|------|
| Homepage | `index.html` |
| Services | `services.html` |
| About & Team | `about.html` |
| Contact Form | `contact.html` |
| Form Confirmation | `thank-you.html` |
| Styles | `css/styles.css` |
| Animations | `css/animations.css` |
| JavaScript | `js/main.js` |
| Images | `images/` folder |

### Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Forms:** Netlify Forms
- **Hosting:** Netlify
- **Fonts:** Google Fonts (Cormorant Garamond, Inter)
- **Icons:** Inline SVG (Lucide Icons)

---

## Making Updates with Claude Code

Open your terminal and use Claude Code. Here are example prompts:

### Text Changes

```
"Change the phone number to 972-555-1234"
"Update Jay Madden's bio to mention 30 years of experience"
"Change the homepage headline to 'Your Partner in Wealth'"
```

### Adding Content

```
"Add a new service called 'Cryptocurrency Planning' to the Family section"
"Add a new team member named Sarah Johnson, Client Relations Manager"
```

### Image Changes

```
"Update the hero image to use hero-new.jpg from the images folder"
"Change Kyle Harrison's headshot to kyle-new.jpg"
```

---

## Replacing Images

1. Add your new **source image** to `images/originals/` (keep the full-resolution original so variants can be regenerated)
2. Name it clearly (e.g., `jay-madden.jpg`)
3. Ask Claude Code: "Replace the current Jay Madden photo with jay-madden.jpg"

### Responsive Image Pipeline

The site serves images as WebP variants at multiple widths so mobile users don't download desktop-sized images. The script `scripts/optimize-images.sh` handles regeneration:

```bash
bash scripts/optimize-images.sh
```

- Reads source files from `images/originals/`
- Writes WebP variants to `images/` at the widths actually used on the page:
  - **Heroes:** 800 / 1600 / 2560 px
  - **Content images:** 600 / 1200 px
  - **Logos:** 200 px
- Idempotent — re-run any time sources change or if you need to tweak quality settings
- Requires `cwebp` (webp package) and `convert` (ImageMagick) on the system

### Recommended Source Image Sizes

| Image Type | Source Size (in `images/originals/`) |
|------------|------------------|
| Hero images | 2560+ px wide (script generates 800/1600/2560 variants) |
| Team headshots | 1200+ px wide |
| General images | 1200+ px wide (script generates 600/1200 variants) |
| Logo | 1024+ px square |

---

## Publishing Changes

After making changes:

```bash
git add .
git commit -m "Describe your change here"
git push
```

Netlify automatically publishes within 1-2 minutes.

---

## Viewing Form Submissions

1. Log into [Netlify](https://netlify.com)
2. Select your site
3. Go to **Forms** in the sidebar
4. Click on **contact** to see submissions

### Setting Up Email Notifications

1. In Netlify, go to **Site settings**
2. Click **Forms** in the sidebar
3. Click **Form notifications**
4. Click **Add notification** → **Email notification**
5. Enter your email address and save

---

## Project Structure

```
high-ridge-advisory/
├── index.html                 # Homepage
├── services.html              # Services overview
├── about.html                 # About & team
├── contact.html               # Contact form
├── disclosures.html           # Regulatory disclosures
├── client-portal.html         # Client hub redirect page
├── second-opinion.html        # Second Opinion Assessment quiz
├── thank-you.html             # Form submission confirmation
├── 404.html                   # Not-found page
├── css/
│   ├── styles.css             # Main stylesheet (design tokens, layout, components)
│   ├── animations.css         # Scroll-triggered fade/slide animations
│   └── second-opinion.css     # Quiz-specific styling (sof- namespace)
├── js/
│   ├── main.js                # Navigation, animations, form handlers
│   ├── analytics.js           # Cookie consent + custom event tracking
│   ├── booking-modal.js       # TidyCal click-to-load modal
│   └── second-opinion.js      # Quiz logic (scoring, submission, TidyCal prefill)
├── images/
│   ├── originals/             # Full-resolution source files (not served directly)
│   └── *.webp / *.jpg         # Responsive variants produced by optimize-images.sh
├── scripts/
│   └── optimize-images.sh     # Regenerate WebP variants from originals/
├── docs/
│   └── superpowers/           # Design specs + implementation plans
├── netlify/
│   └── functions/             # Netlify Functions (MailerLite integration, etc.)
├── session-notes/             # Dated notes from each working session
├── capture-pages.sh           # Compliance screenshot capture (see CLAUDE.md)
├── netlify.toml               # Netlify build config (headers, redirects, caching)
├── sitemap.xml                # Search engine sitemap
├── robots.txt                 # Crawler directives
├── site.webmanifest           # PWA manifest
├── claude.md                  # AI session workflow guardrails
├── CLAUDE.md                  # Project-specific instructions (compliance, etc.)
├── quickstart-guide.md        # Detailed user guide
└── README.md                  # This file
```

---

## Performance

The site is optimized for Core Web Vitals. As of 2026-04-16, the production build hits:

- **Desktop Lighthouse:** 100 performance, 95 accessibility, 100 best practices, 100 SEO
- **Mobile Lighthouse:** 88 performance, 94 accessibility, 100 best practices, 100 SEO

Key optimizations in place:

- **Responsive images** — WebP variants at 800/1600/2560 for heroes, served via `image-set()` + media-query preloads
- **Deferred third parties** — TidyCal booking calendar and Google Maps load on click, not on page load (see `js/booking-modal.js` and `.map-facade` pattern)
- **Non-blocking CSS** — `animations.css` loads via preload-swap to avoid delaying first paint
- **Deferred analytics** — `analytics.js` has `defer` so it never blocks render
- **Long cache lifetimes** for static assets, configured in `netlify.toml`

See `docs/superpowers/specs/2026-04-16-psi-perf-fix-design.md` for the full architecture and list of future improvements.

---

## Key URLs

| Destination | URL |
|-------------|-----|
| Book a Meeting | https://highridgeadvisory.as.me/ |
| View Investments | https://login.orionadvisor.com/ |
| Access Wealth Plan | https://wealth.emaplan.com/ema/SignIn |

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## Accessibility Features

- WCAG 2.1 AA compliant color contrast
- Keyboard navigation support
- Screen reader friendly
- Reduced motion support
- Skip to main content link
- Proper focus indicators

---

## Need Help?

- Review the [quickstart-guide.md](quickstart-guide.md) for detailed instructions
- Use Claude Code to ask questions about the site
- For technical issues, contact your developer

---

## Credits

- **Design & Development:** Built with Claude Code
- **Fonts:** [Google Fonts](https://fonts.google.com)
- **Icons:** [Lucide Icons](https://lucide.dev)
