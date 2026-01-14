from playwright.sync_api import sync_playwright

def verify_settings():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8080")

        # Wait for app to load (checking title or main element)
        page.wait_for_selector("text=Pedro Pathing Visualizer")

        # Handle What's New dialog
        try:
            # Wait for dialog to appear
            dialog = page.wait_for_selector("div[role='dialog'][aria-labelledby='whats-new-title']", timeout=5000)
            if dialog.is_visible():
                print("What's New dialog found. Attempting to close.")
                # Try to find a button inside that says "Close" or has close icon
                # Looking at code: <button ...>Close</button> or similar?
                # Actually usually it's "Get Started" or "Close".
                # Pressing Escape is usually reliable if focus is right.
                page.keyboard.press("Escape")

                # Check if still visible
                page.wait_for_selector("div[role='dialog'][aria-labelledby='whats-new-title']", state="hidden", timeout=2000)
                print("Dialog closed.")
        except Exception as e:
            print(f"Dialog handling note: {e}")

        # Wait for loading screen to go away
        try:
            page.wait_for_selector("#loading-screen", state="hidden", timeout=5000)
        except:
            print("Loading screen didn't disappear?")

        # Click Settings button (it has aria-label="Settings")
        print("Clicking Settings button...")
        page.click('button[aria-label="Settings"]')

        # Wait for Settings dialog
        page.wait_for_selector("text=Settings")

        # Click "File & Saving" section to expand it
        # It has "File & Saving" text.
        print("Expanding File & Saving section...")
        page.click("text=File & Saving")

        # Check for Autosave Mode label
        page.wait_for_selector("text=Autosave Mode")

        # Check for Autosave Mode select
        mode_select = page.locator("select#autosave-mode")
        if not mode_select.is_visible():
            print("Autosave Mode select not visible")
            exit(1)

        # Select "Time Based"
        mode_select.select_option("time")

        # Check for Autosave Interval label (should appear now)
        page.wait_for_selector("text=Autosave Interval")

        # Check for Autosave Interval select
        interval_select = page.locator("select#autosave-interval")
        if not interval_select.is_visible():
            print("Autosave Interval select not visible")
            exit(1)

        # Take screenshot
        page.screenshot(path="verification_settings.png")
        print("Verification successful, screenshot saved.")

        browser.close()

if __name__ == "__main__":
    verify_settings()
