from playwright.sync_api import sync_playwright, Page, expect

def run(page: Page):
    # Mock API endpoints
    page.route("**/api/users/me", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"user": {"id": 1, "username": "TestUser", "avatar_url": null}}'
    ))
    page.route("**/api/customization", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"theme_preferences": {}}'
    ))
    page.route("**/api/notifications/unread", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"count": 0}'
    ))
    page.route("**/api/users/me/keys", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"public_key": "mock_key"}'
    ))

    # Mock /api/drift to prevent errors on main page
    page.route("**/api/drift*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"users": [], "files": []}'
    ))

    # Mock /api/files (used by NetworkData hook likely)
    page.route("**/api/files", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"files": []}'
    ))

    # Mock /api/collections
    page.route("**/api/collections", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"collections": []}'
    ))

    # Mock /api/relationships
    page.route("**/api/relationships", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[]'
    ))

    # Mock /api/files/community-archived
    page.route("**/api/files/community-archived", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"files": []}'
    ))

    # Navigate to Root
    page.goto("http://localhost:8000/")

    # Wait for page to load (look for "r3L-f")
    expect(page.get_by_text("r3L-f BETA")).to_be_visible(timeout=10000)

    # Open Menu
    # The menu button title="Menu" or aria-label="Open menu"
    page.get_by_label("Open menu").click()

    # Click Community Archive
    page.get_by_role("button", name="Community Archive").click()

    # Verify Empty State
    expect(page.get_by_text("No Artifacts Preserved")).to_be_visible()
    expect(page.get_by_text("The community has not yet elevated any signals to the permanent archive.")).to_be_visible()

    # Verify Close Button Accessibility
    close_btn = page.get_by_label("Close")
    expect(close_btn).to_be_visible()

    # Take screenshot
    page.screenshot(path="verification/archive_vote_verification.png")
    print("Verification screenshot saved to verification/archive_vote_verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            run(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/archive_vote_error.png")
        finally:
            browser.close()
