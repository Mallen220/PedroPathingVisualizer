from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        page.goto("http://localhost:3000")

        # Wait for app to load - wait for settings button
        page.wait_for_selector("#settings-btn", timeout=20000)

        # Kill onboarding tutorial
        page.evaluate("""
            const overlay = document.querySelector('.driver-overlay');
            if (overlay) overlay.remove();
            const popover = document.querySelector('.driver-popover');
            if (popover) popover.remove();
            document.body.classList.remove('driver-active', 'driver-fade');
        """)
        page.wait_for_timeout(500)

        # Open Settings using button
        page.click("#settings-btn", force=True)

        # Wait for settings dialog
        page.wait_for_selector("h2:has-text('Settings')", timeout=5000)

        # Take screenshot of settings open
        page.screenshot(path="verification_settings_open.png")

        # Find and click "Interface Settings" to expand
        page.get_by_role("button", name="Interface Settings").click(force=True)

        # Wait for Program Font Size slider
        page.wait_for_selector("text=Program Font Size", timeout=2000)

        # Take screenshot of default state
        page.screenshot(path="verification_default.png")

        # Change font size to 150%
        slider = page.locator("input#program-font-size")
        slider.fill("150")

        # Wait a bit for reactivity
        page.wait_for_timeout(1000)

        # Verify font size change in DOM
        font_size = page.evaluate("document.documentElement.style.fontSize")
        print(f"Font size: {font_size}")
        if font_size == "150%":
             print("Font size updated correctly in DOM")
        else:
             print(f"Font size NOT updated correctly. Expected 150%, got {font_size}")

        # Take screenshot of enlarged state
        page.screenshot(path="verification_enlarged.png")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
