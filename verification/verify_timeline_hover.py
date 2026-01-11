from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    try:
        page.goto("http://localhost:4173")
    except:
        print("Could not connect to localhost:4173.")
        return

    page.wait_for_load_state("networkidle")

    # Close dialogs
    dialog = page.locator('div[role="dialog"][aria-labelledby="whats-new-title"]')
    if dialog.count() > 0 and dialog.first.is_visible():
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)

    add_path_btn = page.get_by_role("button", name="Add Path")
    if add_path_btn.is_visible():
        try:
            add_path_btn.click()
        except:
             add_path_btn.click(force=True)
        page.wait_for_timeout(500)

    markers = page.locator('div[role="button"][aria-label]')

    if markers.count() > 0:
        first_marker = markers.first

        # 1. Verify Marker is visible (opacity 1)
        marker_opacity = first_marker.evaluate("el => window.getComputedStyle(el).opacity")
        print(f"Marker opacity: {marker_opacity}")
        if marker_opacity != "1":
             print("Error: Marker should be visible")

        # 2. Find tooltip inside
        tooltip = first_marker.locator("div").first

        # 3. Check Initial Tooltip Opacity
        tooltip_opacity = tooltip.evaluate("el => window.getComputedStyle(el).opacity")
        print(f"Initial tooltip opacity: {tooltip_opacity}")

        if tooltip_opacity != "0":
            print("Error: Tooltip should be hidden initially")
        else:
            print("Verified: Tooltip is hidden initially")

        # 4. Hover
        first_marker.hover(force=True)
        page.wait_for_timeout(300)

        tooltip_opacity_hover = tooltip.evaluate("el => window.getComputedStyle(el).opacity")
        print(f"Hover tooltip opacity: {tooltip_opacity_hover}")

        if tooltip_opacity_hover == "1":
             print("Verified: Tooltip is visible on hover")
        else:
             print("Error: Tooltip should be visible on hover")

        page.screenshot(path="verification/verification.png")

    else:
        print("No markers found")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
