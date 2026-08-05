(function () {
  function read(key, fallback) {
    const rawValue = localStorage.getItem(key);
    if (rawValue === null) return fallback;
    try {
      return JSON.parse(rawValue);
    } catch {
      return rawValue;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  }

  window.AppStorage = Object.freeze({ read, write });
})();
