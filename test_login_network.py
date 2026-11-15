import sys
import time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page()

    page.on("request", lambda req: print(f"[REQ] {req.method} {req.url}"))
    page.on("response", lambda res: print(f"[RES] {res.status} {res.url}"))
    page.on("console", lambda m: print(f"[CONSOLE] {m.type}: {m.text}"))

    print("Navigating...")
    page.goto("https://bizlens.netlify.app/", wait_until="commit")
    page.wait_for_selector('input[type="email"]', timeout=15000)
    print("Page loaded. Filling inputs...")

    page.locator('input[type="email"]').fill("gm@company.com")
    page.locator('input[type="password"]').fill("D3mo@0001")

    print("Submitting...")
    page.locator('button[type="submit"]').click()

    page.wait_for_timeout(8000)

    # Check for any toast or alert on page
    toasts = page.locator('.toaster, [role="status"], [role="alert"], .hot-toast').all_inner_texts()
    print("Toasts/Alerts:", toasts)
    print("Final URL:", page.url)

    page.screenshot(path=r"c:\Users\workspace\BizLenz\ad_assets\screenshots\post_submit.png")
    browser.close()
