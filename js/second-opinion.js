// ── Second Opinion Assessment — Quiz Logic ──────────────────

(function () {
  'use strict';

  // ── STATE ──────────────────────────────────────────────────
  var answers = {};
  var multiAnswers = { q4: new Set() };

  // ── GA4 TRACKING ───────────────────────────────────────────
  function sofTrack(eventName, params) {
    if (typeof gtag === 'function') {
      params = params || {};
      params.quiz_surface = sofGetSurface();
      // Attach UTM params if captured
      if (window.sofUtmParams) {
        for (var k in window.sofUtmParams) {
          if (window.sofUtmParams.hasOwnProperty(k)) params[k] = window.sofUtmParams[k];
        }
      }
      gtag('event', eventName, params);
    }
  }

  function sofGetSurface() {
    // Determine which surface the quiz is running on
    var popup = document.getElementById('exit-popup');
    if (popup && popup.classList.contains('is-visible')) return 'exit_popup';
    if (window.location.pathname.includes('second-opinion')) return 'standalone_page';
    return 'homepage_embed';
  }

  // ── UTM PARAMETER CAPTURE ─────────────────────────────────
  // Captures UTM params from the URL so they can be attached to form submissions and GA4 events
  (function captureUtm() {
    var params = new URLSearchParams(window.location.search);
    var utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    var captured = {};
    var hasUtm = false;
    utmKeys.forEach(function (key) {
      var val = params.get(key);
      if (val) { captured[key] = val; hasUtm = true; }
    });
    if (hasUtm) {
      window.sofUtmParams = captured;
      // Store in sessionStorage so UTMs persist across page navigation
      try { sessionStorage.setItem('sofUtmParams', JSON.stringify(captured)); } catch (e) {}
    } else {
      // Restore from sessionStorage if arriving from an earlier UTM-tagged page
      try {
        var stored = sessionStorage.getItem('sofUtmParams');
        if (stored) window.sofUtmParams = JSON.parse(stored);
      } catch (e) {}
    }
  })();

  // ── BOT PREVENTION ─────────────────────────────────────────
  var sofT0 = Date.now();
  var sofInteracted = false;
  var SOF_MIN_TIME_MS = 15000; // must spend at least 15s (quiz takes ~3 min)

  function sofFlagInteraction() { sofInteracted = true; }
  ['mousemove', 'scroll', 'touchstart', 'keydown'].forEach(function (evt) {
    document.addEventListener(evt, sofFlagInteraction, { once: true, passive: true });
  });

  function sofIsBot() {
    // Check honeypot fields
    var hp1 = document.getElementById('sofHpWebsite');
    var hp2 = document.getElementById('sofHpEmail');
    if ((hp1 && hp1.value) || (hp2 && hp2.value)) return true;
    // Time gate — must have been on page at least 15 seconds
    if (Date.now() - sofT0 < SOF_MIN_TIME_MS) return true;
    // Interaction signal
    if (!sofInteracted) return true;
    return false;
  }

  // ── PROGRESS ───────────────────────────────────────────────
  function setProgress(step) {
    var total = 10; // intro(0) + 8 questions + contact + result
    var pct = Math.min(Math.round((step / total) * 100), 100);
    document.getElementById('sofProgressFill').style.width = pct + '%';
    var labels = {
      0: 'Getting started',
      1: 'Question 1 of 8', 2: 'Question 2 of 8', 3: 'Question 3 of 8',
      4: 'Question 4 of 8', 5: 'Question 5 of 8', 6: 'Question 6 of 8',
      7: 'Question 7 of 8', 8: 'Question 8 of 8',
      9: 'Almost done', 10: 'Complete'
    };
    document.getElementById('sofProgressLabel').textContent = labels[step] || '';
  }

  // ── SCREEN TRANSITIONS ─────────────────────────────────────
  function showScreen(id) {
    document.querySelectorAll('.sof-intro-screen, .sof-question-screen, .sof-contact-screen, .sof-result-screen')
      .forEach(function (el) { el.style.display = 'none'; el.classList.remove('sof-active'); });
    var el = document.getElementById(id);
    el.style.display = 'block';
    el.classList.add('sof-active');
    el.classList.remove('sof-slide-in');
    void el.offsetWidth;
    el.classList.add('sof-slide-in');
    var card = document.getElementById('sofQuizCard');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function startQuiz() {
    showScreen('sofQ1');
    setProgress(1);
    sofTrack('sof_quiz_start');
  }

  function goNext(nextQ) {
    // Track the question they just answered (nextQ - 1)
    var prevQ = nextQ - 1;
    var prevKey = 'q' + prevQ;
    var answer = answers[prevKey];
    sofTrack('sof_question_answered', {
      question_number: prevQ,
      answer: Array.isArray(answer) ? answer.join(', ') : (answer || '')
    });
    showScreen('sofQ' + nextQ);
    setProgress(nextQ);
  }

  function goBack(prevQ) {
    if (prevQ === 0) { showScreen('sofIntroScreen'); setProgress(0); }
    else { showScreen('sofQ' + prevQ); setProgress(prevQ); }
  }

  function goContact() {
    // Track Q8 answer
    sofTrack('sof_question_answered', {
      question_number: 8,
      answer: answers.q8 || ''
    });
    sofTrack('sof_contact_form_viewed');
    showScreen('sofContactScreen');
    setProgress(9);
  }

  // ── SINGLE SELECT ──────────────────────────────────────────
  function selectChoice(qId, value, btn) {
    answers[qId] = value;
    btn.closest('.sof-q-body').querySelectorAll('.sof-choice-btn:not(.sof-multi)')
      .forEach(function (b) { b.classList.remove('sof-selected'); });
    btn.classList.add('sof-selected');
    var nextBtn = document.getElementById(qId + 'next');
    if (nextBtn) nextBtn.disabled = false;
  }

  // ── MULTI SELECT ───────────────────────────────────────────
  function toggleMulti(qId, value, btn) {
    var set = multiAnswers[qId];
    if (set.has(value)) { set.delete(value); btn.classList.remove('sof-selected'); }
    else { set.add(value); btn.classList.add('sof-selected'); }
    answers[qId] = Array.from(set);
  }

  // ── GAP CALCULATION ────────────────────────────────────────
  function calculateGaps() {
    var gaps = 0;
    var findings = [];

    // Q2: advisor satisfaction
    if (answers.q2 === 'B') { gaps++; findings.push('You have concerns about your current advisor relationship \u2014 this is the most common reason people seek a second opinion.'); }
    if (answers.q2 === 'C') { gaps++; findings.push('Self-managed portfolios often lack tax efficiency and a coordinated strategy \u2014 a professional review can identify blind spots.'); }
    if (answers.q2 === 'D') { gaps += 2; findings.push("You\u2019re actively looking for an advisor \u2014 our fiduciary, independent approach may be a strong fit for your situation."); }

    // Q3: last review
    if (answers.q3 === 'C') { gaps++; findings.push("It\u2019s been over 3 years since a comprehensive review \u2014 markets, tax laws, and your personal situation have all likely changed significantly."); }
    if (answers.q3 === 'D') { gaps += 2; findings.push("You\u2019ve never had a comprehensive financial review \u2014 this is the single highest-impact step most investors can take."); }

    // Q4: concerns
    var concerns = answers.q4 || [];
    if (concerns.indexOf('B') !== -1) findings.push('Tax inefficiency is one of the most overlooked drains on long-term wealth \u2014 proper planning can save significant amounts annually.');
    if (concerns.indexOf('E') !== -1) { gaps++; findings.push('Fee transparency is a core fiduciary principle \u2014 you should always know exactly what you pay and why.'); }
    if (concerns.indexOf('F') !== -1) { gaps++; findings.push('Business owner and personal wealth coordination is a specialty area where most general advisors fall short.'); }
    if (concerns.length >= 3) gaps++;

    // Q5: risk never assessed
    if (answers.q5 === 'D') { gaps++; findings.push("Your risk tolerance has never been formally assessed \u2014 this is foundational to building a portfolio that matches your actual situation."); }

    // Q6: business / liquidity event
    if (answers.q6 === 'A' || answers.q6 === 'B') { gaps += 2; findings.push('Business owners and those who have experienced liquidity events face complex tax and estate planning decisions that require specialized expertise.'); }
    if (answers.q6 === 'C') { gaps++; findings.push("Planning 1\u20133 years before a liquidity event is ideal \u2014 there are significant tax strategies that must be implemented before the transaction closes."); }

    // Q7: near retirement
    if (answers.q7 === 'A') { gaps++; findings.push("In retirement, portfolio strategy shifts significantly \u2014 ensuring your plan is built for income, not just accumulation, is critical."); }
    if (answers.q7 === 'B') { gaps++; findings.push('The 5 years before retirement are the highest-stakes planning window \u2014 sequence-of-returns risk and tax strategy are paramount.'); }

    if (!findings.length) findings.push('Your answers suggest a generally well-managed financial situation. An independent review can confirm this and identify any remaining opportunities.');

    return { gaps: gaps, findings: findings };
  }

  // ── NETLIFY FORM SUBMISSION ────────────────────────────────
  function submitToNetlify(gaps, resultLevel) {
    var consented = document.getElementById('sofConsent').checked;
    var formData = new URLSearchParams();
    formData.append('form-name', consented ? 'second-opinion' : 'second-opinion-no-contact');
    formData.append('first-name', document.getElementById('sofFirstName').value.trim());
    formData.append('last-name', document.getElementById('sofLastName').value.trim());
    formData.append('email', document.getElementById('sofEmail').value.trim());
    formData.append('phone', document.getElementById('sofPhone').value.trim());
    formData.append('city', document.getElementById('sofCity').value.trim());
    formData.append('best-time', document.getElementById('sofBestTime').value);
    formData.append('consent', document.getElementById('sofConsent').checked ? 'yes' : 'no');

    // Quiz answers
    for (var i = 1; i <= 8; i++) {
      var key = 'q' + i;
      var val = answers[key];
      formData.append('quiz-q' + i, Array.isArray(val) ? val.join(', ') : (val || ''));
    }
    formData.append('quiz-gaps', gaps);
    formData.append('quiz-result-level', resultLevel);

    // Include UTM params if present
    if (window.sofUtmParams) {
      for (var key in window.sofUtmParams) {
        if (window.sofUtmParams.hasOwnProperty(key)) {
          formData.append(key, window.sofUtmParams[key]);
        }
      }
    }

    // Submit in background — don't block the results screen
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    }).catch(function () {
      // Silently fail — results are already shown to the user
    });
  }

  // ── FORM SUBMIT ────────────────────────────────────────────
  function submitForm() {
    var first = document.getElementById('sofFirstName').value.trim();
    var email = document.getElementById('sofEmail').value.trim();
    if (!first || !email) { alert('Please enter at least your first name and email address.'); return; }

    // Bot check — silently block submission but still show results
    if (sofIsBot()) {
      showResult(first, calculateGaps());
      setProgress(10);
      return;
    }

    // Calculate results
    var result = calculateGaps();
    var resultLevel = result.gaps >= 5 ? 'strongly-recommended' : (result.gaps >= 3 ? 'meaningful-gaps' : 'solid');
    var consented = document.getElementById('sofConsent').checked;

    // Track form submission
    sofTrack('sof_form_submitted', {
      consent_given: consented ? 'yes' : 'no',
      gaps_identified: result.gaps,
      result_level: resultLevel,
      portfolio_range: answers.q1 || '',
      retirement_timeline: answers.q7 || ''
    });

    // Submit to Netlify in the background
    submitToNetlify(result.gaps, resultLevel);

    // Show results immediately
    showResult(first, result);
    setProgress(10);
  }

  // ── SCHEDULE CTA TRACKING ───────────────────────────────────
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.sof-btn-schedule');
    if (btn) {
      sofTrack('sof_schedule_clicked', {
        result_level: window._sofLastResultLevel || ''
      });
    }
  });

  // ── RESULTS DISPLAY ────────────────────────────────────────
  function showResult(firstName, result) {
    showScreen('sofResultScreen');
    // Store for schedule CTA tracking
    window._sofLastResultLevel = result.gaps >= 5 ? 'strongly-recommended' : (result.gaps >= 3 ? 'meaningful-gaps' : 'solid');
    sofTrack('sof_results_viewed', {
      gaps_identified: result.gaps,
      result_level: window._sofLastResultLevel
    });

    var gaps = result.gaps;
    var findings = result.findings;

    // Headline based on score
    var headline, subhead, ctaText;
    if (gaps >= 5) {
      headline = firstName + ', a second opinion is strongly recommended';
      subhead = 'Your answers indicate several significant planning gaps worth addressing.';
      ctaText = 'Based on your responses, there are meaningful opportunities to improve your financial position. James will review your answers personally and reach out within one business day with specific observations. Scheduling a complimentary consultation is the logical next step.';
    } else if (gaps >= 3) {
      headline = firstName + ', there are meaningful gaps worth reviewing';
      subhead = 'Your answers point to a few specific areas where a fresh perspective could add value.';
      ctaText = "Your situation would benefit from a focused second-opinion conversation \u2014 not a general sales pitch, but a specific review of the areas your answers highlighted. James will reach out within one business day.";
    } else {
      headline = firstName + ', your foundation looks solid';
      subhead = 'That said, even well-managed portfolios benefit from an independent review.';
      ctaText = "Your answers suggest you\u2019re in a reasonably good position. A complimentary second-opinion conversation can confirm that \u2014 or surface something worth adjusting. James will reach out within one business day.";
    }

    document.getElementById('sofResultHeadline').textContent = headline;
    document.getElementById('sofResultSubhead').textContent = subhead;
    document.getElementById('sofCtaText').textContent = ctaText;

    // Score cards
    var assetMap = { A: 'Under $500K', B: '$500K\u2013$1M', C: '$1M\u2013$3M', D: '$3M+' };
    var retireMap = { A: 'Retired', B: 'Within 5 yrs', C: '5\u201315 yrs', D: '15+ yrs' };
    document.getElementById('sofScoreSummary').innerHTML =
      '<div class="sof-score-card">' +
        '<div class="sof-sc-val">' + gaps + '</div>' +
        '<div class="sof-sc-label">Planning Gaps Identified</div>' +
      '</div>' +
      '<div class="sof-score-card">' +
        '<div class="sof-sc-val">' + (assetMap[answers.q1] || '\u2014') + '</div>' +
        '<div class="sof-sc-label">Portfolio Range</div>' +
      '</div>' +
      '<div class="sof-score-card">' +
        '<div class="sof-sc-val">' + (retireMap[answers.q7] || '\u2014') + '</div>' +
        '<div class="sof-sc-label">Retirement Timeline</div>' +
      '</div>';

    // Findings
    document.getElementById('sofFindingsList').innerHTML = findings.map(function (f) {
      return '<div class="sof-finding-item"><div class="sof-finding-dot"></div><div class="sof-finding-text">' + f + '</div></div>';
    }).join('');
  }

  // ── PUBLIC API (attach to window for onclick handlers) ─────
  window.sofStartQuiz = startQuiz;
  window.sofGoNext = goNext;
  window.sofGoBack = goBack;
  window.sofGoContact = goContact;
  window.sofSelectChoice = selectChoice;
  window.sofToggleMulti = toggleMulti;
  window.sofSubmitForm = submitForm;
})();
