import sys
import os
import time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

os.makedirs(r"c:\Users\workspace\BizLenz\ad_assets\screenshots", exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page()

    page.on("console", lambda msg: print(f"CONSOLE: {msg.type}: {msg.text}"))
    page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

    page.goto("https://bizlens.netlify.app/login", wait_until="networkidle")
    
    email = page.locator('input[type="email"]')
    password = page.locator('input[type="password"]')

    email.fill("gm@company.com")
    password.fill("D3mo@0001")

    btn = page.locator('button[type="submit"]')
    btn.click()

    print("Waiting for response...")
    page.wait_for_timeout(7000)

    print("Post-login URL:", page.url)
    screenshot_path = r"c:\Users\workspace\BizLenz\ad_assets\screenshots\login_attempt_debug.png"
    page.screenshot(path=screenshot_path)
    print("Screenshot saved to", screenshot_path)

    body_text = page.locator("body").inner_text()
    with open(r"c:\Users\workspace\BizLenz\page_body.txt", "w", encoding="utf-8") as f:
        f.write(f"URL: {page.url}\n\n" + body_text)
    
    print("Page body written to page_body.txt")
    browser.close()
