from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    # Set viewport size to capture more detail
    page.set_viewport_size({"width": 1280, "height": 720})

    print("Navigating...")
    page.goto("http://localhost:4173/")

    # Wait for load
    page.wait_for_load_state("networkidle")

    # If onboarding modal is present, close it
    # Look for "What's New" or Tutorial
    try:
        if page.is_visible("text=What's New"):
            print("Closing What's New...")
            page.click("button[aria-label='Close']")
    except Exception as e:
        print(f"Note: {e}")

    try:
        if page.is_visible("text=Skip"):
            print("Skipping tutorial...")
            page.click("text=Skip")
    except Exception as e:
        print(f"Note: {e}")

    print("Opening Export menu...")
    # Find Export button. It usually has "Export" text.
    page.click("text=Export")

    print("Clicking Strategy Sheet...")
    page.click("text=Strategy Sheet")

    print("Waiting for dialog...")
    # Wait for the dialog title
    page.wait_for_selector("text=Strategy Sheet Preview")

    # Wait a bit for the SVG to clone and render
    page.wait_for_timeout(1000)

    print("Taking screenshot...")
    page.screenshot(path="verification/strategy_sheet.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
