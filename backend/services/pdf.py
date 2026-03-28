"""PDF generation via headless Chromium (Playwright).

Renders a self-contained HTML document in Chromium and prints to PDF,
producing output identical to what the browser displays.
"""

from playwright.async_api import async_playwright


async def render_pdf(html: str) -> bytes:
    """Render HTML to PDF bytes using headless Chromium."""
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        try:
            page = await browser.new_page()
            await page.set_content(html, wait_until="load")
            pdf_bytes = await page.pdf(
                format="Letter",
                print_background=True,
            )
            await page.close()
        finally:
            await browser.close()
    return pdf_bytes
