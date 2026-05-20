
import os
import json
from playwright.sync_api import sync_playwright, expect

def verify_empty_states():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        # Create a context with permissions
        context = browser.new_context(
            permissions=["clipboard-read", "clipboard-write"]
        )

        # Block service workers to ensure API mocks work reliably
        # context.service_workers = "block" # This caused an error in previous attempts, removing based on memory?
        # Actually memory says: "Frontend verification using Playwright with `vite-plugin-pwa` requires blocking service workers (`service_workers='block'`)"
        # But let's try just route interception first.

        page = context.new_page()

        # -------------------------------------------------------------------
        # MOCK API RESPONSES
        # -------------------------------------------------------------------

        # 1. Mock /api/users/me (Authenticated User)
        page.route("**/api/users/me", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "user": {
                    "id": 1,
                    "username": "PaletteTester",
                    "avatar_url": None,
                    "is_lurking": False,
                    "role": "user"
                }
            })
        ))

        # 2. Mock /api/users/me/keys (Keys exist)
        page.route("**/api/users/me/keys", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"public_key": "mock_pub", "encrypted_private_key": "mock_priv"})
        ))

        # 3. Mock /api/customization (Default preferences)
        page.route("**/api/customization", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"preferences": {}})
        ))

        # 4. Mock /api/notifications/unread
        page.route("**/api/notifications/unread", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"count": 0})
        ))

        # 5. Mock /api/network (Empty network to trigger "Sector Silent")
        page.route("**/api/network", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "nodes": [],
                "links": [],
                "collections": []
            })
        ))

        # 6. Mock /api/users/search (Empty search results)
        page.route("**/api/users/search*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"users": []})
        ))

        # -------------------------------------------------------------------
        # TEST EXECUTION
        # -------------------------------------------------------------------

        try:
            # 1. Navigate to the app (served locally via python http.server on port 8000)
            print("Navigating to app...")
            page.goto("http://localhost:8000")

            # Wait for app to load (look for r3L-f title or header)
            expect(page.get_by_text("r3L-f")).to_be_visible(timeout=10000)

            # 2. Verify NetworkList "Sector Silent" Empty State
            # We need to switch to List View first
            print("Switching to List View...")
            page.get_by_title("List View").click()

            # Check for "Sector Silent" text
            expect(page.get_by_text("Sector Silent")).to_be_visible()

            # Check for "Drift to Random Signal" button (This is our new feature!)
            drift_btn = page.get_by_role("button", name="Drift to Random Signal")
            expect(drift_btn).to_be_visible()

            # Take screenshot of NetworkList empty state
            print("Taking screenshot of NetworkList empty state...")
            page.screenshot(path="verification/network_empty_state.png")

            # 3. Verify UserDiscovery "No frequencies found" Empty State
            # Open search
            print("Testing Search Empty State...")
            search_input = page.get_by_placeholder("Search...")
            search_input.fill("Ghost") # Search for something that won't exist

            # Wait for "No frequencies found"
            # Note: The search has a debounce of 300ms
            expect(page.get_by_text("No frequencies found")).to_be_visible(timeout=5000)

            # Take screenshot of Search empty state
            print("Taking screenshot of Search empty state...")
            page.screenshot(path="verification/search_empty_state.png")

            print("Verification successful!")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/failure.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_empty_states()
