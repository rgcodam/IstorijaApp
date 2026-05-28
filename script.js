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

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const flipBtn = document.getElementById("flipBtn");
const resetBtn = document.getElementById("resetBtn");
const restartBtn = document.getElementById("restartBtn");

const state = {
  index: 0,
  left: 0,
  right: 0,
  dragging: false,
  startX: 0,
  startY: 0,
  pointerId: null,
};

const swipeThreshold = () => Math.min(window.innerWidth * 0.25, 160);

const updateProgress = () => {
  const total = figures.length;
  progressText.textContent = `${Math.min(state.index, total)} / ${total}`;
  leftCount.textContent = `Review: ${state.left}`;
  rightCount.textContent = `Known: ${state.right}`;
  const progress = total === 0 ? 0 : (state.index / total) * 100;
  progressFill.style.width = `${Math.min(progress, 100)}%`;
};

const showCompletion = () => {
  if (cardWrap) {
    cardWrap.style.display = "none";
  }
  completion.hidden = false;
  completionStats.textContent = `Known: ${state.right} | Review: ${state.left}`;
};

const showCard = () => {
  if (cardWrap) {
    cardWrap.style.display = "block";
  }
  completion.hidden = true;
};

const setCardData = () => {
  const total = figures.length;
  if (state.index >= total) {
    showCompletion();
    updateProgress();
    return;
  }

  const figure = figures[state.index];
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
};

const recordSwipe = (direction) => {
  if (direction === "right") {
    state.right += 1;
  } else {
    state.left += 1;
  }
  state.index += 1;
};

const animateSwipe = (direction) => {
  if (state.index >= figures.length) {
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
  if (state.index >= figures.length) {
    return;
  }
  card.classList.toggle("is-flipped");
};

const handlePointerDown = (event) => {
  if (state.index >= figures.length) {
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

const handleReset = () => {
  state.index = 0;
  state.left = 0;
  state.right = 0;
  showCard();
  setCardData();
};

leftBtn.addEventListener("click", () => animateSwipe("left"));
rightBtn.addEventListener("click", () => animateSwipe("right"));
flipBtn.addEventListener("click", handleFlip);
resetBtn.addEventListener("click", handleReset);
restartBtn.addEventListener("click", handleReset);

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
  } else if (event.key.toLowerCase() === "r") {
    handleReset();
  }
});

setCardData();
