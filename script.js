const figures = window.FIGURES || [];

const card = document.getElementById("card");
const cardWrap = document.getElementById("cardWrap");
const figureImage = document.getElementById("figureImage");
const figureDescription = document.getElementById("figureDescription");
const figureName = document.getElementById("figureName");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const leftCount = document.getElementById("leftCount");
const rightCount = document.getElementById("rightCount");
const completion = document.getElementById("completion");
const completionStats = document.getElementById("completionStats");
const completionHint = document.getElementById("completionHint");
const continueBtn = document.getElementById("continueBtn");
const viewRadios = document.querySelectorAll("input[name=\"viewMode\"]");
const themeToggle = document.getElementById("themeToggle");

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const flipBtn = document.getElementById("flipBtn");
const undoBtn = document.getElementById("undoBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const resetBtn = document.getElementById("resetBtn");
const restartBtn = document.getElementById("restartBtn");

const STORAGE_KEY = "historySwipeState";

const buildDeck = (ids) => {
  if (!Array.isArray(ids)) {
    return [];
  }
  return ids.filter((id) => Number.isInteger(id) && id >= 0 && id < figures.length);
};

const buildHistory = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .filter(
      (entry) =>
        entry &&
        (entry.direction === "left" || entry.direction === "right") &&
        Number.isInteger(entry.cardId) &&
        entry.cardId >= 0 &&
        entry.cardId < figures.length
    )
    .map((entry) => ({ cardId: entry.cardId, direction: entry.direction }));
};

const shuffleArray = (items) => {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

const createInitialState = () => ({
  deck: figures.map((_, index) => index),
  index: 0,
  left: 0,
  right: 0,
  unknown: [],
  history: [],
  randomize: false,
  dragging: false,
  startX: 0,
  startY: 0,
  pointerId: null,
});

const state = createInitialState();

const swipeThreshold = () => Math.min(window.innerWidth * 0.25, 160);

const applyViewMode = (mode) => {
  card.dataset.view = mode;
};

const getPreferredTheme = () => {
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
};

const applyTheme = (theme) => {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = nextTheme;
  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", nextTheme === "dark");
    themeToggle.textContent = nextTheme === "dark" ? "Light mode" : "Dark mode";
  }
};

const saveState = (override = {}) => {
  const nextRandomize = typeof override.randomize === "boolean" ? override.randomize : state.randomize;
  const payload = {
    deck: state.deck,
    index: state.index,
    left: state.left,
    right: state.right,
    unknown: state.unknown,
    history: state.history,
    viewMode: override.viewMode || card.dataset.view || "both",
    theme: override.theme || document.body.dataset.theme || "light",
    randomize: nextRandomize,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

const loadState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const stored = JSON.parse(raw);
    const deck = buildDeck(stored.deck);
    if (deck.length > 0) {
      state.deck = deck;
    }
    const index = Number.isFinite(stored.index) ? Math.floor(stored.index) : 0;
    state.index = Math.min(Math.max(index, 0), state.deck.length);
    state.left = Number.isFinite(stored.left) ? stored.left : 0;
    state.right = Number.isFinite(stored.right) ? stored.right : 0;
    state.unknown = buildDeck(stored.unknown);
    state.history = buildHistory(stored.history);
    state.randomize = stored.randomize === true;
    return {
      viewMode: stored.viewMode || null,
      theme: stored.theme || null,
      randomize: stored.randomize === true,
    };
  } catch (error) {
    return null;
  }
};

const updateProgress = () => {
  const total = state.deck.length;
  progressText.textContent = `${Math.min(state.index, total)} / ${total}`;
  leftCount.textContent = `Review: ${state.left}`;
  rightCount.textContent = `Known: ${state.right}`;
  const progress = total === 0 ? 0 : (state.index / total) * 100;
  progressFill.style.width = `${Math.min(progress, 100)}%`;
};

const updateUndoButton = () => {
  if (!undoBtn) {
    return;
  }
  undoBtn.disabled = state.history.length === 0;
};

const updateRandomizeButton = () => {
  if (!shuffleBtn) {
    return;
  }
  shuffleBtn.classList.toggle("is-active", state.randomize);
  shuffleBtn.setAttribute("aria-pressed", String(state.randomize));
  shuffleBtn.textContent = state.randomize ? "Randomizer: On" : "Randomizer: Off";
};

const updateCompletion = () => {
  const remaining = state.unknown.length;
  completionStats.textContent = `Known: ${state.right} | Review: ${state.left}`;
  if (remaining > 0) {
    completionHint.textContent = `${remaining} card${remaining === 1 ? "" : "s"} left to review.`;
    continueBtn.disabled = false;
    continueBtn.textContent = `Continue Unknown (${remaining})`;
  } else {
    completionHint.textContent = "No cards left to review.";
    continueBtn.disabled = true;
    continueBtn.textContent = "Continue Unknown";
  }
};

const showCompletion = () => {
  if (cardWrap) {
    cardWrap.style.display = "none";
  }
  completion.hidden = false;
  updateCompletion();
};

const showCard = () => {
  if (cardWrap) {
    cardWrap.style.display = "block";
  }
  completion.hidden = true;
};

const setCardData = () => {
  const total = state.deck.length;
  if (total === 0 || state.index >= total) {
    showCompletion();
    updateProgress();
    updateUndoButton();
    updateRandomizeButton();
    saveState();
    return;
  }

  const figureId = state.deck[state.index];
  const figure = figures[figureId];
  if (!figure) {
    state.index += 1;
    setCardData();
    return;
  }

  showCard();
  figureImage.src = figure.image;
  figureImage.alt = figure.name;
  figureDescription.textContent = figure.description;
  figureName.textContent = figure.name;

  card.classList.remove("is-flipped");
  card.classList.remove("show-left", "show-right");
  card.style.transform = "";
  card.style.opacity = "";
  card.style.transition = "";

  updateProgress();
  updateUndoButton();
  updateRandomizeButton();
  saveState();
};

const recordSwipe = (direction) => {
  state.history.push({ cardId: state.deck[state.index], direction });
  if (direction === "right") {
    state.right += 1;
  } else {
    state.left += 1;
    state.unknown.push(state.deck[state.index]);
  }
  state.index += 1;
};

const animateSwipe = (direction) => {
  if (state.index >= state.deck.length) {
    return;
  }
  const travel = direction === "right" ? window.innerWidth * 1.2 : -window.innerWidth * 1.2;
  const rotation = direction === "right" ? 18 : -18;

  card.classList.remove("is-flipped");
  card.style.transition = "transform 0.35s ease, opacity 0.35s ease";
  card.style.transform = `translateX(${travel}px) rotate(${rotation}deg)`;
  card.style.opacity = "0";

  window.setTimeout(() => {
    recordSwipe(direction);
    setCardData();
  }, 360);
};

const resetPosition = () => {
  card.style.transition = "transform 0.3s ease, opacity 0.3s ease";
  card.style.transform = "";
  card.style.opacity = "";
  card.classList.remove("show-left", "show-right");
};

const handleFlip = () => {
  if (state.index >= state.deck.length) {
    return;
  }
  card.classList.toggle("is-flipped");
};

const handlePointerDown = (event) => {
  if (state.index >= state.deck.length) {
    return;
  }
  state.dragging = true;
  state.startX = event.clientX;
  state.startY = event.clientY;
  state.pointerId = event.pointerId;
  card.setPointerCapture(event.pointerId);
  card.style.transition = "none";
};

const handlePointerMove = (event) => {
  if (!state.dragging) {
    return;
  }
  const dx = event.clientX - state.startX;
  const dy = event.clientY - state.startY;
  const rotate = dx / 18;
  const opacity = Math.max(0.6, 1 - Math.abs(dx) / (window.innerWidth * 0.9));
  card.style.transform = `translateX(${dx}px) rotate(${rotate}deg)`;
  card.style.opacity = opacity.toString();

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      card.classList.add("show-right");
      card.classList.remove("show-left");
    } else {
      card.classList.add("show-left");
      card.classList.remove("show-right");
    }
  }
};

const handlePointerUp = (event) => {
  if (!state.dragging) {
    return;
  }
  state.dragging = false;
  card.releasePointerCapture(state.pointerId);
  state.pointerId = null;

  const dx = event.clientX - state.startX;
  const dy = event.clientY - state.startY;
  const moved = Math.abs(dx) > 8 || Math.abs(dy) > 8;

  if (!moved) {
    handleFlip();
    resetPosition();
    return;
  }

  if (Math.abs(dx) > swipeThreshold()) {
    animateSwipe(dx > 0 ? "right" : "left");
  } else {
    resetPosition();
  }
};

const handlePointerCancel = () => {
  if (state.pointerId !== null) {
    try {
      card.releasePointerCapture(state.pointerId);
    } catch (error) {
      // Ignore if pointer capture is already released.
    }
  }
  state.dragging = false;
  state.pointerId = null;
  resetPosition();
};

const handleUndo = () => {
  if (state.history.length === 0) {
    return;
  }
  const last = state.history.pop();
  state.index = Math.max(state.index - 1, 0);
  if (last.direction === "right") {
    state.right = Math.max(state.right - 1, 0);
  } else {
    state.left = Math.max(state.left - 1, 0);
    const removeIndex = state.unknown.lastIndexOf(last.cardId);
    if (removeIndex >= 0) {
      state.unknown.splice(removeIndex, 1);
    }
  }
  setCardData();
};

const handleShuffle = () => {
  state.randomize = !state.randomize;
  if (state.randomize && state.index < state.deck.length) {
    const prefix = state.deck.slice(0, state.index + 1);
    const remaining = state.deck.slice(state.index + 1);
    shuffleArray(remaining);
    state.deck = [...prefix, ...remaining];
  }
  updateRandomizeButton();
  saveState({ randomize: state.randomize });
  setCardData();
};

const startRound = (deckIds) => {
  const nextDeck = buildDeck(deckIds);
  if (state.randomize) {
    shuffleArray(nextDeck);
  }
  state.deck = nextDeck;
  state.index = 0;
  state.left = 0;
  state.right = 0;
  state.unknown = [];
  state.history = [];
  setCardData();
};

const handleReset = () => {
  const fullDeck = figures.map((_, index) => index);
  startRound(fullDeck);
};

const handleContinueUnknown = () => {
  if (state.unknown.length === 0) {
    return;
  }
  const nextDeck = [...state.unknown];
  startRound(nextDeck);
};

leftBtn.addEventListener("click", () => animateSwipe("left"));
rightBtn.addEventListener("click", () => animateSwipe("right"));
flipBtn.addEventListener("click", handleFlip);
undoBtn.addEventListener("click", handleUndo);
shuffleBtn.addEventListener("click", handleShuffle);
resetBtn.addEventListener("click", handleReset);
restartBtn.addEventListener("click", handleReset);
continueBtn.addEventListener("click", handleContinueUnknown);
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    saveState({ theme: nextTheme });
  });
}

viewRadios.forEach((radio) => {
  radio.addEventListener("change", (event) => {
    applyViewMode(event.target.value);
    saveState({ viewMode: event.target.value });
  });
});

card.addEventListener("pointerdown", handlePointerDown);
card.addEventListener("pointermove", handlePointerMove);
card.addEventListener("pointerup", handlePointerUp);
card.addEventListener("pointercancel", handlePointerCancel);

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    animateSwipe("left");
  } else if (event.key === "ArrowRight") {
    animateSwipe("right");
  } else if (event.key === " " || event.key === "ArrowUp") {
    event.preventDefault();
    handleFlip();
  } else if (event.key.toLowerCase() === "u") {
    handleUndo();
  } else if (event.key.toLowerCase() === "s") {
    handleShuffle();
  } else if (event.key.toLowerCase() === "r") {
    handleReset();
  }
});

const storedSettings = loadState();
const storedViewMode = storedSettings ? storedSettings.viewMode : null;
const storedTheme = storedSettings ? storedSettings.theme : null;

applyTheme(storedTheme || getPreferredTheme());
updateRandomizeButton();

if (storedViewMode) {
  const storedRadio = document.querySelector(`input[name="viewMode"][value="${storedViewMode}"]`);
  if (storedRadio) {
    storedRadio.checked = true;
  }
  applyViewMode(storedViewMode);
} else {
  const initialView = document.querySelector("input[name=\"viewMode\"]:checked");
  if (initialView) {
    applyViewMode(initialView.value);
  }
}

setCardData();