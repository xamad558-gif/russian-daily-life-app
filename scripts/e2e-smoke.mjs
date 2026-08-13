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
      if (!response.headersSent) {
        response.writeHead(404);
        response.end("Not found");
      }
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
    const totalWords = await page.locator("#cardsGrid .word-card").count();
    assert.ok(totalWords > 0, "The loaded unit should contain at least one word");
    const serviceWorkerReady = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false;
      const registration = await navigator.serviceWorker.ready;
      return Boolean(registration.active);
    });
    assert.equal(serviceWorkerReady, true, "A service worker should become active on the app shell");

    assert.equal(await visibleCount(page, "[data-learning-lang]"), 2, "Only two learning-language choices should be visible");
    assert.equal(await page.locator(".word-card").first().locator(".audio-btn").count(), 2, "Cards should show audio for the two visible languages");

    await page.locator("#searchInput").fill("холодильник");
    assert.equal(await page.locator("#cardsGrid .word-card").count(), 1, "Search should filter vocabulary results");
    await page.locator("#resetFiltersBtn").click();
    assert.equal(await page.locator("#cardsGrid .word-card").count(), totalWords, "Reset should restore all vocabulary results");
    await page.locator("#subCategoryFilter").selectOption("kitchen");
    const kitchenCount = await page.locator("#cardsGrid .word-card").count();
    assert.ok(kitchenCount > 0 && kitchenCount < totalWords, "Room filter should narrow vocabulary results");
    await page.locator("#resetFiltersBtn").click();

    await page.locator("#cardsGrid .word-card").first().locator("[data-fav]").click();
    await page.locator('[data-view-btn="review"]').click();
    await page.locator("#reviewGrid .word-card").first().waitFor({ state: "visible" });
    assert.equal(await page.locator("#reviewGrid .word-card").count(), 1, "Favorited cards should appear in review");
    await page.locator('[data-view-btn="vocabulary"]').click();
    await page.locator("#cardsGrid .word-card").first().locator("[data-fav]").click();

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
    await page.locator("#cardsGrid [data-image-detail]").first().click();
    await page.locator("#fullWordDetail .full-detail-word").waitFor({ state: "visible" });
    assert.equal(await page.locator("#fullWordDetail .example-card").count(), 3, "Full detail should render three examples");
    assert.equal(await page.locator("#fullWordDetail .example-pronunciation").count(), 3, "Arabic sentence pronunciation should appear for every example");
    assert.match(await page.locator("#fullWordDetail .example-pronunciation").first().textContent(), /[\u0400-\u04ff]/, "Arabic sentence pronunciation should use Cyrillic for Russian learners");
    await page.locator("#backToWordsBtn").click();
    await page.locator("#cardsGrid .word-card").first().waitFor({ state: "visible" });
    for (const viewport of [{ width: 320, height: 700 }, { width: 768, height: 1024 }]) {
      await page.setViewportSize(viewport);
      const responsiveLayout = await page.evaluate(() => ({ viewportWidth: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth }));
      assert.ok(responsiveLayout.documentWidth <= responsiveLayout.viewportWidth + 1, `Vocabulary should not overflow at ${viewport.width}px`);
      await page.locator("#cardsGrid [data-image-detail]").first().click();
      await page.locator("#fullWordDetail .full-detail-word").waitFor({ state: "visible" });
      const responsiveDetail = await page.evaluate(() => ({ viewportWidth: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth }));
      assert.ok(responsiveDetail.documentWidth <= responsiveDetail.viewportWidth + 1, `Word details should not overflow at ${viewport.width}px`);
      await page.locator("#backToWordsBtn").click();
      await page.locator("#cardsGrid .word-card").first().waitFor({ state: "visible" });
    }

    await page.locator('[data-ui-lang="ar"]').click();
    assert.equal(await page.locator("body").getAttribute("data-learning-language"), "ru", "Changing the interface to the learning language should select another learning language");
    await page.locator('[data-learning-lang="en"]').click();
    assert.match(await page.locator(".card-word").first().textContent(), /[A-Za-z]/, "English should be the primary card language");
    assert.match(await page.locator(".card-translit").first().textContent(), /[\u0600-\u06ff]/, "Arabic interface should show Arabic pronunciation for English");

    await page.locator("#cardsGrid [data-image-detail]").first().click();
    await page.locator("#fullWordDetail .full-detail-word").waitFor({ state: "visible" });
    assert.ok(await page.locator("#fullWordDetail .full-detail-word").textContent(), "Clicking a word image should open the full detail page");
    await page.locator("#backToWordsBtn").click();
    await page.locator("#cardsGrid .word-card").first().waitFor({ state: "visible" });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#cardsGrid [data-image-detail]").first().click();
    await page.locator("#fullWordDetail .full-detail-word").waitFor({ state: "visible" });
    const mobileLayout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth
    }));
    assert.ok(mobileLayout.documentWidth <= mobileLayout.viewportWidth + 1, "Full word detail should fit the mobile viewport without horizontal overflow");
    await page.locator("#backToWordsBtn").click();
    await page.locator("#cardsGrid .word-card").first().waitFor({ state: "visible" });
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.locator(".word-card").first().click();
    await page.locator("#fullWordDetail .full-detail-word").waitFor({ state: "visible" });
    assert.ok(await page.locator("#fullWordDetail .full-detail-word").textContent(), "Clicking a word card should open its full details");
    assert.equal(await page.locator("#detailPane").count(), 0, "The inline detail panel should not be present on the vocabulary page");
    assert.ok(await page.locator("#fullWordDetail .tri-table").count(), "Full detail should render grammar table");
    assert.ok(await page.locator("#fullWordDetail .example-card").count(), "Full detail should render examples");
    await page.locator("#backToWordsBtn").click();
    await page.locator("#cardsGrid .word-card").first().waitFor({ state: "visible" });

    await page.goto(`${url}/index.html`, { waitUntil: "domcontentloaded" });
    await page.locator("#cardsGrid .word-card").first().waitFor({ state: "visible" });
    const routedCard = page.locator("#cardsGrid .word-card").nth(8);
    const routedWordId = await routedCard.getAttribute("data-card");
    await routedCard.scrollIntoViewIfNeeded();
    const sourceScrollY = await page.evaluate(() => window.scrollY);
    await routedCard.click();
    await page.waitForFunction(() => document.body.dataset.view === "wordDetail" && Boolean(document.querySelector("#fullWordDetail .full-detail-word")?.textContent));
    assert.ok(await page.evaluate(() => { const rect = document.querySelector("#fullWordDetail .full-detail-word")?.getBoundingClientRect(); return Boolean(rect && rect.width > 0 && rect.height > 0); }), "Routed word detail should have visible dimensions");
    assert.equal(await page.evaluate(() => location.hash), `#word/${routedWordId}`, "Opening a word should create a shareable hash URL");
    assert.equal(await page.locator("body").getAttribute("data-view"), "wordDetail", "Hash navigation should activate the word detail view");
    assert.ok((await page.evaluate(() => window.scrollY)) <= 1, "Opening a word should start at the top");
    await page.goBack();
    await page.waitForFunction(() => location.hash === "" && document.body.dataset.view === "vocabulary");
    await page.waitForFunction(expected => Math.abs(window.scrollY - expected) <= 2, sourceScrollY);
    assert.ok(Math.abs((await page.evaluate(() => window.scrollY)) - sourceScrollY) <= 2, "Back navigation should restore the vocabulary scroll position");

    await page.goto(`${url}/index.html#word/${routedWordId}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.dataset.view === "wordDetail" && Boolean(document.querySelector("#fullWordDetail .full-detail-word")?.textContent));
    assert.equal(await page.locator("body").getAttribute("data-view"), "wordDetail", "A direct word URL should open the detail view");
    assert.ok((await page.evaluate(() => window.scrollY)) <= 1, "A direct word URL should start at the top");
    await page.goto(`${url}/index.html`, { waitUntil: "domcontentloaded" });
    await page.locator("#cardsGrid .word-card").first().waitFor({ state: "visible" });

    await page.locator('[data-view-btn="quiz"]').click();
    await page.locator("#quizBox .quiz-option").first().waitFor({ state: "visible" });
    assert.equal(await page.locator("#quizBox .quiz-option").count(), 4, "Quiz should render four answer choices");
    await page.locator("#quizBox .quiz-option").first().click();
    assert.equal(await page.locator("#quizBox .quiz-option:disabled").count(), 4, "Answering should lock all quiz choices");
    const learningState = await page.evaluate(() => window.AppStorage.loadProgress().learningState);
    assert.equal(Object.keys(learningState).length, totalWords, "Learning state should be initialized for every word");
    assert.ok(Object.values(learningState).some(item => item.lastReviewedAt), "Answering should schedule the reviewed word");
    await page.locator("#nextQuizBtn").click();
    assert.equal(await page.locator("#quizBox .quiz-option:disabled").count(), 0, "A new quiz question should unlock its choices");

    await page.locator('[data-view-btn="progress"]').click();
    await page.locator("#masteryList .mastery-item").first().waitFor({ state: "visible" });
    assert.equal(await page.locator("#masteryList .mastery-item").count(), totalWords, "Progress should list every vocabulary word");
    assert.equal(await page.locator("#masteryList .learning-status").count(), totalWords, "Progress should show a learning state for every word");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#cardsGrid .word-card").first().waitFor({ state: "visible" });
    assert.equal(await page.evaluate(() => window.AppStorage.loadSettings().activeUnit), "home", "activeUnit should persist across reloads");
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
