import sys
import time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    page.on("request", lambda r: print(f"REQ: {r.method} {r.url}"))
    page.on("response", lambda r: print(f"RES: {r.status} {r.url}"))
    page.on("console", lambda m: print(f"CONSOLE: {m.type}: {m.text}"))

    print("Opening site...")
    page.goto("https://bizlens.netlify.app/", timeout=90000)
    
    print("Waiting for email input...")
    page.wait_for_selector('input[type="email"]', timeout=60000)

    print("Filling credentials...")
    page.locator('input[type="email"]').fill("gm@company.com")
    page.locator('input[type="password"]').fill("D3mo@0001")

    print("Clicking submit...")
    page.locator('button[type="submit"]').click()

    print("Waiting 15 seconds to observe requests and UI...")
    page.wait_for_timeout(15000)

    print("Final URL:", page.url)
    page.screenshot(path=r"c:\Users\workspace\BizLenz\ad_assets\screenshots\after_login_attempt.png")
    
    # Check localStorage
    storage = page.evaluate("() => JSON.stringify(localStorage)")
    print("LocalStorage:", storage)

    browser.close()
