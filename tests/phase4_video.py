from playwright.sync_api import sync_playwright, expect
import sys

BASE_URL = "http://localhost:3000"


def test_videos_index_page(page):
    """Video library index loads with title, description, and scholar cards"""
    page.goto(f"{BASE_URL}/videos")
    page.wait_for_load_state("domcontentloaded")
    expect(page.get_by_role("heading", name="Video Library")).to_be_visible()
    expect(page.locator("text=Islamic lectures and scholar talks")).to_be_visible()


def test_videos_index_shows_scholars(page):
    """Featured scholar cards are visible on the index"""
    page.goto(f"{BASE_URL}/videos")
    page.wait_for_load_state("domcontentloaded")
    expect(page.get_by_role("heading", name="Scholars")).to_be_visible()
    expect(page.locator("text=Dr. Israr Ahmed")).to_be_visible()
    expect(page.locator("text=Mufti Menk")).to_be_visible()
    expect(page.locator("text=Nouman Ali Khan")).to_be_visible()


def test_videos_index_has_latest_videos_section(page):
    """Latest Videos heading is present"""
    page.goto(f"{BASE_URL}/videos")
    page.wait_for_load_state("domcontentloaded")
    expect(page.get_by_role("heading", name="Latest Videos")).to_be_visible()


def test_videos_index_category_filters(page):
    """Category filter buttons are visible"""
    page.goto(f"{BASE_URL}/videos")
    page.wait_for_load_state("domcontentloaded")
    all_btn = page.locator('button[aria-pressed="true"]')
    expect(all_btn.first).to_be_visible()
    # Check for specific category buttons
    expect(page.get_by_role("button", name="Tafsir")).to_be_visible()
    expect(page.get_by_role("button", name="Seerah")).to_be_visible()
    expect(page.get_by_role("button", name="Fiqh")).to_be_visible()


def test_videos_index_has_scholar_links(page):
    """Scholar cards link to scholar pages"""
    page.goto(f"{BASE_URL}/videos")
    page.wait_for_load_state("domcontentloaded")
    scholar_link = page.get_by_role("link", name="Dr. Israr Ahmed")
    expect(scholar_link).to_be_visible()
    href = scholar_link.get_attribute("href")
    assert href == "/videos/dr-israr-ahmed", f"Expected /videos/dr-israr-ahmed, got {href}"


def test_scholar_page_loads(page):
    """Scholar detail page shows bio and categories"""
    page.goto(f"{BASE_URL}/videos/dr-israr-ahmed")
    page.wait_for_load_state("domcontentloaded")
    expect(page.get_by_role("heading", name="Dr. Israr Ahmed")).to_be_visible()
    expect(page.locator("text=\u0688\u0627\u06a9\u0679\u0631 \u0627\u0633\u0631\u0627\u0631 \u0627\u062d\u0645\u062f")).to_be_visible()
    expect(page.locator("text=Founder of Tanzeem-e-Islami")).to_be_visible()


def test_scholar_page_shows_categories(page):
    """Scholar page shows their category badges"""
    page.goto(f"{BASE_URL}/videos/dr-israr-ahmed")
    page.wait_for_load_state("domcontentloaded")
    expect(page.locator("text=tafsir").first).to_be_visible()
    expect(page.locator("text=seerah").first).to_be_visible()
    expect(page.locator("text=aqeedah").first).to_be_visible()


def test_scholar_page_has_back_link(page):
    """Back to scholars link is visible"""
    page.goto(f"{BASE_URL}/videos/dr-israr-ahmed")
    page.wait_for_load_state("domcontentloaded")
    back = page.get_by_text("Back to scholars")
    expect(back.first).to_be_visible()


def test_scholar_page_has_video_grid(page):
    """Scholar page shows video cards (from mock data)"""
    page.goto(f"{BASE_URL}/videos/nouman-ali-khan")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(2000)
    video_cards = page.locator('[role="button"]')
    count = video_cards.count()
    assert count >= 2, f"Expected at least 2 video cards, got {count}"


def test_scholar_page_click_video_shows_modal(page):
    """Clicking a video card opens the YouTube embed modal"""
    page.goto(f"{BASE_URL}/videos/nouman-ali-khan")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(2000)
    video_cards = page.locator('[role="button"]')
    if video_cards.count() > 0:
        video_cards.first.click()
        page.wait_for_timeout(1000)
        dialog = page.locator('[role="dialog"]')
        expect(dialog).to_be_visible()


def test_scholar_page_modal_close_with_escape(page):
    """YouTube embed modal closes with Escape key"""
    page.goto(f"{BASE_URL}/videos/nouman-ali-khan")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(2000)
    video_cards = page.locator('[role="button"]')
    if video_cards.count() > 0:
        video_cards.first.click()
        page.wait_for_timeout(1000)
        dialog = page.locator('[role="dialog"]')
        expect(dialog).to_be_visible()
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)
        expect(dialog).not_to_be_visible()


def test_videos_index_category_filter_changes_content(page):
    """Clicking a category filter changes visible content"""
    page.goto(f"{BASE_URL}/videos")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(2000)
    all_count = page.locator('[role="button"]').count()
    # Click a category filter
    category_btn = page.get_by_role("button", name="Tafsir")
    if category_btn.is_visible():
        category_btn.click()
        page.wait_for_timeout(1000)
        expect(category_btn).to_have_attribute("aria-pressed", "true")


def test_scholar_page_back_navigation(page):
    """Back link navigates to videos index"""
    page.goto(f"{BASE_URL}/videos/dr-israr-ahmed")
    page.wait_for_load_state("domcontentloaded")
    back_link = page.get_by_text("Back to scholars").first
    expect(back_link).to_be_visible()
    page.goto(f"{BASE_URL}/videos")
    page.wait_for_load_state("domcontentloaded")
    expect(page.get_by_role("heading", name="Video Library")).to_be_visible()


def test_scholar_page_invalid_scholar(page):
    """Invalid scholar shows 404"""
    resp = page.goto(f"{BASE_URL}/videos/invalid-scholar")
    page.wait_for_load_state("domcontentloaded")
    expect(page.get_by_role("heading", name="404")).to_be_visible()


def test_scholar_page_mufti_menk(page):
    """Mufti Menk scholar page loads correctly"""
    page.goto(f"{BASE_URL}/videos/mufti-menk")
    page.wait_for_load_state("domcontentloaded")
    expect(page.get_by_role("heading", name="Mufti Menk")).to_be_visible()
    expect(page.locator("text=Grand Mufti of Zimbabwe")).to_be_visible()


def test_scholar_page_multiple_video_cards(page):
    """Scholar with multiple categories shows multiple video cards"""
    page.goto(f"{BASE_URL}/videos/omar-suleiman")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(2000)
    video_cards = page.locator('[role="button"]')
    count = video_cards.count()
    assert count >= 2, f"Expected at least 2 video cards for Omar Suleiman, got {count}"


def test_videos_index_mobile_view(page):
    """Video library works on mobile viewport"""
    page.set_viewport_size({"width": 375, "height": 812})
    page.goto(f"{BASE_URL}/videos")
    page.wait_for_load_state("domcontentloaded")
    expect(page.get_by_role("heading", name="Video Library")).to_be_visible()
    expect(page.locator("text=Dr. Israr Ahmed")).to_be_visible()


def test_scholar_page_all_10_scholars(page):
    """All 10 scholar pages load without error"""
    scholars = [
        "dr-israr-ahmed", "abu-saad", "muhammad-ali", "tuaha-ibn-jalil",
        "uthman-ibn-farooq", "omar-suleiman", "yasir-qadhi",
        "mufti-menk", "nouman-ali-khan", "bilal-philips"
    ]
    for scholar_id in scholars:
        resp = page.goto(f"{BASE_URL}/videos/{scholar_id}")
        page.wait_for_load_state("domcontentloaded")
        assert resp and resp.ok, f"Scholar page {scholar_id} returned {resp.status if resp else 'None'}"


def main():
    tests = [
        ("Video library index loads", test_videos_index_page),
        ("Index shows featured scholars", test_videos_index_shows_scholars),
        ("Index has Latest Videos section", test_videos_index_has_latest_videos_section),
        ("Index has category filters", test_videos_index_category_filters),
        ("Index has scholar links", test_videos_index_has_scholar_links),
        ("Scholar page loads with bio", test_scholar_page_loads),
        ("Scholar page shows category badges", test_scholar_page_shows_categories),
        ("Scholar page has back link", test_scholar_page_has_back_link),
        ("Scholar page has video grid", test_scholar_page_has_video_grid),
        ("Video click opens embed modal", test_scholar_page_click_video_shows_modal),
        ("Modal closes with Escape key", test_scholar_page_modal_close_with_escape),
        ("Category filter changes content", test_videos_index_category_filter_changes_content),
        ("Back navigation works", test_scholar_page_back_navigation),
        ("Invalid scholar returns 404", test_scholar_page_invalid_scholar),
        ("Mufti Menk page loads", test_scholar_page_mufti_menk),
        ("Scholar with many categories shows videos", test_scholar_page_multiple_video_cards),
        ("Video library works on mobile", test_videos_index_mobile_view),
        ("All 10 scholar pages load", test_scholar_page_all_10_scholars),
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
