/* ─────────────────────────────────────────
   TypeSim — app.js
   Simulate typing speed + live measurement
───────────────────────────────────────── */

// ── Text Samples ──────────────────────────────────────────────────────────────
const SAMPLES = {
  default: `The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump! The five boxing wizards jump quickly. Sphinx of black quartz, judge my vow. Blowzy red-haired vixens fight for a quick jump.`,

  poem: `Two roads diverged in a yellow wood,
And sorry I could not travel both
And be one traveler, long I stood
And looked down one as far as I could
To where it bent in the undergrowth.

I shall be telling this with a sigh
Somewhere ages and ages hence:
Two roads diverged in a wood, and I—
I took the one less traveled by,
And that has made all the difference.`,

  essay: `The internet has fundamentally transformed how human beings communicate, collaborate, and consume information. Within a single generation, societies across the globe have shifted from analog systems to digital ecosystems that operate at the speed of light. This transformation carries profound implications for democracy, economics, culture, and the nature of human attention itself. Whether this revolution ultimately strengthens or weakens the bonds of civil society remains one of the defining questions of our era.`,

  story: `It was a dark and stormy night when Maria first noticed the light in the abandoned lighthouse. She had walked this stretch of rocky coastline a thousand times before, but never had those old lamps flickered to life. She pulled her coat tighter against the wind and stood watching, transfixed. The beam swept slowly across the churning water, as if searching for something—or someone—lost long ago in the depths below.`,

  code: `function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

const throttle = (fn, limit) => {
  let inThrottle = false;
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};`,

  email: `Subject: Project Update — Q3 Deliverables

Hi Sarah,

I hope this message finds you well. I wanted to provide a quick update on the Q3 deliverables we discussed during last week's call. The development team has completed the core feature set and we're currently in the testing phase. We expect to have a staging build ready by Thursday.

Could you please confirm whether the demo scheduled for the 15th is still on? I'd like to make sure all stakeholders have access to the review link in advance.

Best regards,
James`,

  letter: `Dear Mr. Thompson,

I am writing to express my sincere gratitude for the opportunity to interview for the Senior Designer position at Meridian Creative last Tuesday. Meeting your team and learning about the company's vision for the next product cycle was genuinely exciting.

After our conversation, I feel even more confident that my background in interaction design and my passion for accessible, thoughtful digital experiences align well with what Meridian is building. I would be thrilled to contribute to such an innovative team.

Please do not hesitate to reach out if you require any additional materials.

Warmly,
Priya`,

  custom: ``
};

// ── Speed Context Data ──────────────────────────────────────────────────────
function getSpeedContext(wpm) {
  if (wpm <= 10)  return { pct: 99, emoji: '🐢', label: 'Ultra slow', desc: `At <strong>${wpm} WPM</strong>, this is like watching paint dry. Nearly 99% of people type faster — even beginners average 30–40 WPM.` };
  if (wpm <= 30)  return { pct: 85, emoji: '🐾', label: 'Beginner',   desc: `At <strong>${wpm} WPM</strong>, this is beginner territory. About 85% of adult typists exceed this speed with a little practice.` };
  if (wpm <= 50)  return { pct: 65, emoji: '🚶', label: 'Below average', desc: `At <strong>${wpm} WPM</strong>, you're below the average adult typist (55–65 WPM). Around 65% of people type faster in everyday use.` };
  if (wpm <= 70)  return { pct: 45, emoji: '🏃', label: 'Average',    desc: `At <strong>${wpm} WPM</strong>, you're squarely in the average zone. About 45% of the population types at this speed or faster.` };
  if (wpm <= 100) return { pct: 25, emoji: '⚡', label: 'Fast',       desc: `At <strong>${wpm} WPM</strong>, you're a fast typist! Only around 25% of people reach this speed without dedicated training.` };
  if (wpm <= 150) return { pct: 10, emoji: '🔥', label: 'Expert',     desc: `At <strong>${wpm} WPM</strong>, you're in the top 10% of typists. This requires deliberate touch-typing with minimal errors.` };
  if (wpm <= 220) return { pct: 3,  emoji: '🚀', label: 'Elite',      desc: `At <strong>${wpm} WPM</strong>, only ~3% of people ever reach this level. Professional typists and competitive racers operate here.` };
  if (wpm <= 350) return { pct: 0.5, emoji: '💎', label: 'World-class', desc: `At <strong>${wpm} WPM</strong>, fewer than 0.5% of humans have ever typed this fast. You're in elite competition territory.` };
  return { pct: 0.01, emoji: '👽', label: 'Superhuman', desc: `At <strong>${wpm} WPM</strong>, this is beyond human capability in sustained real-world typing. World records sit around 300 WPM for sustained bursts. This speed is theoretical.` };
}

// ── Unit Conversions (base: WPM, avg 5 chars/word) ──────────────────────────
const AVG_CHARS = 5;
function toWPM(value, unit) {
  switch(unit) {
    case 'wpm': return value;
    case 'cpm': return value / AVG_CHARS;
    case 'wps': return value * 60;
    case 'cps': return (value * 60) / AVG_CHARS;
    default: return value;
  }
}
function fromWPM(wpm, unit) {
  switch(unit) {
    case 'wpm': return wpm;
    case 'cpm': return wpm * AVG_CHARS;
    case 'wps': return +(wpm / 60).toFixed(2);
    case 'cps': return +((wpm * AVG_CHARS) / 60).toFixed(2);
    default: return wpm;
  }
}
function unitLabel(unit) {
  return unit.toUpperCase();
}

// ── DOM Refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ── State ─────────────────────────────────────────────────────────────────────
let state = {
  unit: 'wpm',
  wpm: 60,
  sample: 'default',
  simRunning: false,
  simTimer: null,
  simCharIndex: 0,
  simText: '',
  // measure
  measureStartTime: null,
  measureChars: 0,
  measureWords: 0,
  measureTimer: null,
  speedHistory: [],
  peakWPM: 0,
};

// ── Tab Switching ─────────────────────────────────────────────────────────────
$$('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    $(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ── Unit Selector ─────────────────────────────────────────────────────────────
$$('.unit-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.unit-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.unit = btn.dataset.unit;
    syncSliderDisplay();
  });
});

// ── Speed Slider ──────────────────────────────────────────────────────────────
const slider = $('speed-slider');
slider.addEventListener('input', () => {
  state.wpm = parseInt(slider.value);
  syncSliderDisplay();
});

function syncSliderDisplay() {
  const displayVal = fromWPM(state.wpm, state.unit);
  $('speed-display').textContent = displayVal;
  $('unit-label').textContent = unitLabel(state.unit);
  $('sim-current-unit').textContent = unitLabel(state.unit);

  // Fill track
  const pct = ((state.wpm - 1) / 999) * 100;
  $('slider-fill').style.width = pct + '%';

  // Update slider max based on unit
  const maxMap = { wpm: 1000, cpm: 5000, wps: 16.67, cps: 83.33 };
  slider.max = maxMap[state.unit] || 1000;
  slider.value = displayVal;

  updateSimStats();
}

// Presets
$$('.preset').forEach(btn => {
  btn.addEventListener('click', () => {
    // preset values are always in WPM
    state.wpm = parseInt(btn.dataset.speed);
    slider.value = state.wpm;
    syncSliderDisplay();
  });
});

// ── Sample Selector ───────────────────────────────────────────────────────────
$$('.sample-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.sample-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.sample = btn.dataset.sample;
    const customInput = $('custom-text-input');
    if (state.sample === 'custom') {
      customInput.style.display = 'block';
    } else {
      customInput.style.display = 'none';
    }
  });
});

// ── Simulation Controls ───────────────────────────────────────────────────────
$('sim-start').addEventListener('click', startSim);
$('sim-stop').addEventListener('click', stopSim);
$('sim-reset').addEventListener('click', resetSim);

function getSimText() {
  if (state.sample === 'custom') {
    return ($('custom-text-input').value || 'Type your custom text in the box above.').trim();
  }
  return SAMPLES[state.sample] || SAMPLES.default;
}

function startSim() {
  if (state.simRunning) return;
  state.simRunning = true;
  state.simCharIndex = 0;
  state.simText = getSimText();

  $('sim-start').disabled = true;
  $('sim-stop').disabled = false;
  $('sim-idle').style.display = 'none';
  $('sim-text-output').textContent = '';

  // chars per interval tick (tick = 50ms)
  const cps = (state.wpm * AVG_CHARS) / 60;
  const charsPerTick = cps * 0.05; // 50ms ticks

  let accumulated = 0;
  state.simTimer = setInterval(() => {
    accumulated += charsPerTick;
    const toAdd = Math.floor(accumulated);
    accumulated -= toAdd;

    for (let i = 0; i < toAdd; i++) {
      if (state.simCharIndex >= state.simText.length) {
        stopSim();
        return;
      }
      const char = state.simText[state.simCharIndex++];
      const out = $('sim-text-output');
      if (char === '\n') {
        out.appendChild(document.createElement('br'));
      } else {
        out.appendChild(document.createTextNode(char));
      }
    }
    updateSimStats();
  }, 50);

  updateSimStats();
  updateContext();
}

function stopSim() {
  state.simRunning = false;
  clearInterval(state.simTimer);
  $('sim-start').disabled = false;
  $('sim-stop').disabled = true;
}

function resetSim() {
  stopSim();
  $('sim-text-output').textContent = '';
  $('sim-idle').style.display = 'flex';
  $('sim-current').textContent = '—';
  $('sim-percentile').textContent = '—';
  $('sim-cps').textContent = '—';
  $('context-bar').style.display = 'none';
}

function updateSimStats() {
  const displayVal = fromWPM(state.wpm, state.unit);
  const cps = +((state.wpm * AVG_CHARS) / 60).toFixed(1);
  const ctx = getSpeedContext(state.wpm);

  setWithPop('sim-current', displayVal);
  setWithPop('sim-percentile', ctx.pct);
  setWithPop('sim-cps', cps);
}

function updateContext() {
  const ctx = getSpeedContext(state.wpm);
  $('context-bar').style.display = 'block';
  $('context-text').innerHTML = `${ctx.emoji} <strong>${ctx.label}</strong> — ${ctx.desc} Only <strong>${ctx.pct}%</strong> of humans can type this fast.`;
}

// ── Measure Tab ───────────────────────────────────────────────────────────────
const measureInput = $('measure-input');
const graphCanvas  = $('speed-graph');
const gctx = graphCanvas.getContext('2d');

let measureData = {
  startTime: null,
  lastCalcTime: null,
  lastCalcChars: 0,
  totalChars: 0,
  currentWPM: 0,
  avgWPM: 0,
  peakWPM: 0,
  history: [], // {t, wpm}
  elapsed: 0,
};

measureInput.addEventListener('input', onMeasureInput);
measureInput.addEventListener('keydown', () => {
  if (!measureData.startTime) {
    measureData.startTime = Date.now();
    measureData.lastCalcTime = Date.now();
    startMeasureTimer();
  }
});

function onMeasureInput(e) {
  if (!measureData.startTime) return;
  const text = measureInput.value;
  measureData.totalChars = text.length;
}

function startMeasureTimer() {
  clearInterval(state.measureTimer);
  state.measureTimer = setInterval(() => {
    if (!measureData.startTime) return;
    const now = Date.now();
    const elapsedSec = (now - measureData.startTime) / 1000;
    measureData.elapsed = elapsedSec;

    const text = measureInput.value;
    const totalChars = text.length;
    const totalWords = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

    // Current WPM (last 3s rolling window)
    const windowSec = 3;
    const windowStart = now - windowSec * 1000;
    // simpler: chars typed in last tick
    const intervalSec = (now - measureData.lastCalcTime) / 1000;
    const newChars = totalChars - measureData.lastCalcChars;
    const instantCPM = intervalSec > 0 ? (newChars / intervalSec) * 60 : 0;
    const instantWPM = instantCPM / AVG_CHARS;

    // Smooth current WPM
    measureData.currentWPM = Math.round(instantWPM);

    // Average WPM
    const avgCPM = elapsedSec > 0 ? (totalChars / elapsedSec) * 60 : 0;
    measureData.avgWPM = Math.round(avgCPM / AVG_CHARS);

    // Peak
    if (measureData.currentWPM > measureData.peakWPM) {
      measureData.peakWPM = measureData.currentWPM;
    }

    // History
    measureData.history.push({ t: elapsedSec, wpm: measureData.currentWPM });
    if (measureData.history.length > 120) measureData.history.shift();

    measureData.lastCalcTime = now;
    measureData.lastCalcChars = totalChars;

    // Update UI
    setWithPop('live-current', measureData.currentWPM);
    setWithPop('live-avg', measureData.avgWPM);
    setWithPop('live-max', measureData.peakWPM);
    setWithPop('live-cpm', Math.round(measureData.avgWPM * AVG_CHARS));
    $('live-chars').textContent = totalChars;
    $('live-time').textContent = Math.floor(elapsedSec);

    drawGraph();
    updateReview(measureData.avgWPM);
  }, 500);
}

function drawGraph() {
  const w = graphCanvas.offsetWidth;
  const h = graphCanvas.offsetHeight;
  graphCanvas.width = w;
  graphCanvas.height = h;

  const data = measureData.history;
  if (data.length < 2) return;

  gctx.clearRect(0, 0, w, h);

  const maxWPM = Math.max(...data.map(d => d.wpm), 1);
  const minWPM = 0;
  const range = maxWPM - minWPM || 1;

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((d.wpm - minWPM) / range) * (h - 12) - 4
  }));

  // Fill area
  const grad = gctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(124,255,196,0.22)');
  grad.addColorStop(1, 'rgba(124,255,196,0)');
  gctx.beginPath();
  gctx.moveTo(points[0].x, h);
  points.forEach(p => gctx.lineTo(p.x, p.y));
  gctx.lineTo(points[points.length-1].x, h);
  gctx.closePath();
  gctx.fillStyle = grad;
  gctx.fill();

  // Line
  gctx.beginPath();
  gctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const cp1x = (points[i-1].x + points[i].x) / 2;
    gctx.bezierCurveTo(cp1x, points[i-1].y, cp1x, points[i].y, points[i].x, points[i].y);
  }
  gctx.strokeStyle = '#7cffc4';
  gctx.lineWidth = 2;
  gctx.stroke();
}

function updateReview(avgWPM) {
  if (avgWPM < 5) { $('measure-review').style.display = 'none'; return; }
  const ctx = getSpeedContext(avgWPM);
  $('measure-review').style.display = 'flex';
  $('review-icon').textContent = ctx.emoji;
  $('review-text').textContent = `${ctx.label} — ${avgWPM} WPM average`;
  $('review-sub').innerHTML = `Only <strong>${ctx.pct}%</strong> of people can type this fast. ${ctx.pct < 5 ? '🎉 That\'s exceptional!' : ctx.pct < 25 ? '💪 Great skill!' : ctx.pct < 60 ? '👍 Keep practicing!' : '📖 Room to grow — try touch typing!'}`;
}

$('measure-reset').addEventListener('click', () => {
  clearInterval(state.measureTimer);
  measureInput.value = '';
  measureData = {
    startTime: null, lastCalcTime: null, lastCalcChars: 0,
    totalChars: 0, currentWPM: 0, avgWPM: 0, peakWPM: 0,
    history: [], elapsed: 0,
  };
  ['live-current','live-avg','live-max','live-cpm','live-chars','live-time'].forEach(id => $$(id) && ($(`${id}`).textContent = '0'));
  $('measure-review').style.display = 'none';
  const w = graphCanvas.offsetWidth, h = graphCanvas.offsetHeight;
  gctx.clearRect(0, 0, w, h);
});

// ── Utility: animated number pop ─────────────────────────────────────────────
function setWithPop(id, val) {
  const el = $(id);
  if (!el) return;
  if (el.textContent !== String(val)) {
    el.textContent = val;
    el.classList.remove('num-pop');
    void el.offsetWidth;
    el.classList.add('num-pop');
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
syncSliderDisplay();

// Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
