const { test, expect } = require("@playwright/test");

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
const BASE_URL = "https://www.pakwheels.com";
const NAV_TIMEOUT = 60_000;
const TIMEOUT = 60_000;

test.use({
  baseURL: BASE_URL,
  navigationTimeout: NAV_TIMEOUT,
  actionTimeout: 15_000,
});

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────
async function goto(page, path) {
  await page.goto(path, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT,
  });
}

// ─────────────────────────────────────────────
// 1. Site is up
// ─────────────────────────────────────────────
test("smoke: site is up and reachable", async ({ page }) => {
  await page.goto(`${BASE_URL}/`, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT,
  });
  await expect(page).toHaveTitle(/pakwheels/i);
});

// ─────────────────────────────────────────────
// 2. Homepage loads with correct title
// ─────────────────────────────────────────────
test("smoke: homepage title is correct", async ({ page }) => {
  await goto(page, "/");
  await expect(page).toHaveTitle(/pakwheels/i);
});

// ─────────────────────────────────────────────
// 3. Homepage — logo visible
// ─────────────────────────────────────────────
test("smoke: homepage logo is visible", async ({ page }) => {
  await goto(page, "/");
  await expect(
    page.locator('[class*="logo"], [id*="logo"], header img, a[href="/"] img').first()
  ).toBeVisible({ timeout: TIMEOUT });
});

// ─────────────────────────────────────────────
// 4. Used cars listing page loads
// ─────────────────────────────────────────────
test("smoke: used cars listing page loads", async ({ page }) => {
  await goto(page, "/used-cars/search");
  await expect(page).toHaveURL(/used-cars/);
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: TIMEOUT });
});

// ─────────────────────────────────────────────
// 5. New cars page loads
// ─────────────────────────────────────────────
test("smoke: new cars page loads", async ({ page }) => {
  await goto(page, "/new-cars/");
  await expect(page).toHaveURL(/new-cars/);
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: TIMEOUT });
});

// ─────────────────────────────────────────────
// 6. Used bikes page loads
// ─────────────────────────────────────────────
test("smoke: used bikes page loads", async ({ page }) => {
  await goto(page, "/used-bikes/search");
  await expect(page).toHaveURL(/used-bikes/);
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: TIMEOUT });
});

// ─────────────────────────────────────────────
// 7. Forums page loads
// ─────────────────────────────────────────────
test("smoke: forums page loads", async ({ page }) => {
  await goto(page, "/forums/");
  await expect(page).toHaveURL(/forums/);
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: TIMEOUT });
});

// ─────────────────────────────────────────────
// 8. Car compare page loads
// ─────────────────────────────────────────────
test("smoke: car compare page loads", async ({ page }) => {
  await goto(page, "/new-cars/compare/");
  await expect(page).toHaveURL(/compare/);
  await expect(page.locator("h1, h2, [class*='compare']").first()).toBeVisible({ timeout: TIMEOUT });
});

// ─────────────────────────────────────────────
// 9. Sell car page loads or redirects to login
// ─────────────────────────────────────────────
test("smoke: sell car page is accessible", async ({ page }) => {
  await goto(page, "/sell-car/");
  await page.waitForLoadState("domcontentloaded");
  const isLoginPage = page.url().includes("login") || page.url().includes("signin");
  const hasForm = await page
    .locator('form, [class*="sell"], [class*="post-ad"]')
    .first()
    .isVisible()
    .catch(() => false);
  expect(isLoginPage || hasForm).toBeTruthy();
});

// ─────────────────────────────────────────────
// 10. Search navigates to results
// ─────────────────────────────────────────────
test("smoke: search returns results page", async ({ page }) => {
  await goto(page, "/");
  const searchInput = page
    .locator('input[type="search"], input[type="text"][name*="search"], input[placeholder*="search" i], input[placeholder*="car" i]')
    .filter({ visible: true })
    .first();
  await searchInput.scrollIntoViewIfNeeded();
  await searchInput.fill("Toyota Corolla");
  await searchInput.press("Enter");
  await page.waitForLoadState("domcontentloaded");
  await expect(page).toHaveURL(/search|corolla/i);
});

// ─────────────────────────────────────────────
// 11. No 4xx/5xx on critical nav links
// ─────────────────────────────────────────────
test("smoke: critical pages load without error", async ({ page }) => {
  const criticalPaths = [
    "/used-cars/search",
    "/new-cars/",
    "/used-bikes/search",
    "/forums/",
    "/new-cars/compare/",
  ];
  for (const path of criticalPaths) {
    await page.goto(`${BASE_URL}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT,
    });
    const title = await page.title();
    expect(title.toLowerCase(), `Error page at: ${path}`).not.toMatch(/404|not found|error/i);
  }
});

// ─────────────────────────────────────────────
// 12. Page has meta description (SEO)
// ─────────────────────────────────────────────
test("smoke: homepage has meta description", async ({ page }) => {
  await goto(page, "/");
  const metaDesc = await page
    .locator('meta[name="description"]')
    .getAttribute("content");
  expect(metaDesc).toBeTruthy();
  expect(metaDesc.length).toBeGreaterThan(10);
});