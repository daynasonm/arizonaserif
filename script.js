// ─── Image helper ─────────────────────────────────────────
function pageImg(n) {
  return n === 1 ? 'imgs/arizonaserif.png' : `imgs/arizonaserif${n}.png`;
}

// Preload all pages so no lag during flips
for (let i = 1; i <= 28; i++) {
  const img = new Image();
  img.src = pageImg(i);
}

// ─── States ───────────────────────────────────────────────
// state 0      = front cover  (single, right = p1)
// states 1–13  = spreads      (left = even, right = odd)
// state 14     = back cover   (single, right = p28)
const states = [];
states.push({ left: null, right: 1 });
for (let i = 2; i <= 27; i += 2) {
  states.push({ left: i, right: i + 1 });
}
states.push({ left: null, right: 28 });

// ─── DOM ──────────────────────────────────────────────────
const book         = document.getElementById('book');
const leftSlot     = document.getElementById('leftSlot');
const rightSlot    = document.getElementById('rightSlot');
const flipPage     = document.getElementById('flipPage');
const flipFront    = document.getElementById('flipFront');
const flipBack     = document.getElementById('flipBack');
const shade        = document.getElementById('shade');
const shine        = document.getElementById('shine');
const curlRight    = document.getElementById('curlRight');
const curlLeft     = document.getElementById('curlLeft');
const hitLeft      = document.getElementById('hitLeft');
const hitRight     = document.getElementById('hitRight');
const customCursor = document.getElementById('customCursor');

let currentState = 0;
let isAnimating  = false;
const DURATION   = 650; // ms for auto-complete flip
const REVEAL_STATE_PROGRESS = 0;

// ─── Helpers ──────────────────────────────────────────────
function setSlot(slot, pageNum) {
  slot.style.backgroundImage = pageNum ? `url('${pageImg(pageNum)}')` : 'none';
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function pageFlex(progress) {
  return Math.sin(Math.PI * clamp(progress, 0, 1));
}

function setBookSpread(isSpread, instant = false) {
  if (instant) book.style.transition = 'none';
  book.classList.toggle('is-spread', isSpread);
  if (instant) requestAnimationFrame(() => { book.style.transition = ''; });
}

function renderState(stateIndex, instantShape = false) {
  const state = states[stateIndex];
  setBookSpread(Boolean(state.left), instantShape);
  setSlotsForState(stateIndex);
}

function setSlotsForState(stateIndex) {
  const state = states[stateIndex];
  setSlot(leftSlot, state.left);
  setSlot(rightSlot, state.right);
}

function setTurnSlots(dir, from, to, progress) {
  const showTargetSpread = progress >= REVEAL_STATE_PROGRESS;

  if (!from.left && to.left) {
    setSlot(leftSlot, to.left);
    setSlot(rightSlot, to.right);
    return;
  }

  if (dir === 'forward') {
    setSlot(leftSlot, showTargetSpread ? to.left : from.left);
    setSlot(rightSlot, to.right);
  } else {
    setSlot(leftSlot, to.left);
    setSlot(rightSlot, showTargetSpread ? to.right : from.right);
  }
}

// ─── Curl overlay helpers ──────────────────────────────────
function setCurl(dir, progress) {
  // progress 0→1: how far through the peel
  const curlSize = `${6 + progress * 68}%`;
  const curlTall = `${8 + progress * 78}%`;
  const alpha    = Math.min(0.98, progress * 1.2);
  const shadeVal = 0.64 * progress;
  const shineVal = 0.48 * progress;

  shade.style.opacity = shadeVal;
  shine.style.opacity = shineVal;

  if (dir === 'right') {
    // right-side curl (forward flip)
    curlRight.style.setProperty('--curlSize', curlSize);
    curlRight.style.setProperty('--curlTall', curlTall);
    curlRight.style.opacity = alpha;
    curlLeft.style.opacity  = 0;
  } else {
    // left-side curl (backward flip)
    curlLeft.style.setProperty('--curlSize', curlSize);
    curlLeft.style.setProperty('--curlTall', curlTall);
    curlLeft.style.opacity  = alpha;
    curlRight.style.opacity = 0;
  }
}

function setPageFlex(dir, progress, deg) {
  const bend = pageFlex(progress);
  const fold = clamp(bend * 1.15, 0, 1);
  const sign = dir === 'right' ? -1 : 1;
  const topPull = bend * 7;
  const waistPull = bend * 18;
  const bottomPull = bend * 26;
  const lift = bend * 14;

  flipPage.style.setProperty('--bend', bend.toFixed(3));
  flipPage.style.setProperty('--fold', fold.toFixed(3));
  flipPage.style.setProperty('--paperShadowX', `${sign * bend * 18}px`);
  flipPage.style.setProperty('--paperShadowAlpha', (0.12 + bend * 0.32).toFixed(3));
  flipPage.style.setProperty(
    '--bendRadius',
    dir === 'right'
      ? `0 ${bend * 22}px ${bend * 22}px 0`
      : `${bend * 22}px 0 0 ${bend * 22}px`
  );
  flipPage.style.setProperty('--insetLightX', `${sign * bend * 24}px`);
  flipPage.style.setProperty('--insetLightBlur', `${bend * 42}px`);
  flipPage.style.setProperty('--insetShadowX', `${sign * bend * -28}px`);
  flipPage.style.setProperty('--insetShadowBlur', `${bend * 52}px`);
  flipPage.style.setProperty('--ridgeOpacity', (bend * 0.95).toFixed(3));
  flipPage.style.setProperty('--ridgeBlur', `${1 + bend * 2}px`);
  flipPage.style.setProperty('--ridgeDark', `${42 - fold * 12}%`);
  flipPage.style.setProperty('--ridgeLight', `${50 - fold * 7}%`);
  flipPage.style.setProperty('--ridgeWarm', `${56 + fold * 8}%`);
  flipPage.style.transform = `
    translateZ(${lift}px)
    rotateY(${deg}deg)
  `;

  flipPage.style.clipPath = dir === 'right'
    ? `polygon(0 0, ${100 - topPull}% 0, ${100 - waistPull}% 50%, ${100 - bottomPull}% 100%, 0 100%)`
    : `polygon(${topPull}% 0, 100% 0, 100% 100%, ${bottomPull}% 100%, ${waistPull}% 50%)`;
}

function clearPageFlex() {
  flipPage.style.removeProperty('--bend');
  flipPage.style.removeProperty('--fold');
  flipPage.style.removeProperty('--paperShadowX');
  flipPage.style.removeProperty('--paperShadowAlpha');
  flipPage.style.removeProperty('--bendRadius');
  flipPage.style.removeProperty('--insetLightX');
  flipPage.style.removeProperty('--insetLightBlur');
  flipPage.style.removeProperty('--insetShadowX');
  flipPage.style.removeProperty('--insetShadowBlur');
  flipPage.style.removeProperty('--ridgeOpacity');
  flipPage.style.removeProperty('--ridgeBlur');
  flipPage.style.removeProperty('--ridgeDark');
  flipPage.style.removeProperty('--ridgeLight');
  flipPage.style.removeProperty('--ridgeWarm');
  flipPage.style.clipPath = '';
}

function clearCurl() {
  shade.style.opacity      = 0;
  shine.style.opacity      = 0;
  curlRight.style.opacity  = 0;
  curlLeft.style.opacity   = 0;
  curlRight.style.setProperty('--curlSize', '0%');
  curlLeft.style.setProperty('--curlSize',  '0%');
  curlRight.style.setProperty('--curlTall', '0%');
  curlLeft.style.setProperty('--curlTall',  '0%');
}

// ─── Setup flip faces ─────────────────────────────────────
function setupFlip(dir, fromPage, toPage, xPos) {
  flipFront.style.backgroundImage = fromPage ? `url('${pageImg(fromPage)}')` : 'none';
  flipBack.style.backgroundImage  = toPage   ? `url('${pageImg(toPage)}')` : 'none';
  flipPage.className = `flip-page flip-${dir}`;
  flipPage.style.left = xPos + 'px';
  flipPage.style.transformOrigin = dir === 'right' ? 'left top' : 'right top'; /* top stays fixed */
  flipPage.style.transform = 'rotateY(0deg)';
  flipPage.style.transition = 'none';
  flipPage.style.display = 'block';
  clearPageFlex();
  clearCurl();
}

// ─── Animate flip programmatically (click or snap-complete) ─
function animateFlip(startDeg, endDeg, curlDir, onComplete, onProgress) {
  const start = performance.now();

  function tick(now) {
    const raw = Math.min((now - start) / DURATION, 1);
    const t   = easeInOut(raw);
    const deg = startDeg + (endDeg - startDeg) * t;
    const turnProgress = clamp(Math.abs(deg) / 180, 0, 1);

    setPageFlex(curlDir, turnProgress, deg);
    if (onProgress) onProgress(turnProgress);

    const foldProgress = pageFlex(turnProgress);
    if (foldProgress > 0.08) {
      setCurl(curlDir, foldProgress);
    } else {
      clearCurl();
    }

    if (raw < 1) {
      requestAnimationFrame(tick);
    } else {
      flipPage.style.transform = '';
      flipPage.style.display   = 'none';
      clearPageFlex();
      clearCurl();
      onComplete();
    }
  }

  requestAnimationFrame(tick);
}

// ─── Forward flip ──────────────────────────────────────────
function flipForward() {
  if (isAnimating) return;
  isAnimating = true;

  // Last page → loop back to cover
  if (currentState === states.length - 1) {
    book.style.transition = 'none';
    book.classList.remove('is-spread');
    setSlot(leftSlot,  null);
    setSlot(rightSlot, states[0].right);
    currentState = 0;
    isAnimating = false;
    requestAnimationFrame(() => { book.style.transition = ''; });
    return;
  }

  const to   = states[currentState + 1];
  const from = states[currentState];

  // Cover → first spread
  if (currentState === 0) {
    setBookSpread(true);
    setTurnSlots('forward', from, to, 1);
    setupFlip('right', from.right, to.right, 504);

    animateFlip(0, -180, 'right', () => {
      currentState = 1;
      renderState(currentState);
      isAnimating = false;
    }, progress => setTurnSlots('forward', from, to, progress));
    return;
  }

  // Last spread → back cover
  if (currentState === states.length - 2) {
    setTurnSlots('forward', from, to, 1);
    setupFlip('right', from.right, to.right, 504);

    animateFlip(0, -180, 'right', () => {
      currentState = states.length - 1;
      renderState(currentState);
      isAnimating = false;
    }, progress => setTurnSlots('forward', from, to, progress));
    return;
  }

  // Normal spread → spread flip (right page peels to left)
  setTurnSlots('forward', from, to, 1);
  setupFlip('right', from.right, to.right, 504);

  animateFlip(0, -180, 'right', () => {
    currentState++;
    renderState(currentState);
    isAnimating = false;
  }, progress => setTurnSlots('forward', from, to, progress));
}

// ─── Backward flip ─────────────────────────────────────────
function flipBackward() {
  if (isAnimating || currentState <= 0) return;
  isAnimating = true;

  const to   = states[currentState - 1];
  const from = states[currentState];

  // Back cover → last spread
  if (currentState === states.length - 1) {
    setBookSpread(true);
    setTurnSlots('backward', from, to, 1);
    setupFlip('left', from.right, to.left, 0);

    animateFlip(0, 180, 'left', () => {
      currentState = states.length - 2;
      renderState(currentState);
      isAnimating = false;
    }, progress => setTurnSlots('backward', from, to, progress));
    return;
  }

  // First spread → cover
  if (currentState === 1) {
    setTurnSlots('backward', from, to, 1);
    setupFlip('left', from.left, to.right, 0);

    animateFlip(0, 180, 'left', () => {
      currentState = 0;
      renderState(currentState);
      isAnimating = false;
    }, progress => setTurnSlots('backward', from, to, progress));
    return;
  }

  // Normal spread → spread flip (left page peels to right)
  setTurnSlots('backward', from, to, 1);
  setupFlip('left', from.left, to.right, 0);

  animateFlip(0, 180, 'left', () => {
    currentState--;
    renderState(currentState);
    isAnimating = false;
  }, progress => setTurnSlots('backward', from, to, progress));
}

// ─── Drag-to-peel interaction ──────────────────────────────
let dragging   = false;
let dragDir    = null;   // 'forward' or 'backward'
let dragStartX = 0;
let dragFromPage = null;
let dragToPage   = null;
let dragAnimId   = null;
let dragFromState = null;
let dragToState   = null;

book.addEventListener('pointerdown', (e) => {
  if (isAnimating) return;

  const rect  = book.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  const isSpread = book.classList.contains('is-spread');

  // Only allow drag on the outer thirds of the book.
  if (currentState === 0) {
    if (ratio > 0.5) dragDir = 'forward';
    else return;
  } else if (currentState === states.length - 1) {
    if (ratio < 0.5) dragDir = 'backward';
    else return;
  } else if (isSpread) {
    if (ratio > 0.75) dragDir = 'forward';
    else if (ratio < 0.25) dragDir = 'backward';
    else return;
  }

  isAnimating  = true;
  dragging     = true;
  dragStartX   = e.clientX;

  const from = states[currentState];
  const to   = dragDir === 'forward'
    ? states[currentState + 1]
    : states[currentState - 1];
  dragFromState = from;
  dragToState = to;
  setTurnSlots(dragDir, from, to, 1);

  if (dragDir === 'forward' && currentState === 0) {
    dragFromPage = from.right;
    dragToPage   = to.right;
    setBookSpread(true);
    setupFlip('right', dragFromPage, dragToPage, 504);
  } else if (dragDir === 'forward' && currentState === states.length - 2) {
    dragFromPage = from.right;
    dragToPage   = to.right;
    setupFlip('right', dragFromPage, dragToPage, 504);
  } else if (dragDir === 'forward') {
    dragFromPage = from.right;
    dragToPage   = to.right;
    setupFlip('right', dragFromPage, dragToPage, 504);
  } else if (currentState === states.length - 1) {
    dragFromPage = from.right;
    dragToPage   = to.left;
    setBookSpread(true);
    setupFlip('left', dragFromPage, dragToPage, 0);
  } else if (currentState === 1) {
    dragFromPage = from.left;
    dragToPage   = to.right;
    setupFlip('left', dragFromPage, dragToPage, 0);
  } else {
    dragFromPage = from.left;
    dragToPage   = to.right;
    setupFlip('left', dragFromPage, dragToPage, 0);
  }

  book.setPointerCapture(e.pointerId);
});

book.addEventListener('pointermove', (e) => {
  if (!dragging) return;

  const bookW  = book.getBoundingClientRect().width;
  const dx     = e.clientX - dragStartX;
  let progress;

  if (dragDir === 'forward') {
    progress = clamp(-dx / (bookW * 0.45), 0, 1);
  } else {
    progress = clamp( dx / (bookW * 0.45), 0, 1);
  }

  const deg = dragDir === 'forward'
    ? -180 * progress
    :  180 * progress;

  setPageFlex(dragDir === 'forward' ? 'right' : 'left', progress, deg);
  setTurnSlots(dragDir, dragFromState, dragToState, progress);

  const foldProgress = pageFlex(progress);
  if (foldProgress > 0.08) {
    setCurl(dragDir === 'forward' ? 'right' : 'left', foldProgress);
  } else {
    clearCurl();
  }
});

book.addEventListener('pointerup', (e) => {
  if (!dragging) return;
  dragging = false;

  const bookW    = book.getBoundingClientRect().width;
  const dx       = e.clientX - dragStartX;
  let progress;

  if (dragDir === 'forward') {
    progress = clamp(-dx / (bookW * 0.45), 0, 1);
  } else {
    progress = clamp( dx / (bookW * 0.45), 0, 1);
  }

  const shouldTurn = progress > 0.35;
  const currentDeg = dragDir === 'forward' ? -180 * progress : 180 * progress;
  const targetDeg  = shouldTurn
    ? (dragDir === 'forward' ? -180 : 180)
    : 0;

  animateFlip(currentDeg, targetDeg, dragDir === 'forward' ? 'right' : 'left', () => {
    if (shouldTurn) {
      if (dragDir === 'forward') {
        currentState++;
      } else {
        currentState--;
      }
    }
    renderState(currentState);
    isAnimating = false;
    dragDir = null;
    dragFromState = null;
    dragToState = null;
  }, progress => setTurnSlots(dragDir, dragFromState, dragToState, progress));
});

book.addEventListener('pointercancel', () => {
  if (!dragging) return;
  dragging = false;
  animateFlip(0, 0, dragDir === 'forward' ? 'right' : 'left', () => {
    renderState(currentState);
    isAnimating = false;
    dragDir = null;
    dragFromState = null;
    dragToState = null;
  });
});

// ─── Click handlers ────────────────────────────────────────
hitRight.addEventListener('click', (e) => {
  if (!dragging) flipForward();
});

hitLeft.addEventListener('click', (e) => {
  if (!dragging) flipBackward();
});

// ─── Init ─────────────────────────────────────────────────
renderState(currentState, true);

function moveCursor(x, y) {
  customCursor.style.transform = `translate3d(calc(${x}px - 50%), calc(${y}px - 50%), 0)`;
}

// Mouse
document.addEventListener('mousemove', (e) => {
  customCursor.style.opacity = '1';
  moveCursor(e.clientX, e.clientY);
});
document.addEventListener('mouseleave', () => customCursor.style.opacity = '0');

// Touch
document.addEventListener('touchstart', (e) => {
  customCursor.style.opacity = '1';
  moveCursor(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  moveCursor(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

document.addEventListener('touchend', () => {
  customCursor.style.opacity = '0';
}, { passive: true });
