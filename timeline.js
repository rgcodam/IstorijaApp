const timelineTrack = document.getElementById("timelineTrack");
const timelineFilter = document.getElementById("timelineSectionFilter");

const timelineItems = (window.DATES_DATA && Array.isArray(window.DATES_DATA.items))
  ? window.DATES_DATA.items.slice()
  : [];

const formatYear = (year) => {
  if (typeof year !== "number") {
    return String(year);
  }
  if (year < 0) {
    return `${Math.abs(year)} m. pr. Kr.`;
  }
  return `${year} m. Kr.`;
};

const normalizeSection = (section) => section || "Nežinomas";

const sortedItems = timelineItems.sort((a, b) => {
  const aYear = Number.isFinite(a.start_year) ? a.start_year : 0;
  const bYear = Number.isFinite(b.start_year) ? b.start_year : 0;
  if (aYear !== bYear) {
    return aYear - bYear;
  }
  return (a.title || "").localeCompare(b.title || "");
});

const sections = Array.from(
  new Set(sortedItems.map((item) => normalizeSection(item.section)))
).sort((a, b) => a.localeCompare(b));

const createTimelineCard = (item) => {
  const card = document.createElement("article");
  card.className = "timeline-item";
  const label = normalizeSection(item.section);
  const start = formatYear(item.start_year);
  const end = item.end_year != null && item.end_year !== item.start_year ? formatYear(item.end_year) : null;
  const rangeText = end ? `${start} — ${end}` : start;

  card.innerHTML = `
    <div class="timeline-item__content">
      <div class="timeline-item__meta">
        <span class="timeline-item__label">${label}</span>
        <time class="timeline-item__date">${rangeText}</time>
      </div>
      <h2 class="timeline-item__title">${item.title || "Be pavadinimo"}</h2>
      <p class="timeline-item__text">${item.description || item.date_label || "Aprašymas nerastas."}</p>
    </div>
  `;
  return card;
};

const renderTimeline = (filter = "all") => {
  if (!timelineTrack) {
    return;
  }
  timelineTrack.innerHTML = "";
  const filtered = sortedItems.filter((item) => {
    if (filter === "all") {
      return true;
    }
    return normalizeSection(item.section) === filter;
  });

  if (filtered.length === 0) {
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "timeline-empty";
    emptyMessage.textContent = "Nėra įrašų pasirinktam filtrui.";
    timelineTrack.appendChild(emptyMessage);
    return;
  }

  filtered.forEach((item) => {
    timelineTrack.appendChild(createTimelineCard(item));
  });
};

if (timelineFilter) {
  sections.forEach((section) => {
    const option = document.createElement("option");
    option.value = section;
    option.textContent = section;
    timelineFilter.appendChild(option);
  });

  timelineFilter.addEventListener("change", (event) => {
    renderTimeline(event.target.value);
  });
}

renderTimeline();
