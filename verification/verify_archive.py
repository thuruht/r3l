import time
from playwright.sync_api import sync_playwright, expect

def run(page):
    # 1. Mock API responses
    # Mock User (Auto-login)
    page.route("**/api/users/me", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"user": {"id": 1, "username": "Palette", "avatar_url": null}}'
    ))

    # Mock Customization (Prevent crash)
    page.route("**/api/customization", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{}'
    ))

    # Mock Notifications (Prevent crash)
    page.route("**/api/notifications/unread", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"count": 0}'
    ))

    # Mock Network Data (Prevent crash)
    page.route("**/api/relationships", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='[]'
    ))
    page.route("**/api/collections", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"collections": []}'
    ))
    page.route("**/api/drift", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"users": [], "files": []}'
    ))

    # Mock Archive Files (Empty State)
    # We can add a delay to see the skeleton if we wanted, but for snapshot, we want the final state.
    page.route("**/api/files/community-archived", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"files": []}'
    ))

    # 2. Navigate to app
    print("Navigating to app...")
    page.goto("http://localhost:5173/")

    # 3. Wait for login state
    print("Waiting for login...")
    expect(page.get_by_text("r3L-f BETA")).to_be_visible(timeout=10000)

    # 4. Open Menu
    print("Opening menu...")
    page.get_by_role("button", name="Open menu").click()

    # 5. Open Community Archive
    print("Opening Archive...")
    page.get_by_role("button", name="Community Archive").click()

    # 6. Verify Modal Content
    print("Verifying modal...")
    expect(page.get_by_text("Community Archive")).to_be_visible()

    # Check for new Empty State
    expect(page.get_by_text("No Artifacts Preserved")).to_be_visible()
    expect(page.get_by_text("The archives are silent.")).to_be_visible()

    # Check for Accessible Close Button
    close_btn = page.get_by_role("button", name="Close archive")
    expect(close_btn).to_be_visible()

    # 7. Screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/archive_empty_state.png")
    print("Verification complete!")

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
