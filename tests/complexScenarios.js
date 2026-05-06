const { test, expect } = require("@playwright/test");

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
const BASE_URL = "https://www.pakwheels.com";
const TIMEOUT = 60_000;
const NAV_TIMEOUT = 60_000;

test.use({
  baseURL: BASE_URL,
  navigationTimeout: NAV_TIMEOUT,
  actionTimeout: 15_000,
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
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

// Extract numeric value from a price string like "PKR 25,00,000"
function parsePrice(priceText) {
  return parseInt(priceText.replace(/[^0-9]/g, ""), 10);
}

// ─────────────────────────────────────────────
// 1. Advanced Search & Filtering
// ─────────────────────────────────────────────
test.describe("Advanced Search & Filtering", () => {

  test("filter by make and model returns relevant results", async ({ page }) => {
    await goto(page, "/used-cars/search");

    // select make
    const makeDropdown = page.locator('select[name="make"]').first();
    await expect(makeDropdown).toBeVisible({ timeout: TIMEOUT });
    await makeDropdown.selectOption({ index: 1 });
    await page.waitForLoadState("domcontentloaded");

    // select model after make is chosen
    const modelDropdown = page.locator('select[name="model"]').first();
    await expect(modelDropdown).toBeVisible({ timeout: TIMEOUT });
    await modelDropdown.selectOption({ index: 1 });
    await page.waitForLoadState("domcontentloaded");

    // results should reflect the selected make/model in URL
    expect(page.url()).toMatch(/make|model/i);

    // at least one listing should be present
    const listings = page.locator('[class*="car-card"], [class*="listing-item"], [class*="search-result"]');
    await expect(listings.first()).toBeVisible({ timeout: TIMEOUT });
  });

  test("price range filter — min and max price applied correctly", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const minPrice = page.locator('input[name="price_min"], [placeholder*="Min Price"], select[name="price_min"]').first();
    const maxPrice = page.locator('input[name="price_max"], [placeholder*="Max Price"], select[name="price_max"]').first();

    await expect(minPrice).toBeVisible({ timeout: TIMEOUT });
    await expect(maxPrice).toBeVisible({ timeout: TIMEOUT });

    // set price range 10 lac to 30 lac
    const tag = await minPrice.evaluate(el => el.tagName.toLowerCase());
    if (tag === "select") {
      await minPrice.selectOption({ index: 1 });
      await maxPrice.selectOption({ index: 3 });
    } else {
      await minPrice.fill("1000000");
      await maxPrice.fill("3000000");
      await page.keyboard.press("Enter");
    }

    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toMatch(/price|min|max/i);
  });

  test("year range filter updates results", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const yearMin = page.locator('select[name="year_min"], [aria-label*="Year From"], [placeholder*="Year From"]').first();
    await expect(yearMin).toBeVisible({ timeout: TIMEOUT });
    await yearMin.selectOption({ index: 1 });
    await page.waitForLoadState("domcontentloaded");

    expect(page.url()).toMatch(/year/i);
  });

  test("city filter — Karachi shows Karachi listings", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const cityDropdown = page.locator('select[name="city"], [aria-label*="City"]').first();
    await expect(cityDropdown).toBeVisible({ timeout: TIMEOUT });
    await cityDropdown.selectOption({ label: /karachi/i });
    await page.waitForLoadState("domcontentloaded");

    expect(page.url()).toMatch(/karachi/i);

    const listings = page.locator('[class*="car-card"], [class*="listing-item"]');
    await expect(listings.first()).toBeVisible({ timeout: TIMEOUT });
  });

  test("multiple filters combined — make + city + year", async ({ page }) => {
    await goto(page, "/used-cars/search");

    // apply city
    const cityDropdown = page.locator('select[name="city"]').first();
    await expect(cityDropdown).toBeVisible({ timeout: TIMEOUT });
    await cityDropdown.selectOption({ label: /lahore/i });
    await page.waitForLoadState("domcontentloaded");

    // apply make
    const makeDropdown = page.locator('select[name="make"]').first();
    await expect(makeDropdown).toBeVisible({ timeout: TIMEOUT });
    await makeDropdown.selectOption({ index: 1 });
    await page.waitForLoadState("domcontentloaded");

    // URL should contain both filters
    const url = page.url();
    expect(url).toMatch(/lahore/i);
    expect(url).toMatch(/make/i);
  });

  test("sorting — price low to high reorders listings", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const sortDropdown = page.locator('select[name="sort"], [aria-label*="Sort"], [class*="sort"]').first();
    await expect(sortDropdown).toBeVisible({ timeout: TIMEOUT });
    await sortDropdown.selectOption({ label: /price.*low|low.*high|ascending/i });
    await page.waitForLoadState("domcontentloaded");

    expect(page.url()).toMatch(/sort|order/i);
  });

  test("sorting — newest first reorders listings", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const sortDropdown = page.locator('select[name="sort"], [aria-label*="Sort"], [class*="sort"]').first();
    await expect(sortDropdown).toBeVisible({ timeout: TIMEOUT });
    await sortDropdown.selectOption({ label: /newest|latest|date/i });
    await page.waitForLoadState("domcontentloaded");

    expect(page.url()).toMatch(/sort|order/i);
  });

  test("mileage filter limits results by km driven", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const mileageFilter = page.locator('select[name="mileage"], [aria-label*="Mileage"], [placeholder*="Mileage"]').first();
    await expect(mileageFilter).toBeVisible({ timeout: TIMEOUT });
    await mileageFilter.selectOption({ index: 1 });
    await page.waitForLoadState("domcontentloaded");

    expect(page.url()).toMatch(/mileage|km/i);
  });

  test("transmission filter — automatic cars only", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const transmissionFilter = page.locator('select[name="transmission"], [aria-label*="Transmission"]').first();
    await expect(transmissionFilter).toBeVisible({ timeout: TIMEOUT });
    await transmissionFilter.selectOption({ label: /automatic/i });
    await page.waitForLoadState("domcontentloaded");

    expect(page.url()).toMatch(/automatic|transmission/i);
  });

});

// ─────────────────────────────────────────────
// 2. Car Detail Page — Deep Validation
// ─────────────────────────────────────────────
test.describe("Car Detail Page", () => {

  test("detail page shows all key sections", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const firstCar = page.locator('a[href*="/used-cars/"]').first();
    await expect(firstCar).toBeVisible({ timeout: TIMEOUT });
    await firstCar.click();
    await page.waitForLoadState("domcontentloaded");

    // price must be visible
    await expect(
      page.locator('[class*="price"], .ad-price, [itemprop="price"]').first()
    ).toBeVisible({ timeout: TIMEOUT });

    // title / car name must be visible
    await expect(
      page.locator('h1, [class*="car-title"], [class*="ad-title"]').first()
    ).toBeVisible({ timeout: TIMEOUT });

    // specs section must be visible
    await expect(
      page.locator('[class*="spec"], [class*="detail"], [class*="feature"]').first()
    ).toBeVisible({ timeout: TIMEOUT });
  });

  test("detail page — seller contact section is present", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const firstCar = page.locator('a[href*="/used-cars/"]').first();
    await firstCar.click();
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.locator('[class*="seller"], [class*="contact"], [class*="phone"], button:has-text("Call")').first()
    ).toBeVisible({ timeout: TIMEOUT });
  });

  test("detail page — image gallery is present", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const firstCar = page.locator('a[href*="/used-cars/"]').first();
    await firstCar.click();
    await page.waitForLoadState("domcontentloaded");

    // at least one car image should be visible
    await expect(
      page.locator('[class*="gallery"] img, [class*="slider"] img, [class*="carousel"] img').first()
    ).toBeVisible({ timeout: TIMEOUT });
  });

  test("detail page — similar cars section is present", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const firstCar = page.locator('a[href*="/used-cars/"]').first();
    await firstCar.click();
    await page.waitForLoadState("domcontentloaded");

    // scroll to similar cars section
    const similarSection = page.locator('[class*="similar"], [class*="related"], h2:has-text("Similar")').first();
    await similarSection.scrollIntoViewIfNeeded();
    await expect(similarSection).toBeVisible({ timeout: TIMEOUT });
  });

  test("detail page — breadcrumb navigation is present", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const firstCar = page.locator('a[href*="/used-cars/"]').first();
    await firstCar.click();
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.locator('[class*="breadcrumb"], nav[aria-label*="breadcrumb"], [itemtype*="BreadcrumbList"]').first()
    ).toBeVisible({ timeout: TIMEOUT });
  });

  test("detail page — price is a valid number", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const firstCar = page.locator('a[href*="/used-cars/"]').first();
    await firstCar.click();
    await page.waitForLoadState("domcontentloaded");

    const priceEl = page.locator('[class*="price"], .ad-price, [itemprop="price"]').first();
    await expect(priceEl).toBeVisible({ timeout: TIMEOUT });

    const priceText = await priceEl.innerText();
    const priceValue = parsePrice(priceText);

    // price should be a positive number greater than 0
    expect(priceValue).toBeGreaterThan(0);
  });

});

// ─────────────────────────────────────────────
// 3. Search — Keyword & Edge Cases
// ─────────────────────────────────────────────
test.describe("Search — Keyword & Edge Cases", () => {

  test("search for Toyota Corolla returns relevant results", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="car" i]')
      .filter({ visible: true })
      .first();
    await searchInput.scrollIntoViewIfNeeded();
    await searchInput.fill("Toyota Corolla");
    await searchInput.press("Enter");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/corolla|toyota|search/i);
    await expect(page.locator("h1, h2, [class*='result']").first()).toBeVisible({ timeout: TIMEOUT });
  });

  test("search for Honda Civic returns relevant results", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="car" i]')
      .filter({ visible: true })
      .first();
    await searchInput.scrollIntoViewIfNeeded();
    await searchInput.fill("Honda Civic");
    await searchInput.press("Enter");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/civic|honda|search/i);
  });

  test("empty search does not crash the page", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="car" i]')
      .filter({ visible: true })
      .first();
    await searchInput.scrollIntoViewIfNeeded();
    await searchInput.fill("");
    await searchInput.press("Enter");
    await page.waitForLoadState("domcontentloaded");

    // page should still be functional — no crash or error page
    const title = await page.title();
    expect(title.toLowerCase()).not.toMatch(/error|404|not found/i);
  });

  test("special characters in search do not crash the page", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="car" i]')
      .filter({ visible: true })
      .first();
    await searchInput.scrollIntoViewIfNeeded();
    await searchInput.fill("!@#$%^&*()");
    await searchInput.press("Enter");
    await page.waitForLoadState("domcontentloaded");

    const title = await page.title();
    expect(title.toLowerCase()).not.toMatch(/error|500|crash/i);
  });

  test("very long search query does not crash the page", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="car" i]')
      .filter({ visible: true })
      .first();
    await searchInput.scrollIntoViewIfNeeded();
    await searchInput.fill("Toyota Corolla 2020 automatic low mileage lahore urgent sale good condition");
    await searchInput.press("Enter");
    await page.waitForLoadState("domcontentloaded");

    const title = await page.title();
    expect(title.toLowerCase()).not.toMatch(/error|500|crash/i);
  });

});

// ─────────────────────────────────────────────
// 4. Pagination
// ─────────────────────────────────────────────
test.describe("Pagination", () => {

  test("next page loads different results", async ({ page }) => {
    await goto(page, "/used-cars/search");

    // get first listing title on page 1
    const firstListingPage1 = await page
      .locator('[class*="car-card"] [class*="title"], [class*="listing-item"] h3, [class*="listing-item"] h2')
      .first()
      .innerText()
      .catch(() => "");

    // click next page
    const nextBtn = page.locator('a[rel="next"], [class*="next"], button:has-text("Next"), a:has-text("Next")').first();
    await expect(nextBtn).toBeVisible({ timeout: TIMEOUT });
    await nextBtn.click();
    await page.waitForLoadState("domcontentloaded");

    // URL should change to page 2
    expect(page.url()).toMatch(/page=2|p=2|\?.*2/i);

    // first listing on page 2 should differ from page 1
    const firstListingPage2 = await page
      .locator('[class*="car-card"] [class*="title"], [class*="listing-item"] h3')
      .first()
      .innerText()
      .catch(() => "");

    expect(firstListingPage2).not.toBe(firstListingPage1);
  });

  test("page 2 can navigate back to page 1", async ({ page }) => {
    await goto(page, "/used-cars/search?page=2");

    const prevBtn = page.locator('a[rel="prev"], [class*="prev"], button:has-text("Previous"), a:has-text("Prev")').first();
    await expect(prevBtn).toBeVisible({ timeout: TIMEOUT });
    await prevBtn.click();
    await page.waitForLoadState("domcontentloaded");

    expect(page.url()).not.toMatch(/page=2/i);
  });

  test("direct URL to page 3 loads correctly", async ({ page }) => {
    await goto(page, "/used-cars/search?page=3");

    const listings = page.locator('[class*="car-card"], [class*="listing-item"]');
    await expect(listings.first()).toBeVisible({ timeout: TIMEOUT });
  });

});

// ─────────────────────────────────────────────
// 5. New Cars — Deep Validation
// ─────────────────────────────────────────────
test.describe("New Cars — Deep Validation", () => {

  test("new car detail page shows price, specs and variants", async ({ page }) => {
    await goto(page, "/new-cars/");

    const carLink = page.locator('a[href*="/new-cars/"]').first();
    await carLink.click();
    await page.waitForLoadState("domcontentloaded");

    // price or starting price visible
    await expect(
      page.locator('[class*="price"], [class*="starting"], h2, h3').first()
    ).toBeVisible({ timeout: TIMEOUT });
  });

  test("new car compare — selecting two cars enables compare", async ({ page }) => {
    await goto(page, "/new-cars/compare/");

    // first car selector
    const car1 = page.locator('select, [class*="select"], [placeholder*="Select Car"]').first();
    await expect(car1).toBeVisible({ timeout: TIMEOUT });
    await car1.selectOption({ index: 1 });
    await page.waitForLoadState("domcontentloaded");

    // second car selector
    const car2 = page.locator('select, [class*="select"], [placeholder*="Select Car"]').nth(1);
    await expect(car2).toBeVisible({ timeout: TIMEOUT });
    await car2.selectOption({ index: 2 });
    await page.waitForLoadState("domcontentloaded");

    // comparison table or result should appear
    await expect(
      page.locator('[class*="compare-table"], [class*="comparison"], table').first()
    ).toBeVisible({ timeout: TIMEOUT });
  });

});

// ─────────────────────────────────────────────
// 6. Bikes — Deep Validation
// ─────────────────────────────────────────────
test.describe("Bikes — Deep Validation", () => {

  test("bike detail page opens with price and specs", async ({ page }) => {
    await goto(page, "/used-bikes/search");

    const firstBike = page.locator('a[href*="/used-bikes/"]').first();
    await expect(firstBike).toBeVisible({ timeout: TIMEOUT });
    await firstBike.click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/used-bikes/);
    await expect(
      page.locator('[class*="price"], .ad-price').first()
    ).toBeVisible({ timeout: TIMEOUT });
  });

  test("bike filter by make works", async ({ page }) => {
    await goto(page, "/used-bikes/search");

    const makeDropdown = page.locator('select[name="make"]').first();
    await expect(makeDropdown).toBeVisible({ timeout: TIMEOUT });
    await makeDropdown.selectOption({ index: 1 });
    await page.waitForLoadState("domcontentloaded");

    expect(page.url()).toMatch(/make/i);
  });

  test("new bikes listing page loads", async ({ page }) => {
    await goto(page, "/new-bikes/");
    await expect(page).toHaveURL(/new-bikes/);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: TIMEOUT });
  });

});

// ─────────────────────────────────────────────
// 7. Forums — Deep Validation
// ─────────────────────────────────────────────
test.describe("Forums — Deep Validation", () => {

  test("forum category page opens", async ({ page }) => {
    await goto(page, "/forums/");

    const categoryLink = page.locator('[class*="forum"] a, [class*="category"] a').first();
    await expect(categoryLink).toBeVisible({ timeout: TIMEOUT });
    await categoryLink.click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/forums/);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: TIMEOUT });
  });

  test("forum thread opens and shows posts", async ({ page }) => {
    await goto(page, "/forums/");

    // click first thread link
    const threadLink = page.locator('[class*="thread"] a, [class*="topic"] a, [class*="forum-post"] a').first();
    await expect(threadLink).toBeVisible({ timeout: TIMEOUT });
    await threadLink.click();
    await page.waitForLoadState("domcontentloaded");

    // thread page should show content
    await expect(page.locator('[class*="post"], [class*="message"], article').first()).toBeVisible({ timeout: TIMEOUT });
  });

});

// ─────────────────────────────────────────────
// 8. Auth Flow
// ─────────────────────────────────────────────
test.describe("Auth Flow", () => {

  test("login page loads with email and password fields", async ({ page }) => {
    await goto(page, "/users/login");

    await expect(
      page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first()
    ).toBeVisible({ timeout: TIMEOUT });

    await expect(
      page.locator('input[type="password"], input[name="password"]').first()
    ).toBeVisible({ timeout: TIMEOUT });
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await goto(page, "/users/login");

    await page
      .locator('input[type="email"], input[name="email"]')
      .first()
      .fill("invalid@test.com");

    await page
      .locator('input[type="password"], input[name="password"]')
      .first()
      .fill("wrongpassword123");

    await page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first().click();
    await page.waitForLoadState("domcontentloaded");

    // should show an error message
    await expect(
      page.locator('[class*="error"], [class*="alert"], [class*="invalid"], .flash-error').first()
    ).toBeVisible({ timeout: TIMEOUT });
  });

  test("login with empty fields shows validation error", async ({ page }) => {
    await goto(page, "/users/login");

    // submit without filling anything
    await page.locator('button[type="submit"], input[type="submit"], button:has-text("Login")').first().click();

    // should show validation error or stay on login page
    const url = page.url();
    expect(url).toMatch(/login|signin/i);
  });

  test("register page loads with required fields", async ({ page }) => {
    await goto(page, "/users/sign_up");

    await expect(
      page.locator('input[name="name"], input[placeholder*="name" i]').first()
    ).toBeVisible({ timeout: TIMEOUT });

    await expect(
      page.locator('input[type="email"], input[name="email"]').first()
    ).toBeVisible({ timeout: TIMEOUT });

    await expect(
      page.locator('input[type="password"], input[name="password"]').first()
    ).toBeVisible({ timeout: TIMEOUT });
  });

  test("forgot password page is accessible", async ({ page }) => {
    await goto(page, "/users/password/new");

    await expect(
      page.locator('input[type="email"], input[name="email"]').first()
    ).toBeVisible({ timeout: TIMEOUT });

    await expect(
      page.locator('button[type="submit"], input[type="submit"]').first()
    ).toBeVisible({ timeout: TIMEOUT });
  });

});

// ─────────────────────────────────────────────
// 9. SEO & Meta Tags
// ─────────────────────────────────────────────
test.describe("SEO & Meta Tags", () => {

  test("used cars page has correct meta title and description", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const title = await page.title();
    expect(title.toLowerCase()).toMatch(/car|pakwheels/i);

    const metaDesc = await page.locator('meta[name="description"]').getAttribute("content");
    expect(metaDesc).toBeTruthy();
    expect(metaDesc.length).toBeGreaterThan(10);
  });

  test("homepage has canonical URL", async ({ page }) => {
    await goto(page, "/");

    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toBeTruthy();
    expect(canonical).toMatch(/pakwheels\.com/i);
  });

  test("homepage has Open Graph tags", async ({ page }) => {
    await goto(page, "/");

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
    expect(ogTitle).toBeTruthy();

    const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(ogImage).toBeTruthy();
  });

  test("car detail page has structured data (JSON-LD)", async ({ page }) => {
    await goto(page, "/used-cars/search");

    const firstCar = page.locator('a[href*="/used-cars/"]').first();
    await firstCar.click();
    await page.waitForLoadState("domcontentloaded");

    const jsonLd = await page.locator('script[type="application/ld+json"]').count();
    expect(jsonLd).toBeGreaterThan(0);
  });

});

// ─────────────────────────────────────────────
// 10. Responsive / Mobile Viewport
// ─────────────────────────────────────────────
test.describe("Mobile Viewport", () => {

  test("homepage renders correctly on mobile", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 14
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
    });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });

    await expect(page).toHaveTitle(/pakwheels/i);
    await expect(
      page.locator('[class*="logo"], [id*="logo"], header img').first()
    ).toBeVisible({ timeout: TIMEOUT });

    await context.close();
  });

  test("used cars listing renders on mobile", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
    });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/used-cars/search`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });

    await expect(page).toHaveURL(/used-cars/);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: TIMEOUT });

    await context.close();
  });

  test("hamburger menu visible on mobile", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
    });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });

    await expect(
      page.locator('[class*="hamburger"], [class*="menu-toggle"], [class*="burger"], button[aria-label*="menu" i]').first()
    ).toBeVisible({ timeout: TIMEOUT });

    await context.close();
  });

});

// ─────────────────────────────────────────────
// 11. Performance Benchmarks
// ─────────────────────────────────────────────
test.describe("Performance Benchmarks", () => {

  test("used cars search page loads within 15 seconds", async ({ page }) => {
    const start = Date.now();
    await goto(page, "/used-cars/search");
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(15_000);
  });

  test("car detail page loads within 15 seconds", async ({ page }) => {
    await goto(page, "/used-cars/search");
    const firstCar = page.locator('a[href*="/used-cars/"]').first();
    await firstCar.click();

    const start = Date.now();
    await page.waitForLoadState("domcontentloaded");
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(15_000);
  });

  test("no console errors on homepage", async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await goto(page, "/");
    await page.waitForTimeout(2000);

    // filter out known third-party noise
    const criticalErrors = errors.filter(
      (e) => !e.includes("analytics") && !e.includes("gtm") && !e.includes("facebook")
    );
    expect(criticalErrors.length).toBe(0);
  });

  test("no failed network requests on homepage", async ({ page }) => {
    const failedRequests = [];
    page.on("requestfailed", (req) => {
      failedRequests.push(req.url());
    });

    await goto(page, "/");
    await page.waitForTimeout(3000);

    // filter out non-critical third party failures
    const criticalFailures = failedRequests.filter(
      (url) =>
        !url.includes("analytics") &&
        !url.includes("doubleclick") &&
        !url.includes("facebook") &&
        !url.includes("gtm")
    );

    expect(criticalFailures.length).toBe(0);
  });

});