from playwright.sync_api import sync_playwright
import time

def verify_history_panel():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Setup localStorage to skip tutorial
        page.add_init_script("""
            localStorage.setItem('pedro-settings', JSON.stringify({
                version: '1.0.0',
                settings: {
                    hasSeenOnboarding: true,
                    lastSeenVersion: '1.7.0'
                },
                lastUpdated: new Date().toISOString()
            }));
        """)

        try:
            page.goto("http://localhost:5173", timeout=30000)
        except Exception as e:
            print(f"Failed to load page: {e}")
            return

        # Wait for app to load
        try:
            page.wait_for_selector("text=Pedro Pathing Visualizer", timeout=10000)
        except:
            print("Timeout waiting for title")
            page.screenshot(path="debug_timeout.png")
            return

        print("App loaded")

        # Double check for tutorial overlay just in case
        try:
            page.keyboard.press("Escape")
            time.sleep(0.5)
        except:
            pass

        # Perform actions
        print("Clicking Add Path...")
        try:
            # Need to wait for rendering
            time.sleep(1)
            page.get_by_role("button", name="Add Path after start").click()
            time.sleep(0.5)
            print("Clicking Add Wait...")
            page.get_by_role("button", name="Add Wait after start").click()
            time.sleep(0.5)
        except Exception as e:
            print(f"Failed to click buttons: {e}")
            page.screenshot(path="debug_click_fail.png")

        # Open History Dropdown
        print("Opening History Dropdown...")
        try:
            page.get_by_role("button", name="History").click()
            time.sleep(1) # Wait for dropdown animation
        except Exception as e:
            print(f"Failed to open history dropdown: {e}")
            page.screenshot(path="debug_dropdown_fail.png")
            return

        # Take screenshot
        page.screenshot(path="verification_history.png")
        print("Screenshot taken: verification_history.png")

        browser.close()

if __name__ == "__main__":
    verify_history_panel()
