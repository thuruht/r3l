from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Grant clipboard permissions for copy/paste testing if needed
        context = browser.new_context(permissions=['clipboard-read', 'clipboard-write'])

        # Block service workers to ensure API mocks work reliably
        context.route("**/*", lambda route: route.continue_() if "service-worker" not in route.request.url else route.abort())

        page = context.new_page()

        # Mock API responses to simulate authenticated state and data

        # 1. Mock /api/users/me (Authenticated User with Admin Role)
        page.route("**/api/users/me", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"user": {"id": 1, "username": "AdminUser", "avatar_url": null, "role": "admin", "is_lurking": 0}}'
        ))

        # 2. Mock /api/customization
        page.route("**/api/customization", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"theme_preferences": {}, "node_primary_color": "#10b981", "node_secondary_color": "#8b5cf6", "node_size": 10}'
        ))

        # 3. Mock /api/notifications/unread
        page.route("**/api/notifications/unread", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"count": 0}'
        ))

        # 4. Mock /api/relationships (Needed for graph and group chat)
        page.route("**/api/relationships", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"mutual": [{"user_id": 2, "username": "FriendUser", "avatar_url": null}], "outgoing": [], "incoming": []}'
        ))

        # 5. Mock /api/files (For upload modal/remix)
        page.route("**/api/files", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"files": []}'
        ))

        # 6. Mock /api/drift (For graph)
        page.route("**/api/drift", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"users": [], "files": []}'
        ))

        # 7. Mock /api/notifications (For Inbox)
        page.route("**/api/notifications", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"notifications": []}'
        ))

        # 8. Mock /api/messages/conversations (For Inbox)
        page.route("**/api/messages/conversations", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"conversations": []}'
        ))

        # 9. Mock /api/admin/stats (For Admin Dashboard)
        page.route("**/api/admin/stats", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"users": 10, "total_files": 50, "active_files": 45, "archived_files": 5}'
        ))

        # 10. Mock /api/admin/users
        page.route("**/api/admin/users", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"users": [{"id": 1, "username": "AdminUser", "role": "admin", "email": "admin@test.com", "created_at": "2023-01-01"}, {"id": 2, "username": "User2", "role": "user", "email": "user2@test.com", "created_at": "2023-01-02"}]}'
        ))

        # Load the app
        print("Navigating to app...")
        page.goto("http://localhost:8788")

        # Wait for initial load
        page.wait_for_timeout(2000)

        # Verify 1: Privacy Settings (Lurker Mode) in Customization
        print("Opening Customization Settings...")

        # Try to use force=True for click if interception is an issue, or locate the specific button better.
        # The logs say an SVG inside the button intercepts. force=True usually solves this.
        page.get_by_label("Customize Appearance").first.click(force=True)
        page.wait_for_timeout(500)

        # Check for Lurker Mode toggle
        lurker_toggle = page.locator("label:has-text('Lurker Mode')")
        if lurker_toggle.is_visible():
            print("Verified: Lurker Mode toggle is visible.")
        else:
            print("Error: Lurker Mode toggle not found.")

        # Check for Manage Keys button
        keys_btn = page.get_by_role("button", name="Manage Keys")
        if keys_btn.is_visible():
            print("Verified: Manage Keys button is visible.")
        else:
            print("Error: Manage Keys button not found.")

        page.screenshot(path="verification/1_privacy_settings.png")
        # Close customization
        page.get_by_label("Close settings").click(force=True)

        # Verify 2: Admin Dashboard & Roles
        print("Opening Admin Dashboard...")
        # Open main menu
        menu_btn = page.locator(".nav-trigger, [aria-label='Menu'], button:has-text('Menu')").first
        if menu_btn.is_visible():
            menu_btn.click()
            page.wait_for_timeout(500)

        admin_link = page.get_by_text("Admin Dashboard")
        if admin_link.is_visible():
            admin_link.click()
            page.wait_for_timeout(1000)

            # Switch to Users tab
            page.get_by_role("button", name="Users").click()
            page.wait_for_timeout(500)

            # Check for Role Select
            # We look for the select element inside the table
            role_select = page.locator("table select").first
            if role_select.is_visible():
                print("Verified: User Role select dropdown is visible.")
            else:
                print("Error: User Role select not found.")

            page.screenshot(path="verification/2_admin_roles.png")

            # Close Admin
            page.locator("button:has-text('Close'), [aria-label='Close']").first.click()
        else:
            print("Warning: Admin Dashboard link not found. Skipping Admin verification visual.")

        # Verify 3: Inbox Requests Tab
        print("Opening Inbox...")
        # Trigger Inbox (usually top right)
        page.locator("[aria-label='Inbox'], button:has-text('Inbox')").first.click()
        page.wait_for_timeout(500)

        # Check tabs
        if page.get_by_role("tab", name="Reqs").is_visible():
             print("Verified: Requests tab is visible in Inbox.")
        else:
             print("Error: Requests tab not found.")

        page.screenshot(path="verification/3_inbox_requests.png")
        # Close Inbox
        page.locator("[aria-label='Close']").first.click()

        browser.close()

if __name__ == "__main__":
    run_verification()
