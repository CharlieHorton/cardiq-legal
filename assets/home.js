// CardIQ landing page: the playable demo, ticker speed, Daily countdown and score curve.
// Scoring, nudges and Daily dates mirror the app's src/engine and src/lib; keep them in step.
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Shared maths (src/engine/scoring.ts, src/lib/price-entry.ts) ─────────

  var SCORE_SCALE = 0.376;
  var SCORE_SHAPE = 1.5;
  var BANDS = [
    { max: 0.02, label: 'Bullseye', color: '#D4FF3F' },
    { max: 0.05, label: 'Incredible', color: '#B5F23A' },
    { max: 0.1, label: 'Very close', color: '#93E45B' },
    { max: 0.2, label: 'Good', color: '#F2E14A' },
    { max: 0.3, label: 'Close', color: '#FFB224' },
    { max: 0.5, label: 'Off', color: '#FF8A3D' },
    { max: Infinity, label: 'Way off', color: '#FF5A3D' }
  ];

  function scoreForError(error) {
    return Math.round(1000 * Math.exp(-Math.pow(error / SCORE_SCALE, SCORE_SHAPE)));
  }
  function bandFor(error) {
    for (var i = 0; i < BANDS.length; i++) if (error < BANDS[i].max) return BANDS[i];
    return BANDS[BANDS.length - 1];
  }
  /** The share grid's colours (src/engine/share.ts shareEmoji). */
  function shareColor(error) {
    if (error < 0.1) return '#6FD34A';
    if (error < 0.2) return '#F2E14A';
    if (error < 0.5) return '#FF8A3D';
    return '#FF5A3D';
  }
  function gbp(value) {
    return '£' + Math.round(value).toLocaleString('en-GB');
  }
  function applyKey(entry, key) {
    if (key === 'back') return entry.slice(0, -1);
    if (key === '.') {
      if (entry.indexOf('.') !== -1) return entry;
      return entry === '' ? '0.' : entry + '.';
    }
    var parts = entry.split('.');
    if (parts.length > 1) return parts[1].length >= 2 ? entry : entry + key;
    if (parts[0] === '0') return key;
    return parts[0].length >= 7 ? entry : entry + key;
  }
  function entryValue(entry) {
    var value = parseFloat(entry);
    return isFinite(value) ? value : 0;
  }
  function nudgeSteps(value) {
    var digits = Math.max(1, Math.floor(Math.log10(Math.max(value, 1))) + 1);
    var small = Math.pow(10, Math.max(0, digits - 3));
    return { small: small, large: small * 10 };
  }
  function nudge(entry, delta) {
    var next = Math.max(0, Math.round((entryValue(entry) + delta) * 100) / 100);
    if (next === 0) return '';
    return next % 1 === 0 ? String(next) : next.toFixed(2);
  }
  function formatEntry(entry) {
    if (entry === '') return '0';
    var parts = entry.split('.');
    var grouped = Number(parts[0] || '0').toLocaleString('en-GB');
    return parts.length > 1 ? grouped + '.' + parts[1] : grouped;
  }

  // ── Ticker: a steady 36px a second whatever the screen width, like the app ──

  var tape = document.querySelector('.ticker-tape');
  if (tape) tape.style.setProperty('--tape-duration', Math.round(tape.scrollWidth / 2 / 36) + 's');

  // ── Daily number and countdown (src/engine/dates.ts) ─────────────────────

  var DAILY_EPOCH = Date.UTC(2026, 8, 24);

  function ukClock(now) {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London', year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23'
      }).formatToParts(now);
      var get = function (type) {
        for (var i = 0; i < parts.length; i++) if (parts[i].type === type) return Number(parts[i].value);
        return 0;
      };
      return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute'), s: get('second') };
    } catch (e) {
      return { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1, d: now.getUTCDate(), h: now.getUTCHours(), min: now.getUTCMinutes(), s: now.getUTCSeconds() };
    }
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var kicker = document.querySelector('[data-daily-kicker]');
  var countdown = document.querySelector('[data-countdown]');
  var dailyLabel = document.querySelector('[data-daily-label]');
  var dailyNumbers = document.querySelectorAll('[data-daily-number]');

  function tick() {
    var uk = ukClock(new Date());
    var number = Math.round((Date.UTC(uk.y, uk.m - 1, uk.d) - DAILY_EPOCH) / 86400000) + 1;
    var left = 86400 - (uk.h * 3600 + uk.min * 60 + uk.s);
    var clock = pad(Math.floor(left / 3600)) + ':' + pad(Math.floor(left / 60) % 60) + ':' + pad(left % 60);
    if (number < 1) return;
    if (kicker) kicker.textContent = 'Daily #' + number + ' · next in ' + clock;
    if (countdown) countdown.textContent = clock;
    if (dailyLabel) dailyLabel.textContent = 'Daily #' + number + ' closes in';
    for (var i = 0; i < dailyNumbers.length; i++) dailyNumbers[i].textContent = number;
  }
  tick();
  setInterval(tick, 1000);

  // ── Scroll-in ────────────────────────────────────────────────────────────

  var revealables = document.querySelectorAll('.reveal, [data-curve]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealables.forEach(function (el) { observer.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('in'); });
  }

  // ── Score curve ──────────────────────────────────────────────────────────

  var curve = document.querySelector('[data-curve]');
  if (curve) {
    var SVGNS = 'http://www.w3.org/2000/svg';
    var MAX_ERROR = 0.6;
    var X = function (error) { return 44 + (error / MAX_ERROR) * 540; };
    var Y = function (score) { return 284 - (score / 1000) * 260; };
    var make = function (tag, attrs, text) {
      var el = document.createElementNS(SVGNS, tag);
      for (var key in attrs) el.setAttribute(key, attrs[key]);
      if (text) el.textContent = text;
      return el;
    };

    var bandsGroup = curve.querySelector('[data-curve-bands]');
    var from = 0;
    BANDS.forEach(function (band) {
      var to = Math.min(band.max, MAX_ERROR);
      bandsGroup.appendChild(make('rect', { x: X(from), y: 24, width: X(to) - X(from), height: 260, fill: band.color, opacity: 0.09 }));
      from = to;
    });

    var grid = curve.querySelector('[data-curve-grid]');
    [0, 500, 1000].forEach(function (score) {
      grid.appendChild(make('line', { x1: 44, x2: 584, y1: Y(score), y2: Y(score) }));
      grid.appendChild(make('text', { x: 36, y: Y(score) + 6, 'text-anchor': 'end', class: 'curve-axis' }, score === 1000 ? '1k' : String(score)));
    });
    [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].forEach(function (error) {
      grid.appendChild(make('text', { x: X(error), y: 310, 'text-anchor': 'middle', class: 'curve-axis' }, Math.round(error * 100) + '%'));
    });

    var points = [];
    for (var i = 0; i <= 120; i++) {
      var error = (i / 120) * MAX_ERROR;
      points.push(X(error).toFixed(1) + ',' + Y(scoreForError(error)).toFixed(1));
    }
    curve.querySelector('[data-curve-line]').setAttribute('d', 'M' + points.join(' L'));

    var probe = curve.querySelector('[data-curve-probe]');
    var probeLine = probe.querySelector('line');
    var probeDot = probe.querySelector('circle');
    var probeText = probe.querySelector('text');
    var slider = curve.querySelector('[data-miss]');
    var missOut = curve.querySelector('[data-miss-out]');
    var missPts = curve.querySelector('[data-miss-pts]');

    var setMiss = function () {
      var miss = Number(slider.value) / 100;
      var score = scoreForError(miss);
      var band = bandFor(miss);
      var x = X(miss);
      var y = Y(score);
      probeLine.setAttribute('x1', x);
      probeLine.setAttribute('x2', x);
      probeDot.setAttribute('cx', x);
      probeDot.setAttribute('cy', y);
      probeDot.style.stroke = band.color;
      probeText.setAttribute('x', x > 420 ? x - 14 : x + 14);
      probeText.setAttribute('y', Math.max(y - 14, 40));
      probeText.setAttribute('text-anchor', x > 420 ? 'end' : 'start');
      probeText.textContent = score + ' · ' + band.label.toUpperCase();
      missOut.textContent = Math.round(miss * 100) + '%';
      missPts.textContent = score.toLocaleString('en-GB') + ' pts';
      curve.style.setProperty('--tier', band.color);
    };
    slider.addEventListener('input', setMiss);
    setMiss();
  }

  // ── Playable demo ────────────────────────────────────────────────────────

  var demo = document.querySelector('[data-demo]');
  var dataEl = document.getElementById('demo-cards');
  if (!demo || !dataEl) return;

  var deck = JSON.parse(dataEl.textContent || '[]');
  if (deck.length < 3) return;

  var ROUND_SIZE = 3;
  var $ = function (selector) { return demo.querySelector(selector); };
  var els = {
    round: $('[data-round]'),
    points: $('[data-points]'),
    progress: demo.querySelectorAll('.demo-progress i'),
    play: $('[data-play]'),
    art: $('[data-card-art]'),
    img: $('[data-card-img]'),
    name: $('[data-card-name]'),
    finish: $('[data-card-finish]'),
    details: $('[data-card-details]'),
    guess: $('[data-guess]'),
    entry: $('[data-entry]'),
    lock: $('[data-lock]'),
    reveal: $('[data-reveal]'),
    market: $('[data-market]'),
    you: $('[data-you]'),
    youLabel: $('[data-you-label]'),
    result: $('[data-result]'),
    tier: $('[data-tier]'),
    accuracy: $('[data-accuracy]'),
    verdict: $('[data-verdict]'),
    score: $('[data-score]'),
    next: $('[data-next]'),
    summary: $('[data-summary]'),
    total: $('[data-total]'),
    grid: $('[data-grid]'),
    within: $('[data-within]'),
    bullseyes: $('[data-bullseyes]'),
    summaryTitle: $('[data-summary-title]'),
    again: $('[data-again]')
  };

  var state = { cards: [], index: 0, entry: '', phase: 'guess', results: [], played: {} };

  // Move focus to the next button only for keyboard players; a tap shouldn't leave a focus ring behind.
  var keyboardUser = false;
  document.addEventListener('keydown', function () { keyboardUser = true; }, true);
  document.addEventListener('pointerdown', function () { keyboardUser = false; }, true);
  function focusIfKeyboard(el) { if (keyboardUser) el.focus({ preventScroll: true }); }

  function shuffle(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = copy[i]; copy[i] = copy[j]; copy[j] = t;
    }
    return copy;
  }

  /** The first round opens on the card the page rendered; later rounds prefer unseen cards. */
  function dealRound(first) {
    var fresh = deck.filter(function (card) { return !state.played[card.image]; });
    if (fresh.length < ROUND_SIZE) { state.played = {}; fresh = deck.slice(); }
    var cards = first ? [deck[0]].concat(shuffle(deck.slice(1)).slice(0, ROUND_SIZE - 1)) : shuffle(fresh).slice(0, ROUND_SIZE);
    cards.forEach(function (card) { state.played[card.image] = true; });
    return cards;
  }

  function preload(card) {
    if (card) { var img = new Image(); img.src = card.image; }
  }

  function showCard(card) {
    if (els.img.getAttribute('src') !== card.image) {
      els.img.classList.add('loading');
      els.img.src = card.image;
    }
    els.img.alt = card.name + ', ' + card.set + ' ' + card.number;
    var fallback = els.art.querySelector('.card-fallback');
    if (fallback) fallback.remove();
    els.name.textContent = card.name;
    els.finish.textContent = card.finish || '';
    els.finish.hidden = !card.finish;
    setDetails([['Set', card.set], ['No.', card.number], ['Rarity', card.rarity], ['Year', card.year]]);
  }

  function setDetails(rows) {
    els.details.textContent = '';
    rows.forEach(function (row) {
      if (!row[1]) return;
      var div = document.createElement('div');
      var dt = document.createElement('dt');
      var dd = document.createElement('dd');
      dt.textContent = row[0];
      dd.textContent = row[1];
      div.appendChild(dt);
      div.appendChild(dd);
      els.details.appendChild(div);
    });
  }

  els.img.addEventListener('load', function () { els.img.classList.remove('loading'); });
  els.img.addEventListener('error', function () {
    els.img.classList.add('loading');
    if (els.art.querySelector('.card-fallback')) return;
    var fallback = document.createElement('div');
    fallback.className = 'card-fallback';
    fallback.textContent = els.name.textContent;
    els.art.appendChild(fallback);
  });

  function renderEntry() {
    var value = entryValue(state.entry);
    els.entry.textContent = '£' + formatEntry(state.entry);
    els.entry.classList.toggle('is-empty', state.entry === '');
    els.lock.disabled = value <= 0;
    var steps = nudgeSteps(value || 1000);
    demo.querySelectorAll('[data-nudge]').forEach(function (button) {
      var kind = button.getAttribute('data-nudge');
      var step = kind.indexOf('large') !== -1 ? steps.large : steps.small;
      button.textContent = (kind.charAt(0) === '-' ? '-' : '+') + gbp(step);
    });
  }

  function renderProgress() {
    els.round.textContent = 'Try it · ' + Math.min(state.index + 1, ROUND_SIZE) + '/' + ROUND_SIZE;
    var total = state.results.reduce(function (sum, r) { return sum + r.score; }, 0);
    els.points.textContent = total.toLocaleString('en-GB') + ' pts';
    els.progress.forEach(function (bar, i) {
      bar.className = i < state.results.length ? 'done' : i === state.index && state.phase !== 'summary' ? 'now' : '';
    });
  }

  function startRound(first) {
    state.cards = dealRound(first);
    state.index = 0;
    state.results = [];
    els.summary.hidden = true;
    els.play.hidden = false;
    startCard();
  }

  function startCard() {
    state.entry = '';
    state.phase = 'guess';
    showCard(state.cards[state.index]);
    els.guess.hidden = false;
    els.reveal.hidden = true;
    renderEntry();
    renderProgress();
    preload(state.cards[state.index + 1]);
  }

  function press(key) {
    if (state.phase !== 'guess') return;
    state.entry = applyKey(state.entry, key);
    renderEntry();
  }

  function rollOdometer(el, text) {
    el.textContent = '';
    el.setAttribute('aria-label', text);
    var reels = [];
    text.split('').forEach(function (ch) {
      if (!/\d/.test(ch)) {
        var plain = document.createElement('span');
        plain.textContent = ch;
        plain.setAttribute('aria-hidden', 'true');
        el.appendChild(plain);
        return;
      }
      var slot = document.createElement('span');
      slot.className = 'odo-slot';
      slot.setAttribute('aria-hidden', 'true');
      var reel = document.createElement('span');
      reel.className = 'odo-reel';
      for (var i = 0; i < 20; i++) {
        var digit = document.createElement('span');
        digit.textContent = i % 10;
        reel.appendChild(digit);
      }
      slot.appendChild(reel);
      el.appendChild(slot);
      reels.push({ reel: reel, digit: Number(ch) });
    });
    // Two frames so the reels paint at 0 before rolling.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        reels.forEach(function (item, i) {
          item.reel.style.transitionDelay = (reels.length - 1 - i) * 90 + 'ms';
          item.reel.style.transform = 'translateY(' + -(10 + item.digit) * 1.1 + 'em)';
        });
      });
    });
  }

  function countUp(el, to, prefix, duration) {
    if (reduceMotion) { el.textContent = prefix + to.toLocaleString('en-GB'); return; }
    var start = null;
    var step = function (time) {
      if (start === null) start = time;
      var t = Math.min(1, (time - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = prefix + Math.round(to * eased).toLocaleString('en-GB');
      if (t < 1) requestAnimationFrame(step);
    };
    el.textContent = prefix + '0';
    requestAnimationFrame(step);
  }

  function lockIn() {
    var guess = entryValue(state.entry);
    if (state.phase !== 'guess' || guess <= 0) return;
    var card = state.cards[state.index];
    var signed = (guess - card.price) / card.price;
    var error = Math.abs(signed);
    var score = scoreForError(error);
    var band = bandFor(error);
    state.results.push({ error: error, score: score, band: band });
    state.phase = 'reveal';

    els.guess.hidden = true;
    els.reveal.hidden = false;
    setDetails([['Set', card.set], ['No.', card.number], ['UK', gbp(card.price)], ['US', card.us ? gbp(card.us) : null]]);
    rollOdometer(els.market, gbp(card.price));

    // The meter shows ±30%; anything further pins to the edge.
    var clamped = Math.max(-0.3, Math.min(0.3, signed));
    els.you.classList.remove('edge-left', 'edge-right');
    els.you.style.transition = 'none';
    els.you.style.left = '50%';
    els.youLabel.textContent = 'You ' + gbp(guess);
    void els.you.offsetWidth;
    els.you.style.transition = '';
    els.you.style.left = 50 + (clamped / 0.3) * 50 + '%';
    if (clamped <= -0.2) els.you.classList.add('edge-left');
    if (clamped >= 0.2) els.you.classList.add('edge-right');

    els.result.style.setProperty('--tier', band.color);
    els.tier.textContent = band.label;
    els.accuracy.textContent = Math.round(Math.max(0, 1 - error) * 100) + '% accurate';
    var percent = (error * 100).toFixed(1) + '%';
    els.verdict.textContent =
      Math.round(guess * 100) === Math.round(card.price * 100) ? 'Spot on. Exactly the market price.'
        : signed < 0 ? 'You undervalued it by ' + percent + '.'
        : 'You overvalued it by ' + percent + '.';
    countUp(els.score, score, '+', 900);

    els.next.innerHTML = (state.index === ROUND_SIZE - 1 ? 'See your result' : 'Next card') + ' <span class="arrow" aria-hidden="true">→</span>';
    renderProgress();
    focusIfKeyboard(els.next);
  }

  function next() {
    if (state.phase !== 'reveal') return;
    if (state.index < ROUND_SIZE - 1) {
      state.index++;
      startCard();
      return;
    }
    showSummary();
  }

  function showSummary() {
    state.phase = 'summary';
    state.index = ROUND_SIZE;
    renderProgress();
    els.play.hidden = true;
    els.summary.hidden = false;
    var total = state.results.reduce(function (sum, r) { return sum + r.score; }, 0);
    countUp(els.total, total, '', 1100);
    els.grid.textContent = '';
    state.results.forEach(function (r) {
      var square = document.createElement('i');
      square.style.setProperty('--c', shareColor(r.error));
      els.grid.appendChild(square);
    });
    var within = state.results.filter(function (r) { return r.error < 0.2; }).length;
    var bullseyes = state.results.filter(function (r) { return r.error < 0.02; }).length;
    els.within.innerHTML = '<b>' + within + ' / ' + ROUND_SIZE + '</b> within 20%';
    els.bullseyes.innerHTML = bullseyes ? '<b>' + bullseyes + '</b> ' + (bullseyes === 1 ? 'bullseye' : 'bullseyes') : 'No bullseyes yet';
    els.summaryTitle.textContent =
      total >= 2600 ? 'You know this market.' : total >= 1800 ? 'Sharp eye.' : total >= 900 ? 'Getting warmer.' : 'The market fooled you.';
    focusIfKeyboard(els.again);
  }

  demo.addEventListener('click', function (event) {
    var button = event.target.closest('button');
    if (!button || !demo.contains(button)) return;
    if (button.hasAttribute('data-key')) press(button.getAttribute('data-key'));
    else if (button.hasAttribute('data-nudge')) {
      var kind = button.getAttribute('data-nudge');
      var steps = nudgeSteps(entryValue(state.entry) || 1000);
      var step = kind.indexOf('large') !== -1 ? steps.large : steps.small;
      state.entry = nudge(state.entry, kind.charAt(0) === '-' ? -step : step);
      renderEntry();
    } else if (button.hasAttribute('data-lock')) lockIn();
    else if (button.hasAttribute('data-next')) next();
    else if (button.hasAttribute('data-again')) startRound(false);
  });

  // A hardware keyboard works while the demo is on screen.
  var demoVisible = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { demoVisible = entries[0].isIntersecting; }, { threshold: 0.4 }).observe(demo);
  }
  document.addEventListener('keydown', function (event) {
    if (!demoVisible || event.metaKey || event.ctrlKey || event.altKey) return;
    var target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    var key = event.key;
    if (state.phase === 'guess') {
      var mapped = /^[0-9.]$/.test(key) ? key : key === 'Backspace' ? 'back' : null;
      if (mapped) {
        event.preventDefault();
        press(mapped);
        var button = demo.querySelector('[data-key="' + mapped + '"]');
        if (button) {
          button.classList.add('pressed');
          setTimeout(function () { button.classList.remove('pressed'); }, 120);
        }
      } else if (key === 'Enter' && !(target && target.tagName === 'BUTTON' && demo.contains(target))) {
        event.preventDefault();
        lockIn();
      }
    } else if (state.phase === 'reveal' && key === 'Enter' && !(target && target.tagName === 'BUTTON')) {
      event.preventDefault();
      next();
    }
  });

  // A little holo tilt under the pointer.
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    els.art.addEventListener('pointermove', function (event) {
      var rect = els.art.getBoundingClientRect();
      var x = (event.clientX - rect.left) / rect.width - 0.5;
      var y = (event.clientY - rect.top) / rect.height - 0.5;
      els.art.style.setProperty('--tilt-y', (x * 14).toFixed(2) + 'deg');
      els.art.style.setProperty('--tilt-x', (-y * 14).toFixed(2) + 'deg');
      els.art.style.setProperty('--sheen', (50 - x * 100).toFixed(0) + '%');
    });
    els.art.addEventListener('pointerleave', function () {
      els.art.style.removeProperty('--tilt-y');
      els.art.style.removeProperty('--tilt-x');
      els.art.style.removeProperty('--sheen');
    });
  }

  startRound(true);
})();
