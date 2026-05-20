import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(service_workers="block")
    page = context.new_page()

    # Log console messages
    page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Browser error: {err}"))

    # Mock API endpoints using wildcards to ensure they match
    page.route("**/api/users/me", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"user": {"id": 1, "username": "palette_tester", "email": "test@example.com", "created_at": "2024-01-01T00:00:00Z", "avatar_url": null}}'
    ))

    page.route("**/api/customization", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"theme_preferences": {"mistDensity": 0.5, "navOpacity": 0.8}, "node_primary_color": "#00ff00"}'
    ))

    page.route("**/api/notifications/unread", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"count": 0}'
    ))

    page.route("**/api/relationships", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"mutual": [], "asym_in": [], "asym_out": [], "drift_users": [], "drift_files": []}'
    ))

    page.route("**/api/files", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"files": []}'
    ))

    page.route("**/api/collections", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"collections": []}'
    ))

    page.route("**/api/drift", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"files": [], "users": []}'
    ))

    page.route("**/api/do-websocket", lambda route: route.fulfill(
        status=404,
    ))

    # Search with no results
    page.route("**/api/users/search?q=MissingSignal", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"users": []}'
    ))

    print("Navigating to app...")
    page.goto("http://localhost:3000")

    print("Waiting for search placeholder...")
    try:
        page.wait_for_selector('input[placeholder="Search..."]', timeout=10000)
    except Exception as e:
        print(f"Failed to find search input: {e}")
        page.screenshot(path="verification_search_fail_5.png")
        if page.is_visible("text=RESUME BROADCAST"):
            print("Stuck on Login screen.")
        elif page.is_visible("text=Establishing Uplink..."):
             print("Stuck on Loading screen.")
        raise e

    print("Found search input, typing...")
    # Open search
    page.get_by_placeholder("Search...").fill("MissingSignal")

    # Wait for results modal
    print("Waiting for results modal...")
    page.wait_for_selector(".glass-panel")

    # Wait a bit for the empty state to render
    time.sleep(1)

    # Take screenshot of the empty state
    print("Taking screenshot...")
    page.screenshot(path="verification_search_empty.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
