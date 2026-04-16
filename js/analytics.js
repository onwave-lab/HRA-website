// ============================================
// HIGH RIDGE ADVISORY - Analytics & Cookie Consent
// ============================================

// Real GA4 / GTM container is injected at deploy time via Netlify's
// Snippet Injection feature (Site settings → Build & deploy → Post
// processing → Snippet injection). Do not re-add a gtag config call
// here — it would double-load against a dead placeholder ID.

// Initialize dataLayer and gtag function (shared with Netlify-injected GTM)
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

// Set default consent to denied
gtag('consent', 'default', {
  'analytics_storage': 'denied',
  'ad_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied'
});

// Check for existing consent on page load
if (localStorage.getItem('cookie_consent') === 'accepted') {
  gtag('consent', 'update', {
    'analytics_storage': 'granted'
  });
}

// ----------------------------------------
// Cookie Consent Banner
// ----------------------------------------
document.addEventListener('DOMContentLoaded', function() {
  initCookieConsent();
});

function initCookieConsent() {
  // Check if user has already made a choice
  const existingConsent = localStorage.getItem('cookie_consent');
  if (existingConsent) {
    return; // Don't show banner if choice already made
  }

  // Create and insert the cookie consent banner
  const banner = createCookieBanner();
  document.body.appendChild(banner);

  // Show banner after a short delay
  setTimeout(() => {
    banner.classList.add('show');
  }, 1000);

  // Handle accept button
  document.getElementById('cookie-accept').addEventListener('click', function() {
    acceptCookies();
    hideBanner(banner);
  });

  // Handle decline button
  document.getElementById('cookie-decline').addEventListener('click', function() {
    declineCookies();
    hideBanner(banner);
  });
}

function createCookieBanner() {
  const banner = document.createElement('div');
  banner.id = 'cookie-consent';
  banner.className = 'cookie-consent';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Cookie consent');
  banner.innerHTML = `
    <div class="cookie-consent-content">
      <div class="cookie-consent-text">
        <p><strong>Your Privacy Matters</strong></p>
        <p>We use cookies to analyze site traffic and improve your experience. Your data is never sold.</p>
      </div>
      <div class="cookie-consent-actions">
        <button id="cookie-decline" class="cookie-btn cookie-btn-secondary">Decline</button>
        <button id="cookie-accept" class="cookie-btn cookie-btn-primary">Accept</button>
      </div>
    </div>
  `;
  return banner;
}

function acceptCookies() {
  localStorage.setItem('cookie_consent', 'accepted');

  // Update consent in Google Analytics
  gtag('consent', 'update', {
    'analytics_storage': 'granted'
  });

  // Track the consent event
  gtag('event', 'cookie_consent', {
    'event_category': 'consent',
    'event_label': 'accepted'
  });
}

function declineCookies() {
  localStorage.setItem('cookie_consent', 'declined');

  // Track the decline event (this will still be sent as it's considered essential)
  gtag('event', 'cookie_consent', {
    'event_category': 'consent',
    'event_label': 'declined'
  });
}

function hideBanner(banner) {
  banner.classList.remove('show');
  setTimeout(() => {
    banner.remove();
  }, 300);
}

// ----------------------------------------
// Custom Event Tracking
// ----------------------------------------

// Track outbound links
document.addEventListener('click', function(e) {
  const link = e.target.closest('a');
  if (link && link.hostname !== window.location.hostname) {
    gtag('event', 'click', {
      'event_category': 'outbound',
      'event_label': link.href,
      'transport_type': 'beacon'
    });
  }
});

// Track CTA button clicks
document.addEventListener('click', function(e) {
  const ctaButton = e.target.closest('.btn-primary, .btn-gold, .btn-ghost');
  if (ctaButton) {
    const buttonText = ctaButton.textContent.trim();
    const buttonHref = ctaButton.href || 'no-href';

    gtag('event', 'cta_click', {
      'event_category': 'engagement',
      'event_label': buttonText,
      'button_destination': buttonHref
    });
  }
});

// Track form submissions
document.addEventListener('submit', function(e) {
  const form = e.target;
  const formName = form.getAttribute('name') || form.id || 'unnamed-form';

  gtag('event', 'form_submit', {
    'event_category': 'engagement',
    'event_label': formName
  });
});

// Track scroll depth
let scrollDepthTracked = {25: false, 50: false, 75: false, 100: false};

window.addEventListener('scroll', debounceScroll(function() {
  const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);

  [25, 50, 75, 100].forEach(depth => {
    if (scrollPercent >= depth && !scrollDepthTracked[depth]) {
      scrollDepthTracked[depth] = true;
      gtag('event', 'scroll_depth', {
        'event_category': 'engagement',
        'event_label': depth + '%'
      });
    }
  });
}, 250));

function debounceScroll(func, wait) {
  let timeout;
  return function() {
    clearTimeout(timeout);
    timeout = setTimeout(func, wait);
  };
}

// Track page engagement time
let engagementStart = Date.now();
let isPageVisible = true;

document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    isPageVisible = false;
    const timeSpent = Math.round((Date.now() - engagementStart) / 1000);
    gtag('event', 'page_engagement', {
      'event_category': 'engagement',
      'event_label': 'time_on_page',
      'value': timeSpent
    });
  } else {
    isPageVisible = true;
    engagementStart = Date.now();
  }
});

// Track client portal clicks
document.addEventListener('click', function(e) {
  const portalLink = e.target.closest('.nav-dropdown-item');
  if (portalLink) {
    const portalName = portalLink.textContent.trim();
    gtag('event', 'client_portal_click', {
      'event_category': 'engagement',
      'event_label': portalName
    });
  }
});

// Track team bio expansions
document.addEventListener('click', function(e) {
  const bioToggle = e.target.closest('[data-team-toggle]');
  if (bioToggle) {
    const teamMember = bioToggle.getAttribute('data-team-toggle');
    const card = bioToggle.closest('.card-team');
    const isExpanding = !card.classList.contains('is-expanded');

    if (isExpanding) {
      gtag('event', 'team_bio_view', {
        'event_category': 'engagement',
        'event_label': teamMember
      });
    }
  }
});
