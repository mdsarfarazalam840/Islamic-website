from playwright.sync_api import sync_playwright, expect
import sys

BASE_URL = "http://localhost:3000"

def test_homepage(page):
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    assert "Noor" in page.title()
    assert page.locator("text=Start Reading").is_visible()
    assert page.get_by_role("link", name="Search", exact=True).first.is_visible()

def test_navbar(page):
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    for link in ["Quran", "Hadith", "Videos", "Search"]:
        link_el = page.locator(f"nav >> text={link}")
        assert link_el.count() > 0, f"Navbar link '{link}' not found"

def test_quran_index(page):
    page.goto(f"{BASE_URL}/quran")
    page.wait_for_load_state("networkidle")
    assert page.locator("text=Al-Quran").is_visible()
    assert page.locator("text=Al-Fatiha").is_visible()
    assert page.locator("text=Al-Baqarah").is_visible()

def test_quran_surah(page):
    page.goto(f"{BASE_URL}/quran/1")
    page.wait_for_load_state("networkidle")
    assert page.locator("text=Al-Fatiha").is_visible()
    assert page.locator("text=الفاتحة").is_visible()
    assert page.locator("text=Back to Surah list").is_visible()

def test_quran_surah_114(page):
    page.goto(f"{BASE_URL}/quran/114")
    page.wait_for_load_state("networkidle")
    assert page.locator("text=An-Nas").is_visible()
    assert page.locator("text=الناس").is_visible()

def test_hadith_index(page):
    page.goto(f"{BASE_URL}/hadith")
    page.wait_for_load_state("networkidle")
    assert page.locator("text=Hadith Collections").is_visible()
    assert page.locator("text=Sahih al-Bukhari").is_visible()
    assert page.locator("text=Sahih Muslim").is_visible()

def test_hadith_collection(page):
    page.goto(f"{BASE_URL}/hadith/bukhari")
    page.wait_for_load_state("networkidle")
    assert page.locator("text=Sahih al-Bukhari").is_visible()
    assert page.locator("text=Back to collections").is_visible()

def test_videos_index(page):
    page.goto(f"{BASE_URL}/videos")
    page.wait_for_load_state("networkidle")
    assert page.locator("text=Video Library").is_visible()
    assert page.locator("text=Dr. Israr Ahmed").is_visible()
    assert page.locator("text=Mufti Menk").is_visible()

def test_videos_scholar(page):
    page.goto(f"{BASE_URL}/videos/dr-israr-ahmed")
    page.wait_for_load_state("networkidle")
    assert page.locator("text=Dr. Israr Ahmed").is_visible()
    assert page.locator("text=Back to scholars").is_visible()

def test_search_page(page):
    page.goto(f"{BASE_URL}/search")
    page.wait_for_load_state("networkidle")
    assert page.get_by_role("heading", name="Search").is_visible()
    assert page.locator("input[type='search']").is_visible()

def test_about_page(page):
    page.goto(f"{BASE_URL}/about")
    page.wait_for_load_state("networkidle")
    assert page.locator("text=About Noor").is_visible()

def test_not_found(page):
    page.goto(f"{BASE_URL}/nonexistent-page")
    page.wait_for_load_state("networkidle")
    assert page.locator("text=404").is_visible()
    assert page.locator("text=Page not found").is_visible()
    assert page.locator("text=Return Home").is_visible()

def test_footer(page):
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    footer = page.locator("footer")
    assert footer.is_visible()
    assert footer.get_by_role("link", name="Noor").is_visible()

def test_mobile_nav(page):
    page.set_viewport_size({"width": 375, "height": 812})
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    mobile_nav = page.locator("nav").last
    assert mobile_nav.is_visible()

def test_dark_theme(page):
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    html_class = page.locator("html").get_attribute("class")
    assert html_class and "dark" in html_class


def main():
    tests = [
        ("Homepage loads", test_homepage),
        ("Navbar has all links", test_navbar),
        ("Quran index shows surahs", test_quran_index),
        ("Quran surah page (Al-Fatiha)", test_quran_surah),
        ("Quran surah page (An-Nas)", test_quran_surah_114),
        ("Hadith index", test_hadith_index),
        ("Hadith collection (Bukhari)", test_hadith_collection),
        ("Videos index", test_videos_index),
        ("Videos scholar detail", test_videos_scholar),
        ("Search page", test_search_page),
        ("About page", test_about_page),
        ("404 page", test_not_found),
        ("Footer is present", test_footer),
        ("Mobile navigation", test_mobile_nav),
        ("Dark theme default", test_dark_theme),
    ]

    passed = 0
    failed = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
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
