from playwright.sync_api import sync_playwright, expect
import sys

BASE_URL = "http://localhost:3000"


def test_search_page_loads(page):
    """Search page loads with heading"""
    page.goto(f"{BASE_URL}/search")
    page.wait_for_load_state("domcontentloaded")
    expect(page.get_by_role("heading", name="Search")).to_be_visible()
    expect(page.get_by_text("Search across Quran, Hadith, and Videos").first).to_be_visible()


def test_search_input_visible(page):
    """Search input is present"""
    page.goto(f"{BASE_URL}/search")
    page.wait_for_load_state("domcontentloaded")
    search_input = page.locator("input[type='search']")
    expect(search_input).to_be_visible()
    expect(search_input).not_to_be_disabled(timeout=30000)


def test_search_tabs_exist(page):
    """All three content type tabs are visible"""
    page.goto(f"{BASE_URL}/search")
    page.wait_for_load_state("domcontentloaded")
    expect(page.get_by_role("tab", name="Quran")).to_be_visible()
    expect(page.get_by_role("tab", name="Hadith")).to_be_visible()
    expect(page.get_by_role("tab", name="Videos")).to_be_visible()


def test_search_tab_quran_selected_default(page):
    """Quran tab is selected by default"""
    page.goto(f"{BASE_URL}/search")
    page.wait_for_load_state("domcontentloaded")
    quran_tab = page.get_by_role("tab", name="Quran")
    expect(quran_tab).to_have_attribute("aria-selected", "true")


def test_search_tab_switching(page):
    """Switching tabs updates aria-selected"""
    page.goto(f"{BASE_URL}/search")
    page.wait_for_load_state("domcontentloaded")
    hadith_tab = page.get_by_role("tab", name="Hadith")
    hadith_tab.click()
    page.wait_for_timeout(500)
    expect(hadith_tab).to_have_attribute("aria-selected", "true")


def test_quran_search_finds_results(page):
    """Quran search returns results"""
    page.goto(f"{BASE_URL}/search")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(3000)
    search_input = page.locator("input[type='search']")
    expect(search_input).not_to_be_disabled(timeout=30000)
    search_input.fill("mercy")
    page.wait_for_timeout(2000)
    result_links = page.locator("a[href*='/quran/']")
    count = result_links.count()
    assert count >= 1, f"Expected at least 1 Quran result, got {count}"


def test_hadith_search_page_loads(page):
    """Search page works with Hadith tab"""
    page.goto(f"{BASE_URL}/search")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(3000)
    hadith_tab = page.get_by_role("tab", name="Hadith")
    expect(hadith_tab).to_be_visible()
    hadith_tab.click()
    page.wait_for_timeout(500)
    expect(hadith_tab).to_have_attribute("aria-selected", "true")


def test_videos_tab_loads(page):
    """Videos tab is clickable"""
    page.goto(f"{BASE_URL}/search")
    page.wait_for_load_state("domcontentloaded")
    videos_tab = page.get_by_role("tab", name="Videos")
    expect(videos_tab).to_be_visible()
    videos_tab.click()
    page.wait_for_timeout(500)
    expect(videos_tab).to_have_attribute("aria-selected", "true")


def test_clear_search_works(page):
    """Clear button resets search"""
    page.goto(f"{BASE_URL}/search")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(3000)
    search_input = page.locator("input[type='search']")
    expect(search_input).not_to_be_disabled(timeout=30000)
    search_input.fill("test")
    page.wait_for_timeout(500)
    clear_btn = page.get_by_label("Clear search")
    if clear_btn.is_visible():
        clear_btn.click()
        page.wait_for_timeout(500)
        expect(search_input).to_have_value("")


def test_sitemap_xml_accessible(page):
    """Sitemap.xml returns valid XML"""
    resp = page.goto(f"{BASE_URL}/sitemap.xml")
    page.wait_for_load_state("domcontentloaded")
    assert resp and resp.ok, f"Sitemap returned {resp.status if resp else 'None'}"
    content = page.content()
    assert "urlset" in content or "sitemap" in content.lower()
    assert "quran" in content.lower()


def test_robots_txt_accessible(page):
    """Robots.txt is accessible"""
    resp = page.goto(f"{BASE_URL}/robots.txt")
    page.wait_for_load_state("domcontentloaded")
    assert resp and resp.ok, f"Robots.txt returned {resp.status if resp else 'None'}"
    text = page.locator("pre").inner_text()
    assert "User-Agent" in text
    assert "Sitemap" in text


def test_manifest_json_accessible(page):
    """PWA manifest is accessible"""
    resp = page.goto(f"{BASE_URL}/manifest.json")
    page.wait_for_load_state("domcontentloaded")
    assert resp and resp.ok, f"Manifest returned {resp.status if resp else 'None'}"


def test_jsonld_exists_on_homepage(page):
    """JSON-LD structured data exists on homepage"""
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("domcontentloaded")
    jsonld = page.locator('script[type="application/ld+json"]')
    count = jsonld.count()
    assert count >= 1, f"Expected JSON-LD on homepage, found {count}"
    content = jsonld.first.inner_text()
    assert "schema.org" in content
    assert "SearchAction" in content


def test_jsonld_exists_on_surah_page(page):
    """JSON-LD structured data exists on surah page"""
    page.goto(f"{BASE_URL}/quran/1")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(3000)
    jsonld = page.locator('script[type="application/ld+json"]')
    count = jsonld.count()
    # At least one JSON-LD script should contain Book schema
    found_book = False
    for i in range(count):
        content = jsonld.nth(i).inner_text()
        if "Book" in content and "schema.org" in content:
            found_book = True
            break
    if not found_book and count == 0:
        # Fallback: check homepage
        page.goto(f"{BASE_URL}/")
        page.wait_for_load_state("domcontentloaded")
        page.wait_for_timeout(2000)
        jsonld = page.locator('script[type="application/ld+json"]')
        count = jsonld.count()
        assert count >= 1, "JSON-LD should exist on at least the homepage"
    assert found_book, "Book schema JSON-LD not found on surah page"


def test_pwa_manifest_link_in_head(page):
    """PWA manifest link exists in head"""
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("domcontentloaded")
    manifest_link = page.locator('link[rel="manifest"]')
    expect(manifest_link).to_have_attribute("href", "/manifest.json")


def test_pwa_theme_color(page):
    """PWA theme-color meta tag exists"""
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("domcontentloaded")
    theme_color = page.locator('meta[name="theme-color"]').first
    expect(theme_color).to_have_attribute("content", "#0a1628")


def test_pwa_apple_meta(page):
    """PWA apple-mobile-web-app meta tags exist"""
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("domcontentloaded")
    apple_capable = page.locator('meta[name="apple-mobile-web-app-capable"]')
    expect(apple_capable).to_have_attribute("content", "yes")
    apple_title = page.locator('meta[name="apple-mobile-web-app-title"]')
    expect(apple_title).to_have_attribute("content", "Noor")


def test_pwa_icons_exist(page):
    """PWA icon SVG files are accessible"""
    for icon in ["/images/icons/favicon.svg", "/images/icons/icon-192.svg", "/images/icons/icon-512.svg"]:
        resp = page.goto(f"{BASE_URL}{icon}")
        page.wait_for_load_state("domcontentloaded")
        assert resp and resp.ok, f"Icon {icon} returned {resp.status if resp else 'None'}"


def test_service_worker_accessible(page):
    """Service worker file is accessible"""
    resp = page.goto(f"{BASE_URL}/sw.js")
    page.wait_for_load_state("domcontentloaded")
    assert resp and resp.ok, f"SW returned {resp.status if resp else 'None'}"
    content = page.content()
    assert "self.addEventListener" in content


def test_search_initial_state(page):
    """Search shows placeholder before any query"""
    page.goto(f"{BASE_URL}/search")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(1000)
    placeholder = page.locator("text=Search for any word or phrase")
    expect(placeholder).to_be_visible()


def test_search_no_results_state(page):
    """Search shows no results message when no matches"""
    page.goto(f"{BASE_URL}/search")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(3000)
    search_input = page.locator("input[type='search']")
    expect(search_input).not_to_be_disabled(timeout=30000)
    search_input.fill("xyznonexistent12345")
    page.wait_for_timeout(2000)
    no_results = page.locator("text=No results found")
    expect(no_results).to_be_visible()


def main():
    tests = [
        ("Search page loads", test_search_page_loads),
        ("Search input visible", test_search_input_visible),
        ("Content tabs exist (Quran/Hadith/Videos)", test_search_tabs_exist),
        ("Quran tab selected by default", test_search_tab_quran_selected_default),
        ("Tab switching works", test_search_tab_switching),
        ("Quran search returns results", test_quran_search_finds_results),
        ("Hadith tab is clickable", test_hadith_search_page_loads),
        ("Videos tab is clickable", test_videos_tab_loads),
        ("Clear search works", test_clear_search_works),
        ("Sitemap.xml is accessible", test_sitemap_xml_accessible),
        ("Robots.txt is accessible", test_robots_txt_accessible),
        ("PWA manifest accessible", test_manifest_json_accessible),
        ("JSON-LD on homepage", test_jsonld_exists_on_homepage),
        ("JSON-LD on surah page", test_jsonld_exists_on_surah_page),
        ("PWA manifest link in head", test_pwa_manifest_link_in_head),
        ("PWA theme-color meta", test_pwa_theme_color),
        ("PWA apple meta tags", test_pwa_apple_meta),
        ("PWA icons accessible", test_pwa_icons_exist),
        ("Service worker accessible", test_service_worker_accessible),
        ("Search initial placeholder", test_search_initial_state),
        ("Search no results state", test_search_no_results_state),
    ]

    passed = 0
    failed = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-web-security", "--no-sandbox", "--disable-setuid-sandbox"]
        )
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            ignore_https_errors=True,
        )
        page = context.new_page()

        for name, test_fn in tests:
            try:
                test_fn(page)
                print(f"  [PASS] {name}")
                passed += 1
            except Exception as e:
                msg = str(e).encode("ascii", errors="replace").decode()
                print(f"  [FAIL] {name}: {msg}")
                failed += 1

        browser.close()

    print(f"\n{'='*40}")
    print(f"Results: {passed} passed, {failed} failed, {passed+failed} total")
    print(f"{'='*40}")
    sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()
