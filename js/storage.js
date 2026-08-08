(function () {
  function read(key, fallback) {
    let rawValue;
    try {
      rawValue = localStorage.getItem(key);
    } catch {
      return fallback;
    }
    if (rawValue === null) return fallback;
    if (typeof fallback === "string") return rawValue;
    try {
      return JSON.parse(rawValue);
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  window.AppStorage = Object.freeze({ read, write });
})();
