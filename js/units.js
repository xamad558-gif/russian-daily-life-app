(function () {
  let dependencies = null;

  function configure(options) {
    dependencies = options;
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function fetchJsonOnce(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
    return response.json();
  }

  async function fetchJson(relativePath) {
    const { dataVersion } = dependencies;
    const separator = relativePath.includes("?") ? "&" : "?";
    const url = `${relativePath}${separator}v=${dataVersion}`;
    // The app's most critical fetch gets a couple of retries so a transient network hiccup
    // (e.g. connection contention during the initial burst of app-shell requests) doesn't
    // permanently fail the load.
    const delaysMs = [300, 800];
    for (const delay of delaysMs) {
      try {
        return await fetchJsonOnce(url);
      } catch {
        await wait(delay);
      }
    }
    return fetchJsonOnce(url);
  }

  async function loadRegistry() {
    const registry = await fetchJson("data/units.json");
    if (!registry || !Array.isArray(registry.units) || !registry.units.length) {
      throw new Error("Unit registry is empty or malformed.");
    }
    return registry;
  }

  function resolveUnit(registry, requestedId) {
    return registry.units.find(unit => unit.id === requestedId) || registry.units[0];
  }

  function assertWordsBelongToUnit(words, unitId, dataPath) {
    const mismatched = words.find(word => word.unitId && word.unitId !== unitId);
    if (mismatched) {
      throw new Error(`Word "${mismatched.id}" in "${dataPath}" has unitId "${mismatched.unitId}", expected "${unitId}".`);
    }
  }

  async function loadUnitWords(unitEntry) {
    const payload = await fetchJson(unitEntry.dataPath);
    if (!payload || !Array.isArray(payload.words) || !payload.words.length) {
      throw new Error(`Unit file at "${unitEntry.dataPath}" has no words.`);
    }
    if (payload.unitId && payload.unitId !== unitEntry.id) {
      throw new Error(`Unit file unitId "${payload.unitId}" does not match registry id "${unitEntry.id}".`);
    }
    assertWordsBelongToUnit(payload.words, unitEntry.id, unitEntry.dataPath);
    return { words: payload.words, rooms: Array.isArray(payload.rooms) ? payload.rooms : [] };
  }

  async function loadActiveUnit(registry, requestedId) {
    const unitEntry = resolveUnit(registry, requestedId);
    const { words, rooms } = await loadUnitWords(unitEntry);
    return { unit: unitEntry, words, rooms };
  }

  window.AppUnits = Object.freeze({ configure, loadRegistry, resolveUnit, loadActiveUnit });
})();
