(function () {
  let dependencies = null;

  function configure(options) {
    dependencies = options;
  }

  function normalize(value) {
    return String(value || "").toLowerCase().trim().replace(/[ё]/g, "е").replace(/[أإآ]/g, "ا").replace(/[ة]/g, "ه").replace(/[ى]/g, "ي");
  }

  function populateSubcategories() {
    const { state, els } = dependencies;
    const seen = new Set();
    state.words.forEach(word => seen.add(word.subCategory));
    for (const subCategory of seen) {
      const option = document.createElement("option");
      option.value = subCategory;
      els.subCategoryFilter.appendChild(option);
    }
  }

  function renderCategoryMenu() {
    const { state, els, getTranslation, escapeHTML, selectRoom } = dependencies;
    const translation = getTranslation();
    const counts = {};
    state.words.forEach(word => counts[word.subCategory] = (counts[word.subCategory] || 0) + 1);
    els.categoryMenu.innerHTML = Object.keys(counts).map((subCategory, index) => `
      <button class="category-item ${index === 0 ? "active" : ""}" type="button" data-submenu="${subCategory}">
        <span class="category-item-left"><span>${translation.categoryIcons[subCategory] || "📘"}</span><span>${escapeHTML(translation.categories[subCategory] || subCategory)}</span></span>
        <span class="category-count">${counts[subCategory]}</span>
      </button>`).join("");
    els.categoryMenu.querySelectorAll("[data-submenu]").forEach(button => button.addEventListener("click", () => selectRoom(button.dataset.submenu)));
  }

  function renderRoomStrip() {
    const { state, els, rooms, getTranslation, escapeHTML, selectRoom } = dependencies;
    if (!els.roomStrip) return;
    const translation = getTranslation();
    els.roomStrip.innerHTML = rooms.map(room => {
      const count = state.words.filter(word => word.subCategory === room.id).length;
      return `<button class="room-card room-${room.tone}" type="button" data-room="${room.id}" aria-label="${escapeHTML(`${translation.roomOpen}: ${translation.categories[room.id] || room.id}`)}">
        <span class="room-card-image"><img src="${room.image}" alt="" loading="lazy" /><span class="room-card-icon" aria-hidden="true">${room.icon}</span></span>
        <span class="room-card-copy"><strong>${escapeHTML(translation.categories[room.id] || room.id)}</strong><small>${count} ${escapeHTML(translation.roomWords)}</small></span>
        <span class="room-card-arrow" aria-hidden="true">↗</span>
      </button>`;
    }).join("");
    els.roomStrip.querySelectorAll("[data-room]").forEach(button => button.addEventListener("click", () => selectRoom(button.dataset.room)));
  }

  function selectRoom(room) {
    const { state, els, storage, switchView, apply } = dependencies;
    state.lastRoom = room;
    storage.write("lastRoom", room);
    els.subCategoryFilter.value = room;
    els.categoryMenu.querySelectorAll(".category-item").forEach(item => item.classList.toggle("active", item.dataset.submenu === room));
    switchView("vocabulary");
    apply();
    els.filtersBar?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function apply() {
    const { state, els, getTranslation, renderCards, renderDetail, updateMetrics } = dependencies;
    const query = normalize(els.searchInput.value);
    const subCategory = els.subCategoryFilter.value;
    const level = els.levelFilter.value;
    const sort = els.sortFilter.value;
    state.filtered = state.words.filter(word => {
      const haystack = normalize([word.russian, word.transliteration, word.arabic, word.english, word.exampleRu, word.exampleAr, word.exampleEn].join(" "));
      return (!query || haystack.includes(query)) && (subCategory === "all" || word.subCategory === subCategory) && (level === "all" || word.level === level);
    });
    if (sort === "az") state.filtered.sort((first, second) => first.russian.localeCompare(second.russian, "ru"));
    if (sort === "za") state.filtered.sort((first, second) => second.russian.localeCompare(first.russian, "ru"));
    if (sort === "default") state.filtered.sort((first, second) => (second.frequency || 0) - (first.frequency || 0));
    if (sort === "mastery") state.filtered.sort((first, second) => (state.mastery[first.id] || 0) - (state.mastery[second.id] || 0));
    if (!state.filtered.find(word => word.id === state.selectedWordId)) state.selectedWordId = state.filtered[0]?.id || null;
    const translation = getTranslation();
    els.pageCounter.textContent = `${state.filtered.length} ${translation.pageCounterWord}`;
    els.emptyState.classList.toggle("hidden", state.filtered.length > 0);
    renderCards();
    renderDetail();
    updateMetrics();
  }

  function reset() {
    const { els, apply } = dependencies;
    els.searchInput.value = "";
    els.subCategoryFilter.value = "all";
    els.levelFilter.value = "all";
    els.sortFilter.value = "default";
    apply();
  }

  window.AppFilters = Object.freeze({ configure, populateSubcategories, renderCategoryMenu, renderRoomStrip, selectRoom, apply, reset });
})();
