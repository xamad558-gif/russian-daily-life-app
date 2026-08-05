import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      const pathname = decodeURIComponent(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname);
      const filePath = path.resolve(repositoryRoot, `.${pathname}`);
      const safeRoot = `${repositoryRoot}${path.sep}`;
      if (!filePath.startsWith(safeRoot)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }
      const body = await readFile(filePath);
      response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function visibleCount(page, selector) {
  return page.locator(`${selector}:visible`).count();
}

async function runSmokeTest() {
  let playwright;
  try {
    playwright = await import("playwright");
  } catch {
    throw new Error("Playwright is not installed. Run `npm install` and `npx playwright install chromium` first.");
  }

  const { server, url } = await startServer();
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: !process.argv.includes("--headed") });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${url}/index.html`, { waitUntil: "domcontentloaded" });
    await page.locator("#cardsGrid .word-card").first().waitFor({ state: "visible" });
    const serviceWorkerReady = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false;
      const registration = await navigator.serviceWorker.ready;
      return Boolean(registration.active);
    });
    assert.equal(serviceWorkerReady, true, "A service worker should become active on the app shell");

    assert.equal(await visibleCount(page, "[data-learning-lang]"), 2, "Only two learning-language choices should be visible");
    assert.equal(await page.locator(".word-card").first().locator(".audio-btn").count(), 2, "Cards should show audio for the two visible languages");

    await page.locator('[data-ui-lang="en"]').click();
    assert.equal(await page.locator("html").getAttribute("dir"), "ltr", "English interface should use LTR");
    assert.equal(await page.locator(".word-card").first().locator(".card-translation-pronunciation").count(), 0, "English interface should not add Arabic pronunciation to English translations");
    await page.locator('[data-learning-lang="ar"]').click();
    assert.equal(await page.locator("body").getAttribute("data-learning-language"), "ar", "Arabic learning mode should be active");
    assert.match(await page.locator(".card-word").first().textContent(), /[\u0600-\u06ff]/, "Arabic should be the primary card language");
    assert.equal(await page.locator(".word-card").first().locator(".card-translation").count(), 1, "Cards should show one bridge translation");

    await page.locator('[data-ui-lang="ru"]').click();
    assert.equal(await page.locator("html").getAttribute("dir"), "ltr", "Russian interface should use LTR");
    assert.equal(await page.locator("#interfaceLanguageLabel").textContent(), "Язык интерфейса", "Russian interface label should be Russian");
    assert.doesNotMatch(await page.locator("#interfaceLanguageLabel").textContent(), /[\u0600-\u06ff]/, "Russian interface label should not contain Arabic characters");
    assert.match(await page.locator(".card-translit").first().textContent(), /[\u0400-\u04ff]/, "Russian interface should show Cyrillic pronunciation for Arabic");

    await page.locator('[data-ui-lang="ar"]').click();
    assert.equal(await page.locator("body").getAttribute("data-learning-language"), "ru", "Changing the interface to the learning language should select another learning language");
    await page.locator('[data-learning-lang="en"]').click();
    assert.match(await page.locator(".card-word").first().textContent(), /[A-Za-z]/, "English should be the primary card language");
    assert.match(await page.locator(".card-translit").first().textContent(), /[\u0600-\u06ff]/, "Arabic interface should show Arabic pronunciation for English");

    await page.locator(".word-card").first().click();
    await page.locator("#detailPane .detail-word").waitFor({ state: "visible" });
    assert.ok(await page.locator("#detailPane .detail-word").textContent(), "Opening a card should render its details");

    await page.locator('[data-view-btn="quiz"]').click();
    await page.locator("#quizBox .quiz-option").first().waitFor({ state: "visible" });
    assert.equal(await page.locator("#quizBox .quiz-option").count(), 4, "Quiz should render four answer choices");
    await page.locator("#quizBox .quiz-option").first().click();
    assert.equal(await page.locator("#quizBox .quiz-option:disabled").count(), 4, "Answering should lock all quiz choices");
    await page.locator("#nextQuizBtn").click();
    assert.equal(await page.locator("#quizBox .quiz-option:disabled").count(), 0, "A new quiz question should unlock its choices");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#cardsGrid .word-card").first().waitFor({ state: "visible" });
    assert.ok(await page.locator("#cardsGrid .word-card").count(), "The cached app shell should render while offline");
    await context.setOffline(false);

    console.log("UI smoke test passed: language bridges, direction, cards, details, quiz, and offline shell.");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

runSmokeTest().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
