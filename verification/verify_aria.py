
import asyncio
from playwright.async_api import async_playwright, expect

async def verify_aria_labels():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to the preview URL (adjust port if necessary)
        try:
            await page.goto("http://localhost:4173")
            await page.wait_for_load_state("networkidle")
        except Exception as e:
            print(f"Failed to load page: {e}")
            await browser.close()
            return

        print("Page loaded.")

        # Check Navbar ARIA labels
        print("Checking Navbar ARIA labels...")

        # File Manager Button
        await expect(page.get_by_label("Open File Manager")).to_be_visible()
        print("✓ File Manager button has correct label")

        # Grid/Snap/Ruler toggles
        await expect(page.get_by_label("Toggle Grid")).to_be_visible()
        print("✓ Grid toggle has correct label")

        await expect(page.get_by_label("Toggle Ruler")).to_be_visible()
        print("✓ Ruler toggle has correct label")

        # Open File Manager to check its labels
        print("Opening File Manager...")
        await page.get_by_label("Open File Manager").click()

        # Wait for file manager to open by using a more specific selector
        # There was a strict mode violation because the backdrop also had a role="button"
        # We target the actual Close button inside the panel
        await expect(page.locator("button[title='Close']")).to_be_visible()

        print("Checking File Manager ARIA labels...")

        # Sort buttons - check pressed state
        name_sort = page.get_by_role("button", name="Name")
        recent_sort = page.get_by_role("button", name="Recent")

        await expect(name_sort).to_be_visible()
        await expect(recent_sort).to_be_visible()

        # Check initial state (default is Name)
        is_pressed = await name_sort.get_attribute("aria-pressed")
        print(f"Name sort aria-pressed: {is_pressed}")

        # Toggle sort
        await recent_sort.click()
        is_pressed_recent = await recent_sort.get_attribute("aria-pressed")
        print(f"Recent sort aria-pressed after click: {is_pressed_recent}")

        # Take a screenshot of the File Manager with accessible elements
        await page.screenshot(path="verification/aria_verification.png")
        print("Screenshot taken at verification/aria_verification.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_aria_labels())
