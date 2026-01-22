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

    # Navigate to Root
    page.goto("http://localhost:8000/")

    # Wait for page to load (look for "r3L-f")
    expect(page.get_by_text("r3L-f BETA")).to_be_visible(timeout=10000)

    # Open Menu
    # The menu button title="Menu" or aria-label="Open menu"
    page.get_by_label("Open menu").click()

    # Click Global Chat
    page.get_by_role("button", name="Global Chat").click()

    # Verify Empty State
    expect(page.get_by_text("Frequency Silent")).to_be_visible()
    expect(page.get_by_text("Be the first to broadcast")).to_be_visible()

    # Verify Buttons have ARIA labels
    expect(page.get_by_role("button", name="Toggle emoji picker")).to_be_visible()
    expect(page.get_by_role("button", name="Send message")).to_be_visible()

    # Verify Room button has aria-pressed
    global_room_btn = page.get_by_role("button", name="Global")
    expect(global_room_btn).to_have_attribute("aria-pressed", "true")

    # Verify Focus State on Input
    # Click the input to focus it
    input_field = page.get_by_placeholder("Message #global")
    input_field.click()

    # Wait a bit for transition
    page.wait_for_timeout(500)

    # Take screenshot
    page.screenshot(path="verification/chat_verification.png")
    print("Verification screenshot saved to verification/chat_verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            run(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
