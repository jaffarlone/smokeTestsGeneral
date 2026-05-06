const { test, expect } = require("@playwright/test");

const BASE_URL = "https://www.pakwheels.com";
const TIMEOUT = 60_000;
const NAV_TIMEOUT = 60_000;

test.use({
  baseURL: BASE_URL,
  navigationTimeout: NAV_TIMEOUT,
  actionTimeout: 15_000,
});

async function goto(page, path) {
  await page.goto(path, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT,
  });
}

async function dismissCookieBanner(page) {
  const banner = page.locator(
    'button:has-text("Accept"), button:has-text("OK"), [id*="cookie"] button'
  );
  if (await banner.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await banner.first().click();
  }
}

// 1. Homepage
test.describe("Homepage", () => {
  test("loads successfully and shows key elements", async ({ page }) => {
    await goto(page, "/");
    await dismissCookieBanner(page);
 
    await expect(page).toHaveTitle(/pakwheels/i);
 
    // Logo — try img inside a link, or any element with logo in class/id
    await expect(
      page.locator('a[href="/"] img, [class*="logo"], [id*="logo"], header img').first()
    ).toBeVisible({ timeout: TIMEOUT });
 
    // Nav — PakWheels may use a header, ul, or div-based menu instead of <nav>
    await expect(
      page.locator('nav, #main-nav, .navbar, header, [class*="header"], [class*="nav"], [role="navigation"]').first()
    ).toBeVisible({ timeout: TIMEOUT });
 
    // Hero / search — filter to only visible inputs (hidden ones are in collapsed menus)
    const searchInput = page
      .locator('input[type="search"], input[type="text"], [class*="search"]')
      .filter({ visible: true })
      .first();
    await searchInput.scrollIntoViewIfNeeded();
    await expect(searchInput).toBeVisible({ timeout: TIMEOUT });
  });

  test("footer is present with important links", async ({ page }) => {
    await goto(page, "/");
    const footer = page.locator(
      'footer, [class*="footer"], [id*="footer"], [role="contentinfo"]'
    ).filter({ visible: true }).first();
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible({ timeout: TIMEOUT });
  });

// 2. Used Cars
test.describe("Used Cars", () => {
  test("navigates to used cars listing page", async ({ page }) => {
    await goto(page, "/used-cars/search");
    await expect(page).toHaveURL(/used-cars/);
    await expect(page.locator('[class*="car-card"], .car-listing, .listing-item').first()).toBeVisible({ timeout: TIMEOUT });
  });
});

//   test("search filters – make dropdown works", async ({ page }) => {
//     await goto(page, "/used-cars/search");
//     const makeDropdown = page.locator('select[name="make"], [placeholder*="Make"], [aria-label*="Make"]').first();
//     await expect(makeDropdown).toBeVisible();
//     await makeDropdown.selectOption({ index: 1 });
//     await page.waitForLoadState("domcontentloaded");
//     await expect(page).toHaveURL(/make/i);
//   });

//   test("search filters – city filter works", async ({ page }) => {
//     await goto(page, "/used-cars/search");
//     const cityDropdown = page.locator('select[name="city"], [aria-label*="City"], [placeholder*="City"]').first();
//     await expect(cityDropdown).toBeVisible();
//     await cityDropdown.selectOption({ label: /lahore/i });
//     await page.waitForLoadState("domcontentloaded");
//     await expect(page.url()).toMatch(/lahore/i);
//   });

//   test("car detail page opens from listing", async ({ page }) => {
//     await goto(page, "/used-cars/search");
//     const firstCar = page.locator('a[href*="/used-cars/"]').first();
//     await expect(firstCar).toBeVisible();
//     await firstCar.click();
//     await page.waitForLoadState("domcontentloaded");
//     await expect(page).toHaveURL(/used-cars/);
//     await expect(page.locator('[class*="price"], .ad-price, [itemprop="price"]').first()).toBeVisible({ timeout: TIMEOUT });
//   });
// });

// // 3. New Cars
// test.describe("New Cars", () => {
//   test("new cars section loads", async ({ page }) => {
//     await goto(page, "/new-cars/");
//     await expect(page).toHaveURL(/new-cars/);
//     await expect(page.locator("h1, h2").first()).toBeVisible();
//   });

//   test("new car brand page opens", async ({ page }) => {
//     await goto(page, "/new-cars/");
//     const brandLink = page.locator('a[href*="/new-cars/"]').first();
//     await brandLink.click();
//     await page.waitForLoadState("domcontentloaded");
//     await expect(page).toHaveURL(/new-cars/);
//   });
// });

// // 4. Bikes
// test.describe("Bikes", () => {
//   test("used bikes listing loads", async ({ page }) => {
//     await goto(page, "/used-bikes/search");
//     await expect(page).toHaveURL(/used-bikes/);
//     await expect(page.locator('[class*="bike-card"], [class*="listing"], .bike-listing').first()).toBeVisible({ timeout: TIMEOUT });
//   });
// });

// // 5. Global Search
// test.describe("Global Search", () => {
//   test("search bar accepts input and returns results", async ({ page }) => {
//     await goto(page, "/");
//     await dismissCookieBanner(page);
//     const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
//     await searchInput.fill("Toyota Corolla");
//     await searchInput.press("Enter");
//     await page.waitForLoadState("domcontentloaded");
//     await expect(page).toHaveURL(/search|corolla/i);
//     await expect(page.locator("h1, h2, .results-count").first()).toBeVisible();
//   });
// });

// // 6. Forums
// test.describe("Forums", () => {
//   test("forum page loads with topics visible", async ({ page }) => {
//     await goto(page, "/forums/");
//     await expect(page).toHaveURL(/forums/);
//     await expect(page.locator("h1, h2, .forum-category, .forum-title").first()).toBeVisible();
//   });
// });

// // 7. Car Compare
// test.describe("Car Compare", () => {
//   test("compare page is accessible", async ({ page }) => {
//     await goto(page, "/new-cars/compare/");
//     await expect(page).toHaveURL(/compare/);
//     await expect(page.locator("h1, h2, [class*='compare']").first()).toBeVisible();
//   });
// });

// // 8. Sell a Car
// test.describe("Sell a Car", () => {
//   test("sell page redirects to login or shows ad form", async ({ page }) => {
//     await goto(page, "/sell-car/");
//     await page.waitForLoadState("domcontentloaded");
//     const isLoginPage = page.url().includes("login") || page.url().includes("signin");
//     const hasForm = await page.locator('form, [class*="sell"], [class*="post-ad"]').first().isVisible().catch(() => false);
//     expect(isLoginPage || hasForm).toBeTruthy();
//   });
// });

// ─────────────────────────────────────────────
// 9. Performance / Core Checks
// ─────────────────────────────────────────────
test.describe("Performance & Accessibility Sanity", () => {
  test("homepage responds within 10 seconds", async ({ page }) => {
    const start = Date.now();
    await goto(page, "/");
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10_000);
  });

  test("no broken main navigation links (3xx/4xx/5xx)", async ({ page }) => {
    await goto(page, "/");

    const navLinks = await page
      .locator("nav a[href]")
      .evaluateAll((els) =>
        els
          .map((el) => el.getAttribute("href"))
          .filter((h) => h && h.startsWith("/"))
          .slice(0, 8)
      );

    for (const href of navLinks) {
      const response = await page.request.get(`${BASE_URL}${href}`);
      expect(response.status(), `Broken link: ${href}`).toBeLessThan(400);
    }
  });

  test("page has a valid meta description", async ({ page }) => {
    await goto(page, "/");
    const metaDesc = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(metaDesc).toBeTruthy();
    expect(metaDesc.length).toBeGreaterThan(10);
  });
});
// // 9. Performance & SEO
// test.describe("Performance & Accessibility Sanity", () => {
//   test("homepage responds within 10 seconds", async ({ page }) => {
//     const start = Date.now();
//     await goto(page, "/");
//     expect(Date.now() - start).toBeLessThan(10_000);
//   });

//   test("no broken main navigation links", async ({ page }) => {
//     await goto(page, "/");
//     const navLinks = await page.locator("nav a[href]").evaluateAll((els) =>
//       els.map((el) => el.getAttribute("href")).filter((h) => h && h.startsWith("/")).slice(0, 8)
//     );
//     for (const href of navLinks) {
//       const response = await page.request.get(`${BASE_URL}${href}`);
//       expect(response.status(), `Broken link: ${href}`).toBeLessThan(400);
//     }
//   });

//   test("page has a valid meta description", async ({ page }) => {
//     await goto(page, "/");
//     const metaDesc = await page.locator('meta[name="description"]').getAttribute("content");
//     expect(metaDesc).toBeTruthy();
//     expect(metaDesc.length).toBeGreaterThan(10);
  });