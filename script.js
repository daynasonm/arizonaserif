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

// ─── Curl overlay helpers ──────────────────────────────────
function setCurl(dir, progress) {
  // progress 0→1: how far through the peel
  const curlSize = `${6 + progress * 58}%`;
  const alpha    = Math.min(0.98, progress * 1.2);
  const shadeVal = 0.55 * progress;
  const shineVal = 0.35 * progress;

  shade.style.opacity = shadeVal;
  shine.style.opacity = shineVal;

  if (dir === 'right') {
    // right-side curl (forward flip)
    curlRight.style.setProperty('--curlSize', curlSize);
    curlRight.style.opacity = alpha;
    curlLeft.style.opacity  = 0;
  } else {
    // left-side curl (backward flip)
    curlLeft.style.setProperty('--curlSize', curlSize);
    curlLeft.style.opacity  = alpha;
    curlRight.style.opacity = 0;
  }
}

function clearCurl() {
  shade.style.opacity      = 0;
  shine.style.opacity      = 0;
  curlRight.style.opacity  = 0;
  curlLeft.style.opacity   = 0;
  curlRight.style.setProperty('--curlSize', '0%');
  curlLeft.style.setProperty('--curlSize',  '0%');
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
  clearCurl();
}

// ─── Animate flip programmatically (click or snap-complete) ─
function animateFlip(startDeg, endDeg, curlDir, onComplete) {
  const start = performance.now();

  function tick(now) {
    const raw = Math.min((now - start) / DURATION, 1);
    const t   = easeInOut(raw);
    const deg = startDeg + (endDeg - startDeg) * t;

    // Paper bow: slight scaleY compression at midpoint
    flipPage.style.transform = `rotateY(${deg}deg)`;

    // Curl only shows during first half (page hasn't flipped yet)
    const halfProgress = clamp(raw * 2, 0, 1);
    if (raw < 0.5) {
      setCurl(curlDir, halfProgress);
    } else {
      clearCurl();
    }

    if (raw < 1) {
      requestAnimationFrame(tick);
    } else {
      flipPage.style.transform = '';
      flipPage.style.display   = 'none';
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

  // Cover → first spread: instant expand
  if (currentState === 0) {
    book.style.transition = 'none';
    book.classList.add('is-spread');
    setSlot(leftSlot,  to.left);
    setSlot(rightSlot, to.right);
    currentState = 1;
    isAnimating = false;
    requestAnimationFrame(() => { book.style.transition = ''; });
    return;
  }

  // Last spread → back cover: instant collapse
  if (currentState === states.length - 2) {
    book.style.transition = 'none';
    book.classList.remove('is-spread');
    setSlot(leftSlot,  null);
    setSlot(rightSlot, to.right);
    currentState = states.length - 1;
    isAnimating = false;
    requestAnimationFrame(() => { book.style.transition = ''; });
    return;
  }

  // Normal spread → spread flip (right page peels to left)
  setSlot(rightSlot, to.right); // reveal next right page underneath
  setupFlip('right', from.right, to.left, 504);

  animateFlip(0, -180, 'right', () => {
    currentState++;
    setSlot(leftSlot,  states[currentState].left);
    setSlot(rightSlot, states[currentState].right);
    isAnimating = false;
  });
}

// ─── Backward flip ─────────────────────────────────────────
function flipBackward() {
  if (isAnimating || currentState <= 0) return;
  isAnimating = true;

  const to   = states[currentState - 1];
  const from = states[currentState];

  // Back cover → last spread: instant expand
  if (currentState === states.length - 1) {
    book.style.transition = 'none';
    book.classList.add('is-spread');
    setSlot(leftSlot,  to.left);
    setSlot(rightSlot, to.right);
    currentState = states.length - 2;
    isAnimating = false;
    requestAnimationFrame(() => { book.style.transition = ''; });
    return;
  }

  // First spread → cover: instant collapse
  if (currentState === 1) {
    book.style.transition = 'none';
    book.classList.remove('is-spread');
    setSlot(leftSlot,  null);
    setSlot(rightSlot, to.right);
    currentState = 0;
    isAnimating = false;
    requestAnimationFrame(() => { book.style.transition = ''; });
    return;
  }

  // Normal spread → spread flip (left page peels to right)
  setSlot(leftSlot, to.left); // reveal prev left page underneath
  setupFlip('left', from.left, to.right, 0);

  animateFlip(0, 180, 'left', () => {
    currentState--;
    setSlot(leftSlot,  states[currentState].left);
    setSlot(rightSlot, states[currentState].right);
    isAnimating = false;
  });
}

// ─── Drag-to-peel interaction ──────────────────────────────
let dragging   = false;
let dragDir    = null;   // 'forward' or 'backward'
let dragStartX = 0;
let dragFromPage = null;
let dragToPage   = null;
let dragAnimId   = null;

book.addEventListener('pointerdown', (e) => {
  if (isAnimating) return;

  const rect  = book.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  const isSpread = book.classList.contains('is-spread');

  // Only allow drag on the outer thirds of the book
  if (isSpread) {
    if (ratio > 0.75) dragDir = 'forward';
    else if (ratio < 0.25) dragDir = 'backward';
    else return;
  } else {
    // Single page: right side = forward
    if (ratio > 0.5) dragDir = 'forward';
    else return;
  }

  // Cover/back-cover: no drag, just click
  if (currentState === 0 || currentState === states.length - 1) return;
  if (dragDir === 'forward' && currentState >= states.length - 2) return;
  if (dragDir === 'backward' && currentState <= 1) return;

  isAnimating  = true;
  dragging     = true;
  dragStartX   = e.clientX;

  const from = states[currentState];
  const to   = dragDir === 'forward'
    ? states[currentState + 1]
    : states[currentState - 1];

  if (dragDir === 'forward') {
    dragFromPage = from.right;
    dragToPage   = to.left;
    setSlot(rightSlot, to.right);
    setupFlip('right', dragFromPage, dragToPage, 504);
  } else {
    dragFromPage = from.left;
    dragToPage   = to.right;
    setSlot(leftSlot, to.left);
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

  flipPage.style.transform = `rotateY(${deg}deg)`;

  if (progress < 0.5) {
    setCurl(dragDir === 'forward' ? 'right' : 'left', progress * 2);
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
    setSlot(leftSlot,  states[currentState].left);
    setSlot(rightSlot, states[currentState].right);
    isAnimating = false;
    dragDir = null;
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
setSlot(leftSlot,  null);
setSlot(rightSlot, 1);

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