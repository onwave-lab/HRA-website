// ============================================
// HIGH RIDGE ADVISORY - Main JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  // Check for reduced motion preference
  initReducedMotion();

  // Initialize all components
  initNavigation();
  initNavbarScroll();
  initClientPortalDropdown();
  initScrollAnimations();
  initTeamAccordions();
  initSmoothScroll();
  initTypewriter();
  initClickableAddress();
  initFormLoadingStates();
  initExitIntentPopup();
  initBookingUrgencyMonth();
  initPortalRedirect();
});

// ----------------------------------------
// Reduced Motion Support
// ----------------------------------------
function initReducedMotion() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    document.documentElement.classList.add('reduce-motion');
  }

  // Listen for changes in preference
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    if (e.matches) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  });
}

// ----------------------------------------
// Booking Urgency Month
// ----------------------------------------
function initBookingUrgencyMonth() {
  const monthElements = document.querySelectorAll('.booking-urgency-month');

  if (monthElements.length === 0) return;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentMonth = new Date().getMonth();
  const nextMonth = (currentMonth + 1) % 12;
  const nextMonthName = months[nextMonth];

  monthElements.forEach(function(el) {
    el.textContent = nextMonthName;
  });
}

// ----------------------------------------
// Mobile Navigation
// ----------------------------------------
function initNavigation() {
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (!navToggle || !navMenu) return;

  navToggle.addEventListener('click', function() {
    const isOpen = navMenu.classList.contains('is-open');

    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close menu when clicking a link
  const navLinks = navMenu.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close menu on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && navMenu.classList.contains('is-open')) {
      closeMenu();
    }
  });

  function openMenu() {
    navMenu.classList.add('is-open');
    navToggle.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  }

  function closeMenu() {
    navMenu.classList.remove('is-open');
    navToggle.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }
}

// ----------------------------------------
// Navbar Scroll Effect
// ----------------------------------------
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');

  if (!navbar) return;

  // Check if we're on a page with transparent navbar
  const isTransparent = navbar.classList.contains('navbar--transparent');

  if (!isTransparent) return;

  let ticking = false;

  function updateNavbar() {
    const scrollY = window.scrollY;
    const navbarHeight = navbar.offsetHeight;
    const hero = document.querySelector('.hero');
    const startFade = 50; // Start fading after 50px

    // End fade when navbar bottom reaches hero bottom
    const heroHeight = hero ? hero.offsetHeight : window.innerHeight;
    const endFade = heroHeight - navbarHeight;

    // Calculate opacity based on scroll position
    let opacity = 0;
    if (scrollY > startFade) {
      opacity = Math.min((scrollY - startFade) / (endFade - startFade), 1);
    }

    // Apply background with calculated opacity
    navbar.style.backgroundColor = `rgba(255, 255, 255, ${opacity})`;
    navbar.style.boxShadow = opacity > 0.5 ? `0 4px 6px -1px rgba(0, 0, 0, ${opacity * 0.1}), 0 2px 4px -1px rgba(0, 0, 0, ${opacity * 0.06})` : 'none';

    // Toggle class for text color changes at halfway point
    if (opacity > 0.5) {
      navbar.classList.add('is-scrolled');
    } else {
      navbar.classList.remove('is-scrolled');
    }

    ticking = false;
  }

  window.addEventListener('scroll', function() {
    if (!ticking) {
      window.requestAnimationFrame(updateNavbar);
      ticking = true;
    }
  });

  // Run once on load
  updateNavbar();
}

// ----------------------------------------
// Client Portal Dropdown
// ----------------------------------------
function initClientPortalDropdown() {
  const dropdown = document.getElementById('client-portal');

  if (!dropdown) return;

  const toggle = dropdown.querySelector('.nav-dropdown-toggle');
  const menu = dropdown.querySelector('.nav-dropdown-menu');

  if (!toggle || !menu) return;

  // Toggle on click
  toggle.addEventListener('click', function(e) {
    e.preventDefault();
    const isOpen = dropdown.classList.contains('is-open');

    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  // Keyboard support
  toggle.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle.click();
    }
  });

  // Close on click outside
  document.addEventListener('click', function(e) {
    if (!dropdown.contains(e.target)) {
      closeDropdown();
    }
  });

  // Close on escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  function openDropdown() {
    dropdown.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
  }

  function closeDropdown() {
    dropdown.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }
}

// ----------------------------------------
// Scroll Animations
// ----------------------------------------
function initScrollAnimations() {
  // Check for reduced motion preference
  if (document.documentElement.classList.contains('reduce-motion')) {
    // Make all animated elements visible immediately
    document.querySelectorAll('[data-animate]').forEach(el => {
      el.classList.add('is-visible');
    });
    return;
  }

  const animatedElements = document.querySelectorAll('[data-animate]');

  if (animatedElements.length === 0) return;

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -100px 0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // Optionally unobserve after animation
        // observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  animatedElements.forEach(el => {
    observer.observe(el);
  });
}

// ----------------------------------------
// Team Bio Accordions
// ----------------------------------------
function initTeamAccordions() {
  const toggleButtons = document.querySelectorAll('[data-team-toggle]');

  if (toggleButtons.length === 0) return;

  toggleButtons.forEach(button => {
    button.addEventListener('click', function() {
      const teamCard = button.closest('.card-team');
      const isExpanded = teamCard.classList.contains('is-expanded');

      // Close all other accordions
      document.querySelectorAll('.card-team.is-expanded').forEach(card => {
        if (card !== teamCard) {
          card.classList.remove('is-expanded');
          const cardButton = card.querySelector('[data-team-toggle]');
          if (cardButton) {
            cardButton.setAttribute('aria-expanded', 'false');
            cardButton.innerHTML = 'View Bio <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
          }
        }
      });

      // Toggle current accordion
      if (isExpanded) {
        teamCard.classList.remove('is-expanded');
        button.setAttribute('aria-expanded', 'false');
        button.innerHTML = 'View Bio <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
      } else {
        teamCard.classList.add('is-expanded');
        button.setAttribute('aria-expanded', 'true');
        button.innerHTML = 'Close Bio <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
      }
    });
  });
}

// ----------------------------------------
// Smooth Scroll for Anchor Links
// ----------------------------------------
function initSmoothScroll() {
  // Only for links that point to anchors on the same page
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  anchorLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');

      // Skip if it's just "#"
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        e.preventDefault();

        // Get navbar height for offset
        const navbar = document.getElementById('navbar');
        const navbarHeight = navbar ? navbar.offsetHeight : 0;

        let targetPosition;

        // Special handling for hero scroll indicator going to #intro
        if (targetId === '#intro' && this.classList.contains('scroll-indicator')) {
          const sectionHeight = targetElement.offsetHeight;
          const viewportHeight = window.innerHeight;
          const sectionTop = targetElement.getBoundingClientRect().top + window.scrollY;

          // On larger screens, center the section content
          if (viewportHeight >= 768 && sectionHeight < viewportHeight) {
            // Center the section in the viewport
            const centeredOffset = (viewportHeight - sectionHeight) / 2;
            targetPosition = sectionTop - centeredOffset;
          } else {
            // On smaller screens, put the heading at the top with navbar offset
            targetPosition = sectionTop - navbarHeight - 20;
          }
        } else {
          // Default behavior for other links
          targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - navbarHeight - 20;
        }

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });

        // Update URL hash without jumping
        history.pushState(null, null, targetId);
      }
    });
  });

  // Handle page load with hash
  if (window.location.hash) {
    const targetElement = document.querySelector(window.location.hash);

    if (targetElement) {
      // Wait for page to fully load
      setTimeout(() => {
        const navbar = document.getElementById('navbar');
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - navbarHeight - 20;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }, 100);
    }
  }
}

// ----------------------------------------
// Utility: Throttle Function
// ----------------------------------------
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ----------------------------------------
// Utility: Debounce Function
// ----------------------------------------
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ----------------------------------------
// Typewriter Animation
// ----------------------------------------
function initTypewriter() {
  const typewriterElement = document.getElementById('typewriter');

  if (!typewriterElement) return;

  // Check for reduced motion preference
  if (document.documentElement.classList.contains('reduce-motion')) {
    typewriterElement.textContent = 'Wealth Planning';
    return;
  }

  const words = [
    'Wealth Planning',
    'Financial Guidance',
    'Investment Strategy',
    'Client Service',
    'Fiduciary Care'
  ];

  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let isPaused = false;

  const typeSpeed = 80;      // Speed of typing
  const deleteSpeed = 50;    // Speed of deleting
  const pauseTime = 2000;    // Pause at complete word
  const pauseBetween = 500;  // Pause before typing next word

  function type() {
    const currentWord = words[wordIndex];

    if (isPaused) {
      isPaused = false;
      setTimeout(type, pauseBetween);
      return;
    }

    if (isDeleting) {
      // Deleting characters
      typewriterElement.textContent = currentWord.substring(0, charIndex - 1);
      charIndex--;

      if (charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        setTimeout(type, pauseBetween);
      } else {
        setTimeout(type, deleteSpeed);
      }
    } else {
      // Typing characters
      typewriterElement.textContent = currentWord.substring(0, charIndex + 1);
      charIndex++;

      if (charIndex === currentWord.length) {
        isDeleting = true;
        isPaused = true;
        setTimeout(type, pauseTime);
      } else {
        setTimeout(type, typeSpeed);
      }
    }
  }

  // Start the animation
  type();
}

// ----------------------------------------
// Clickable Address (Copy on Desktop, Maps on Mobile)
// ----------------------------------------
function initClickableAddress() {
  const addressElements = document.querySelectorAll('.clickable-address');

  if (addressElements.length === 0) return;

  const fullAddress = '208 E. Louisiana Street, Suite 301, McKinney, Texas 75069';
  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(fullAddress);

  // Detect mobile device
  function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  addressElements.forEach(element => {
    // Add appropriate cursor and hover styles
    element.style.cursor = 'pointer';

    element.addEventListener('click', function(e) {
      e.preventDefault();

      if (isMobileDevice()) {
        // On mobile, open maps app
        window.open(mapsUrl, '_blank');
      } else {
        // On desktop, copy to clipboard
        navigator.clipboard.writeText(fullAddress).then(() => {
          showCopiedTooltip(element);
        }).catch(err => {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = fullAddress;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          showCopiedTooltip(element);
        });
      }
    });
  });

  function showCopiedTooltip(element) {
    // Check if tooltip already exists
    let tooltip = element.querySelector('.address-tooltip');

    if (!tooltip) {
      tooltip = document.createElement('span');
      tooltip.className = 'address-tooltip';
      tooltip.textContent = 'Copied!';
      element.style.position = 'relative';
      element.appendChild(tooltip);
    }

    // Show tooltip
    tooltip.classList.add('is-visible');

    // Hide after 2 seconds
    setTimeout(() => {
      tooltip.classList.remove('is-visible');
    }, 2000);
  }
}

// ----------------------------------------
// Form Loading States & Bot Protection
// ----------------------------------------
function initFormLoadingStates() {
  const forms = document.querySelectorAll('form[data-netlify="true"], form[netlify]');
  const MIN_SUBMIT_TIME = 3000; // Minimum 3 seconds before submission allowed

  forms.forEach(form => {
    const submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) return;

    // Record when form was loaded (for time-based bot detection)
    const formLoadTime = Date.now();
    const formLoadedInput = form.querySelector('#form-loaded');
    if (formLoadedInput) {
      formLoadedInput.value = formLoadTime;
    }

    // Store original button content
    const originalButtonText = submitButton.innerHTML;

    form.addEventListener('submit', function(e) {
      // Bot detection checks
      const honeypot1 = form.querySelector('input[name="bot-field"]');
      const honeypot2 = form.querySelector('input[name="website"]');
      const timeSinceLoad = Date.now() - formLoadTime;

      // Check honeypot fields (bots fill these, humans don't see them)
      if ((honeypot1 && honeypot1.value) || (honeypot2 && honeypot2.value)) {
        e.preventDefault();
        console.log('Bot detected: honeypot filled');
        // Silently fail - don't tell bots why it failed
        showFormError(form, 'Unable to submit form. Please try again later.');
        return;
      }

      // Check submission time (bots submit instantly, humans need time)
      if (timeSinceLoad < MIN_SUBMIT_TIME) {
        e.preventDefault();
        console.log('Bot detected: submitted too fast (' + timeSinceLoad + 'ms)');
        showFormError(form, 'Please take a moment to review your message before submitting.');
        return;
      }

      // Passed bot checks - show loading state
      form.classList.add('is-submitting');
      submitButton.disabled = true;
      submitButton.innerHTML = `
        <span class="btn-spinner"></span>
        <span>Sending...</span>
      `;

      // For Netlify forms, let the form submit naturally
    });
  });
}

// Show form error message
function showFormError(form, message) {
  // Remove any existing error
  const existingError = form.querySelector('.form-error-message');
  if (existingError) existingError.remove();

  // Create and insert error message
  const errorDiv = document.createElement('div');
  errorDiv.className = 'form-error-message';
  errorDiv.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <span>${message}</span>
  `;

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.parentNode.insertBefore(errorDiv, submitButton);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// ----------------------------------------
// Exit Intent Popup — Second Opinion Assessment
// ----------------------------------------
function initExitIntentPopup() {
  // Skip on pages where the quiz is already present or not needed
  var path = window.location.pathname;
  if (path.includes('thank-you') ||
      path.includes('second-opinion') ||
      path === '/' || path === '/index.html' || path === '' ||
      sessionStorage.getItem('exitPopupShown')) {
    return;
  }

  var popupShown = false;

  // Build full quiz HTML for the popup
  function q(id, num, text, sub, choices, prevQ, nextQ, nextFn) {
    var header = '<div class="sof-q-header"><div class="sof-q-number">Question ' + num + ' of 8</div><div class="sof-q-text">' + text + '</div>' + (sub ? '<div class="sof-q-sub">' + sub + '</div>' : '') + '</div>';
    var body = '<div class="sof-q-body">' + choices + '</div>';
    var back = prevQ ? '<button class="sof-btn-back" onclick="sofGoBack(' + prevQ + ')">&larr; Back</button>' : '<div></div>';
    var next = '<button class="sof-btn-next" id="q' + num + 'next"' + (nextFn ? '' : ' disabled') + ' onclick="' + (nextFn || 'sofGoNext(' + nextQ + ')') + '">Continue &rarr;</button>';
    return '<div class="sof-question-screen" id="sofQ' + num + '">' + header + body + '<div class="sof-q-nav">' + back + next + '</div></div>';
  }

  function choice(qId, letter, label, sub, multi) {
    var fn = multi ? 'sofToggleMulti' : 'sofSelectChoice';
    var cls = multi ? ' sof-multi' : '';
    return '<button class="sof-choice-btn' + cls + '" onclick="' + fn + '(\'' + qId + '\',\'' + letter + '\',this)"><div class="sof-choice-letter">' + letter + '</div><div><div class="sof-choice-label">' + label + '</div>' + (sub ? '<div class="sof-choice-sub">' + sub + '</div>' : '') + '</div></button>';
  }

  var quizHTML =
    // Intro
    '<div class="sof-intro-screen" id="sofIntroScreen">' +
      '<div class="sof-eyebrow">Before You Go</div>' +
      '<h2>Is Your Portfolio<br>Working as Hard<br>as <em>You Did?</em></h2>' +
      '<p class="sof-intro-sub">Answer 8 questions in under 3 minutes. We\'ll identify the gaps in your current plan and whether a second opinion makes sense &mdash; at no cost and no obligation.</p>' +
      '<div class="sof-intro-meta"><div class="sof-intro-meta-item"><div class="sof-dot"></div>3 minutes</div><div class="sof-intro-meta-item"><div class="sof-dot"></div>8 questions</div><div class="sof-intro-meta-item"><div class="sof-dot"></div>No obligation</div></div>' +
      '<button class="sof-btn-start" onclick="sofStartQuiz()">Begin Assessment &rarr;</button>' +
    '</div>' +

    // Q1
    q('sofQ1', 1, 'How much do you currently have invested or saved across all accounts?', 'Include retirement accounts, brokerage, savings &mdash; everything.',
      '<div class="sof-choices" id="q1choices">' + choice('q1','A','Under $500,000') + choice('q1','B','$500,000 &ndash; $1 million') + choice('q1','C','$1 million &ndash; $3 million') + choice('q1','D','$3 million or more') + '</div>', 0, 2) +

    // Q2
    q('sofQ2', 2, 'Do you currently work with a financial advisor?', null,
      '<div class="sof-choices">' + choice('q2','A','Yes &mdash; and I\'m satisfied with the relationship') + choice('q2','B','Yes &mdash; but I have questions or concerns','Not sure I\'m getting what I need') + choice('q2','C','No &mdash; I manage my own investments') + choice('q2','D','No &mdash; and I\'m looking for an advisor') + '</div>', 1, 3) +

    // Q3
    q('sofQ3', 3, 'When did you last have a comprehensive review of your full financial picture?', 'Investment strategy, tax efficiency, estate planning, insurance &mdash; all of it.',
      '<div class="sof-choices">' + choice('q3','A','Within the last 12 months') + choice('q3','B','1 &ndash; 3 years ago') + choice('q3','C','More than 3 years ago') + choice('q3','D','I\'ve never had a comprehensive review') + '</div>', 2, 4) +

    // Q4
    q('sofQ4', 4, 'Which of these concerns you most about your current financial situation?', 'Select all that apply.',
      '<div class="sof-multi-hint">Select all that apply &mdash; then click Continue.</div><div class="sof-choices" id="q4choices">' + choice('q4','A','Not knowing if my portfolio is properly allocated for my age and goals',null,true) + choice('q4','B','Paying too much in taxes on my investments or income',null,true) + choice('q4','C','Whether I\'ll have enough to retire comfortably',null,true) + choice('q4','D','Protecting my assets and estate for my family',null,true) + choice('q4','E','High fees or not understanding what I\'m paying my advisor',null,true) + choice('q4','F','My business finances and personal wealth aren\'t coordinated',null,true) + '</div>', 3, 5, 'sofGoNext(5)') +

    // Q5
    q('sofQ5', 5, 'How would you describe your investment risk tolerance?', null,
      '<div class="sof-choices">' + choice('q5','A','Conservative &mdash; protecting what I have comes first') + choice('q5','B','Moderate &mdash; balanced growth with some protection') + choice('q5','C','Growth-oriented &mdash; comfortable with market fluctuations') + choice('q5','D','I\'m not sure &mdash; it\'s never been formally assessed') + '</div>', 4, 6) +

    // Q6
    q('sofQ6', 6, 'Are you or your spouse a business owner, or have you recently experienced a significant financial event?', 'Business sale, inheritance, equity compensation, retirement, divorce, or other liquidity event.',
      '<div class="sof-choices">' + choice('q6','A','Yes &mdash; I own or recently sold a business') + choice('q6','B','Yes &mdash; I\'ve experienced a significant liquidity event recently') + choice('q6','C','No &mdash; but I anticipate one within the next 1&ndash;3 years') + choice('q6','D','No significant events') + '</div>', 5, 7) +

    // Q7
    q('sofQ7', 7, 'How many years until you plan to retire &mdash; or, if retired, how long ago did you retire?', null,
      '<div class="sof-choices">' + choice('q7','A','Already retired') + choice('q7','B','Within the next 5 years') + choice('q7','C','5 &ndash; 15 years away') + choice('q7','D','More than 15 years away') + '</div>', 6, 8) +

    // Q8
    '<div class="sof-question-screen" id="sofQ8"><div class="sof-q-header"><div class="sof-q-number">Question 8 of 8</div><div class="sof-q-text">What matters most to you in a financial advisor relationship?</div></div><div class="sof-q-body"><div class="sof-choices">' +
      choice('q8','A','Independence &mdash; no conflicts of interest or product quotas') + choice('q8','B','Clear, simple communication &mdash; I want to understand my plan') + choice('q8','C','Performance and strategy &mdash; getting the best returns for my risk') + choice('q8','D','A comprehensive partner &mdash; someone who coordinates everything') +
    '</div></div><div class="sof-q-nav"><button class="sof-btn-back" onclick="sofGoBack(7)">&larr; Back</button><button class="sof-btn-next" id="q8next" disabled onclick="sofGoContact()">See My Results &rarr;</button></div></div>' +

    // Contact form
    '<div class="sof-contact-screen" id="sofContactScreen"><div class="sof-contact-header"><div class="sof-q-number">Almost there</div><div class="sof-q-text">Where should we send your personalized assessment?</div><div class="sof-q-sub">Your results are ready. Enter your contact info and James will personally review your answers before reaching out.</div></div>' +
    '<div class="sof-contact-body"><p class="sof-form-note">No spam, ever. Your information is used only to send your assessment results and, if you choose, to schedule a complimentary consultation.</p>' +
    '<div class="form-honeypot" aria-hidden="true"><input type="text" id="sofHpWebsite" name="website_url" tabindex="-1" autocomplete="off"></div><div class="form-honeypot" aria-hidden="true"><input type="email" id="sofHpEmail" name="email_confirm" tabindex="-1" autocomplete="off"></div>' +
    '<div class="sof-form-row"><div class="sof-form-col"><label class="sof-form-label" for="sofFirstName">First Name</label><input class="sof-text-input" type="text" id="sofFirstName" placeholder="James" autocomplete="given-name"></div><div class="sof-form-col"><label class="sof-form-label" for="sofLastName">Last Name</label><input class="sof-text-input" type="text" id="sofLastName" placeholder="Madden" autocomplete="family-name"></div></div>' +
    '<div class="sof-form-row"><div class="sof-form-col"><label class="sof-form-label" for="sofEmail">Email Address</label><input class="sof-text-input" type="email" id="sofEmail" placeholder="you@company.com" autocomplete="email"></div><div class="sof-form-col"><label class="sof-form-label" for="sofPhone">Phone (optional)</label><input class="sof-text-input" type="tel" id="sofPhone" placeholder="(972) 555-0100" autocomplete="tel"></div></div>' +
    '<div class="sof-form-row" style="margin-bottom:0"><div class="sof-form-col"><label class="sof-form-label" for="sofCity">City / Area</label><input class="sof-text-input" type="text" id="sofCity" placeholder="McKinney, TX"></div><div class="sof-form-col"><label class="sof-form-label" for="sofBestTime">Best Time to Reach You</label><select class="sof-text-input" id="sofBestTime"><option value="">No preference</option><option>Morning (8am-12pm)</option><option>Afternoon (12pm-4pm)</option><option>Evening (4pm-7pm)</option></select></div></div>' +
    '<div style="margin-top:20px"><div class="sof-consent-wrap"><input type="checkbox" id="sofConsent" checked><label class="sof-consent-text" for="sofConsent">I consent to being contacted by High Ridge Advisory regarding my assessment results and to learn about advisory services. I understand I can opt out at any time.</label></div></div></div>' +
    '<div class="sof-q-nav"><button class="sof-btn-back" onclick="sofGoBack(8)">&larr; Back</button><button class="sof-btn-next" onclick="sofSubmitForm()">View My Results &rarr;</button></div></div>' +

    // Results
    '<div class="sof-result-screen" id="sofResultScreen"><div class="sof-result-header"><div class="sof-result-icon">&#10003;</div><h2 id="sofResultHeadline">Your Assessment is Complete</h2><p id="sofResultSubhead">Based on your answers, here\'s what we found.</p></div>' +
    '<div class="sof-result-body"><div class="sof-score-summary" id="sofScoreSummary"></div><div class="sof-findings-title">Key Observations</div><div id="sofFindingsList"></div>' +
    '<div class="sof-result-cta"><p id="sofCtaText">James Madden will personally review your responses and reach out within one business day. In the meantime, you\'re welcome to schedule your complimentary Second Opinion consultation directly.</p>' +
    '<a class="sof-btn-schedule" href="#" data-booking>Schedule a Free Consultation &rarr;</a></div></div></div>';

  var popupHTML =
    '<div class="exit-popup" id="exit-popup" role="dialog" aria-modal="true">' +
      '<div class="exit-popup-overlay"></div>' +
      '<div class="exit-popup-content">' +
        '<button class="exit-popup-close" aria-label="Close popup">&times;</button>' +
        '<div class="sof-progress-wrap" style="padding: 16px 24px 0;"><div class="sof-progress-track"><div class="sof-progress-fill" id="sofProgressFill"></div></div><div class="sof-progress-label" id="sofProgressLabel">Getting started</div></div>' +
        '<div class="sof-quiz-card" id="sofQuizCard" style="box-shadow:none;border:none;max-width:none;">' + quizHTML + '</div>' +
      '</div>' +
    '</div>';

  document.body.insertAdjacentHTML('beforeend', popupHTML);

  // Dynamically load quiz CSS and JS
  if (!document.querySelector('link[href*="second-opinion.css"]')) {
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'css/second-opinion.css';
    document.head.appendChild(css);
  }
  if (!document.querySelector('script[src*="second-opinion.js"]')) {
    var js = document.createElement('script');
    js.src = 'js/second-opinion.js';
    document.body.appendChild(js);
  }

  var popup = document.getElementById('exit-popup');
  var closeBtn = popup.querySelector('.exit-popup-close');
  var overlay = popup.querySelector('.exit-popup-overlay');

  function showPopup() {
    if (popupShown) return;
    popupShown = true;
    sessionStorage.setItem('exitPopupShown', 'true');
    popup.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }

  function hidePopup() {
    popup.classList.remove('is-visible');
    document.body.style.overflow = '';
  }

  // Detect exit intent (mouse leaving viewport at top)
  document.addEventListener('mouseleave', function(e) {
    if (e.clientY < 10) {
      showPopup();
    }
  });

  // Close handlers
  closeBtn.addEventListener('click', hidePopup);
  overlay.addEventListener('click', hidePopup);

  // Close on escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && popup.classList.contains('is-visible')) {
      hidePopup();
    }
  });
}

// ----------------------------------------
// Portal Redirect Overlay
// ----------------------------------------
function initPortalRedirect() {
  var REDIRECT_DELAY = 1500;

  function showRedirectOverlay(destinationUrl, platformName) {
    var overlay = document.createElement('div');
    overlay.className = 'portal-redirect-overlay';
    overlay.innerHTML =
      '<div class="portal-redirect-content">' +
        '<img src="/images/logo.webp" alt="High Ridge Advisory" class="portal-redirect-logo">' +
        '<h2 class="portal-redirect-title">Redirecting to ' + platformName + '</h2>' +
        '<div class="portal-redirect-dots"><span></span><span></span><span></span></div>' +
        '<div class="portal-redirect-badge">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' +
          '</svg>' +
          '<span>Secure Connection</span>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    setTimeout(function() {
      overlay.classList.add('active');
    }, 10);

    setTimeout(function() {
      window.open(destinationUrl, '_blank', 'noopener,noreferrer');
      overlay.classList.remove('active');
      setTimeout(function() {
        overlay.remove();
      }, 300);
    }, REDIRECT_DELAY);
  }

  var portalCards = document.querySelectorAll('.portal-card[data-portal-name]');
  portalCards.forEach(function(card) {
    card.addEventListener('click', function(e) {
      e.preventDefault();
      var url = card.getAttribute('href');
      var name = card.getAttribute('data-portal-name');
      showRedirectOverlay(url, name);
    });
  });
}
