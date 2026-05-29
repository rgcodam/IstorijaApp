const figures = window.FIGURES || [];
let programDecks = [];

const placeholderImage = "assets/portraits/placeholder.png";

// Load decks from new_INFO data (loaded via new_info.js)
const loadDecksFromJSON = async () => {
  try {
    console.log("Starting to load decks from NEW_INFO_DATA");
    
    const data = window.NEW_INFO_DATA;
    if (!data) {
      throw new Error("NEW_INFO_DATA not found in global scope");
    }
    
    console.log("JSON data loaded:", data);
    
    programDecks = [];
    
    if (data.subcategories_by_subject && Array.isArray(data.subcategories_by_subject)) {
      data.subcategories_by_subject.forEach((section, sectionIndex) => {
        const sectionTitle = section.section || `Section ${sectionIndex + 1}`;
        const group = sectionTitle;
        
        if (section.subcategories && Array.isArray(section.subcategories)) {
          section.subcategories.forEach((subcategory, subIndex) => {
            const subcategoryTitle = subcategory.subcategory || `Subcategory ${subIndex + 1}`;
            const deckId = `deck-${sectionIndex}-${subIndex}`;
            
            const cards = (subcategory.cards || []).map((card) => ({
              front: card.a || "",
              back: card.q || "",
              type: card.type_category ? "term" : "term",
            }));
            
            if (cards.length > 0) {
              programDecks.push({
                id: deckId,
                title: subcategoryTitle,
                description: sectionTitle,
                group: group,
                tier: "small",
                cards: cards,
              });
            }
          });
        }
      });
    }
    
    console.log("Loaded", programDecks.length, "decks");
    
    // Re-initialize the app with loaded decks
    reinitializeDecks();
  } catch (error) {
    console.error("Error loading decks from NEW_INFO_DATA:", error);
  }
};

const reinitializeDecks = () => {
  deckMap.clear();
  const newDecks = [...programDecks, makePeopleDeck()];
  
  // Add practice tests
  const practiceTests = window.PRACTICE_TESTS || [];
  practiceTests.forEach((test) => {
    newDecks.push({
      id: test.id,
      title: test.title,
      description: test.description,
      group: "Practice Tests",
      tier: "special",
      isTest: true,
      questions: test.questions,
    });
  });
  
  newDecks.forEach((deck) => {
    deckMap.set(deck.id, deck);
  });
  decks = newDecks; // Update the global decks array
  initDashboardState();
};

const makePeopleDeck = () => ({
  id: "asmenybes",
  title: "Asmenybės",
  description: "Svarbios Lietuvos istorijos asmenybės.",
  group: "Asmenybės",
  tier: "people",
  cards: figures.map((figure) => ({
    front: figure.description,
    back: figure.name,
    image: figure.image,
    type: "person",
  })),
});

// Global decks and deckMap - will be populated after loading JSON
let decks = [];
let deckMap = new Map();

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
const activeDeckName = document.getElementById("activeDeckName");
const dashboard = document.getElementById("dashboard");
const deckGroups = document.getElementById("deckGroups");
const openDashboardBtn = document.getElementById("openDashboard");
const closeDashboardBtn = document.getElementById("closeDashboard");
const resumeDeckBtn = document.getElementById("resumeDeck");
const deckSection = document.getElementById("deckSection");
const actionsSection = document.getElementById("actionsSection");
const viewToggleSection = document.getElementById("viewToggleSection");
const footer = document.getElementById("footer");

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const flipBtn = document.getElementById("flipBtn");
const undoBtn = document.getElementById("undoBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const reverseBtn = document.getElementById("reverseBtn");
const resetBtn = document.getElementById("resetBtn");
const restartBtn = document.getElementById("restartBtn");

// Test elements
const testSection = document.getElementById("testSection");
const testTitle = document.getElementById("testTitle");
const testProgress = document.getElementById("testProgress");
const testQuestion = document.getElementById("testQuestion");
const testOptions = document.getElementById("testOptions");
const testFeedback = document.getElementById("testFeedback");
const testFeedbackText = document.getElementById("testFeedbackText");
const nextQuestionBtn = document.getElementById("nextQuestionBtn");
const testResults = document.getElementById("testResults");
const testScore = document.getElementById("testScore");
const testRestartBtn = document.getElementById("testRestartBtn");
const backToDashboardBtn = document.getElementById("backToDashboardBtn");

// Test state
let currentTest = null;
let testState = {
  testId: null,
  currentQuestion: 0,
  score: 0,
  answered: false,
};

const STORAGE_KEY = "historySwipeState_v2";

const GROUP_ORDER = [
  "1. Istorikas, istorija ir istorinė kultūra",
  "2. Valstybingumas: suverenitetas, idėjos, formos",
  "3. Kultūra ir mokslas",
  "4. Žmogus ir aplinka",
  "Asmenybės",
];

const buildDeck = (ids, max) => {
  if (!Array.isArray(ids) || !Number.isInteger(max)) {
    return [];
  }
  return ids.filter((id) => Number.isInteger(id) && id >= 0 && id < max);
};

const buildHistory = (items, max) => {
  if (!Array.isArray(items) || !Number.isInteger(max)) {
    return [];
  }
  return items
    .filter(
      (entry) =>
        entry &&
        (entry.direction === "left" || entry.direction === "right") &&
        Number.isInteger(entry.cardId) &&
        entry.cardId >= 0 &&
        entry.cardId < max
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
  deckId: null,
  cards: [],
  deck: [],
  index: 0,
  left: 0,
  right: 0,
  unknown: [],
  history: [],
  randomize: false,
  reverse: false,
  dragging: false,
  startX: 0,
  startY: 0,
  pointerId: null,
});

const state = createInitialState();

const swipeThreshold = () => Math.min(window.innerWidth * 0.25, 160);

const applyViewMode = (mode) => {
  if (!card) {
    return;
  }
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

const getStoredState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { decks: {} };
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.decks) {
      parsed.decks = {};
    }
    return parsed;
  } catch (error) {
    return { decks: {} };
  }
};

const saveState = (override = {}) => {
  if (!state.deckId) {
    return;
  }
  const stored = getStoredState();
  const viewMode = override.viewMode || (card ? card.dataset.view : "both") || "both";
  const theme = override.theme || document.body.dataset.theme || "light";
  const nextRandomize =
    typeof override.randomize === "boolean" ? override.randomize : state.randomize;

  stored.activeDeckId = state.deckId;
  stored.viewMode = viewMode;
  stored.theme = theme;

  stored.decks[state.deckId] = {
    deck: state.deck,
    index: state.index,
    left: state.left,
    right: state.right,
    unknown: state.unknown,
    history: state.history,
    randomize: nextRandomize,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
};

const updateProgress = () => {
  if (!state.deckId) {
    progressText.textContent = "0 / 0";
    leftCount.textContent = "Review: 0";
    rightCount.textContent = "Known: 0";
    progressFill.style.width = "0%";
    return;
  }
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
  if (!state.deckId || state.cards.length === 0) {
    return;
  }
  const total = state.deck.length;
  if (total === 0 || state.index >= total) {
    showCompletion();
    updateProgress();
    updateUndoButton();
    updateRandomizeButton();
    saveState();
    return;
  }

  const cardId = state.deck[state.index];
  const cardData = state.cards[cardId];
  if (!cardData) {
    state.index += 1;
    setCardData();
    return;
  }

  showCard();
  const imageSrc = cardData.image || placeholderImage;
  figureImage.src = imageSrc;
  figureImage.alt = cardData.imageAlt || cardData.back || cardData.front || "History card";
  figureDescription.textContent = cardData.front || "";
  figureName.textContent = cardData.back || "";

  if (card) {
    card.classList.toggle("card--placeholder", !cardData.image);
    card.classList.remove("is-flipped");
    card.classList.remove("show-left", "show-right");
    card.style.transform = "";
    card.style.opacity = "";
    card.style.transition = "";
  }

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
  if (!state.deckId || state.index >= state.deck.length) {
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
  if (!state.deckId || state.index >= state.deck.length) {
    return;
  }
  card.classList.toggle("is-flipped");
};

const handlePointerDown = (event) => {
  if (!state.deckId || state.index >= state.deck.length) {
    return;
  }
  if (dashboard && !dashboard.hidden) {
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
  if (!state.deckId) {
    return;
  }
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
  const nextDeck = buildDeck(deckIds, state.cards.length);
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
  if (!state.deckId) {
    return;
  }
  const fullDeck = state.cards.map((_, index) => index);
  startRound(fullDeck);
};

const handleContinueUnknown = () => {
  if (state.unknown.length === 0) {
    return;
  }
  const nextDeck = [...state.unknown];
  startRound(nextDeck);
};

const applyDeckState = (deckId, storedDeck) => {
  const deck = deckMap.get(deckId);
  if (!deck) {
    return;
  }
  state.deckId = deckId;
  state.cards = deck.cards;
  const max = state.cards.length;

  if (storedDeck) {
    state.deck = buildDeck(storedDeck.deck, max);
    if (state.deck.length === 0) {
      state.deck = state.cards.map((_, index) => index);
    }
    const index = Number.isFinite(storedDeck.index) ? Math.floor(storedDeck.index) : 0;
    state.index = Math.min(Math.max(index, 0), state.deck.length);
    state.left = Number.isFinite(storedDeck.left) ? storedDeck.left : 0;
    state.right = Number.isFinite(storedDeck.right) ? storedDeck.right : 0;
    state.unknown = buildDeck(storedDeck.unknown, max);
    state.history = buildHistory(storedDeck.history, max);
    state.randomize = storedDeck.randomize === true;
  } else {
    state.randomize = false;
    state.deck = state.cards.map((_, index) => index);
    state.index = 0;
    state.left = 0;
    state.right = 0;
    state.unknown = [];
    state.history = [];
  }

  updateRandomizeButton();
  setCardData();
};

const updateActiveDeckLabel = () => {
  if (!activeDeckName) {
    return;
  }
  const deck = state.deckId ? deckMap.get(state.deckId) : null;
  activeDeckName.textContent = deck ? deck.title : "Not selected";
};

const setDashboardVisible = (visible) => {
  if (!dashboard) {
    return;
  }
  dashboard.hidden = !visible;
  if (deckSection) {
    deckSection.hidden = visible;
  }
  if (actionsSection) {
    actionsSection.hidden = visible;
  }
  if (viewToggleSection) {
    viewToggleSection.hidden = visible;
  }
  if (footer) {
    footer.hidden = visible;
  }
  if (closeDashboardBtn) {
    closeDashboardBtn.hidden = !visible || !state.deckId;
  }
};

const getTierLabel = (deck) => {
  if (deck.tier === "big") {
    return "Didysis";
  }
  if (deck.tier === "special") {
    return "Specialus";
  }
  if (deck.tier === "people") {
    return "Asmenybės";
  }
  return "Tema";
};

const renderDashboard = (activeId) => {
  if (!deckGroups) {
    return;
  }
  deckGroups.innerHTML = "";

  const grouped = new Map();
  decks.forEach((deck) => {
    const group = deck.group || "Kita";
    if (!grouped.has(group)) {
      grouped.set(group, []);
    }
    grouped.get(group).push(deck);
  });

  const orderedGroups = Array.from(grouped.keys()).sort((a, b) => {
    const aIndex = GROUP_ORDER.indexOf(a);
    const bIndex = GROUP_ORDER.indexOf(b);
    if (aIndex === -1 && bIndex === -1) {
      return a.localeCompare(b);
    }
    if (aIndex === -1) {
      return 1;
    }
    if (bIndex === -1) {
      return -1;
    }
    return aIndex - bIndex;
  });

  orderedGroups.forEach((group) => {
    const groupEl = document.createElement("div");
    groupEl.className = "deck-group";

    const title = document.createElement("h2");
    title.className = "deck-group__title";
    title.textContent = group;
    groupEl.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "deck-grid";

    const decksInGroup = grouped.get(group) || [];
    decksInGroup
      .slice()
      .sort((a, b) => {
        const tierRank = { big: 0, special: 1, people: 2, small: 3 };
        const aRank = tierRank[a.tier] ?? 4;
        const bRank = tierRank[b.tier] ?? 4;
        if (aRank !== bRank) {
          return aRank - bRank;
        }
        return a.title.localeCompare(b.title);
      })
      .forEach((deck) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "deck-card";
        if (deck.id === activeId) {
          button.classList.add("is-active");
        }
        button.dataset.deckId = deck.id;

        const titleEl = document.createElement("div");
        titleEl.className = "deck-card__title";
        titleEl.textContent = deck.title;

        const descEl = document.createElement("div");
        descEl.className = "deck-card__desc";
        descEl.textContent = deck.description || "Rinkinys";

        const metaEl = document.createElement("div");
        metaEl.className = "deck-card__meta";

        const pill = document.createElement("span");
        pill.className = "deck-card__pill";
        pill.textContent = getTierLabel(deck);

        const count = document.createElement("span");
        count.textContent = `${deck.cards.length} kortų`;

        metaEl.appendChild(pill);
        metaEl.appendChild(count);

        button.appendChild(titleEl);
        button.appendChild(descEl);
        button.appendChild(metaEl);

        button.addEventListener("click", () => {
          selectDeck(deck.id, true);
        });

        grid.appendChild(button);
      });

    groupEl.appendChild(grid);
    deckGroups.appendChild(groupEl);
  });
};

const selectDeck = (deckId, useStored) => {
  const stored = getStoredState();
  const deck = deckMap.get(deckId);
  if (!deck) {
    return;
  }

  const storedDeck = useStored ? stored.decks[deckId] : null;
  applyDeckState(deckId, storedDeck);
  updateActiveDeckLabel();
  setDashboardVisible(false);
};

const initDashboardState = () => {
  const stored = getStoredState();
  const lastDeckId = stored.activeDeckId && deckMap.has(stored.activeDeckId) ? stored.activeDeckId : null;

  if (resumeDeckBtn) {
    if (lastDeckId) {
      const deck = deckMap.get(lastDeckId);
      resumeDeckBtn.hidden = false;
      resumeDeckBtn.dataset.deckId = lastDeckId;
      resumeDeckBtn.textContent = `Tęsti: ${deck ? deck.title : ""}`;
    } else {
      resumeDeckBtn.hidden = true;
    }
  }

  renderDashboard(lastDeckId);
  updateActiveDeckLabel();
  setDashboardVisible(true);
};

// Test Functions
const startTest = (testId) => {
  const tests = window.PRACTICE_TESTS || [];
  const test = tests.find(t => t.id === testId);
  
  if (!test) {
    console.error("Test not found:", testId);
    return;
  }
  
  currentTest = test;
  testState = {
    testId: testId,
    currentQuestion: 0,
    score: 0,
    answered: false,
  };
  
  setDashboardVisible(false);
  if (deckSection) deckSection.hidden = true;
  if (actionsSection) actionsSection.hidden = true;
  if (viewToggleSection) viewToggleSection.hidden = true;
  if (footer) footer.hidden = true;
  
  testSection.hidden = false;
  testResults.hidden = true;
  testFeedback.hidden = true;
  
  testTitle.textContent = test.title;
  displayTestQuestion();
};

const displayTestQuestion = () => {
  if (!currentTest || testState.currentQuestion >= currentTest.questions.length) {
    showTestResults();
    return;
  }
  
  const question = currentTest.questions[testState.currentQuestion];
  testProgress.textContent = `${testState.currentQuestion + 1} / ${currentTest.questions.length}`;
  testQuestion.textContent = question.question;
  
  testOptions.innerHTML = '';
  testFeedback.hidden = true;
  testState.answered = false;
  
  question.options.forEach(option => {
    const btn = document.createElement('button');
    btn.className = 'test-option';
    btn.innerHTML = `
      <div class="test-option-letter">${option.letter}</div>
      <div class="test-option-text">${option.text}</div>
    `;
    btn.addEventListener('click', () => handleTestAnswer(option.letter, question));
    testOptions.appendChild(btn);
  });
};

const handleTestAnswer = (selectedLetter, question) => {
  if (testState.answered) return;
  
  testState.answered = true;
  const isCorrect = selectedLetter === question.correct_answer;
  
  if (isCorrect) {
    testState.score += 1;
  }
  
  // Show all options with correct/incorrect highlighting
  const options = document.querySelectorAll('.test-option');
  options.forEach(btn => {
    btn.disabled = true;
    const letter = btn.querySelector('.test-option-letter').textContent;
    if (letter === question.correct_answer) {
      btn.classList.add('correct');
    } else if (letter === selectedLetter && !isCorrect) {
      btn.classList.add('incorrect');
    }
  });
  
  // Show feedback
  testFeedback.hidden = false;
  testFeedback.className = `test-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
  testFeedbackText.innerHTML = `
    <strong>${isCorrect ? '✓ Correct!' : '✗ Incorrect'}</strong><br>
    ${question.correct_answer_text}
  `;
};

const showTestResults = () => {
  testQuestion.parentElement.hidden = true;
  testOptions.hidden = true;
  nextQuestionBtn.hidden = true;
  
  testResults.hidden = false;
  const percentage = Math.round((testState.score / currentTest.questions.length) * 100);
  testScore.textContent = `You scored ${testState.score} out of ${currentTest.questions.length} (${percentage}%)`;
};

leftBtn.addEventListener("click", () => animateSwipe("left"));
rightBtn.addEventListener("click", () => animateSwipe("right"));
flipBtn.addEventListener("click", handleFlip);
undoBtn.addEventListener("click", handleUndo);
shuffleBtn.addEventListener("click", handleShuffle);
resetBtn.addEventListener("click", handleReset);
restartBtn.addEventListener("click", handleReset);
continueBtn.addEventListener("click", handleContinueUnknown);

// Test event listeners
if (nextQuestionBtn) {
  nextQuestionBtn.addEventListener("click", () => {
    testState.currentQuestion += 1;
    displayTestQuestion();
  });
}

if (testRestartBtn) {
  testRestartBtn.addEventListener("click", () => {
    startTest(testState.testId);
  });
}

if (backToDashboardBtn) {
  backToDashboardBtn.addEventListener("click", () => {
    testSection.hidden = true;
    setDashboardVisible(true);
  });
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    saveState({ theme: nextTheme });
  });
}

if (openDashboardBtn) {
  openDashboardBtn.addEventListener("click", () => {
    renderDashboard(state.deckId);
    setDashboardVisible(true);
  });
}

if (closeDashboardBtn) {
  closeDashboardBtn.addEventListener("click", () => {
    if (!state.deckId) {
      return;
    }
    setDashboardVisible(false);
  });
}

if (resumeDeckBtn) {
  resumeDeckBtn.addEventListener("click", () => {
    const deckId = resumeDeckBtn.dataset.deckId;
    if (!deckId) {
      return;
    }
    selectDeck(deckId, true);
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
  if (!state.deckId || (dashboard && !dashboard.hidden)) {
    return;
  }
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

const storedSettings = getStoredState();
const storedViewMode = storedSettings.viewMode || null;
const storedTheme = storedSettings.theme || null;

applyTheme(storedTheme || getPreferredTheme());
updateRandomizeButton();

if (storedViewMode) {
  const storedRadio = document.querySelector(`input[name=\"viewMode\"][value=\"${storedViewMode}\"]`);
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

updateProgress();

// Load decks from new_INFO.json
loadDecksFromJSON();