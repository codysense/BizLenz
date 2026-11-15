import os
import sys
import time
from playwright.sync_api import sync_playwright

output_dir = r"c:\Users\workspace\BizLenz\ad_assets\screenshots"
os.makedirs(output_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    print("Navigating to https://bizlens.netlify.app/ ...")
    page.goto("https://bizlens.netlify.app/", wait_until="networkidle", timeout=60000)
    page.screenshot(path=os.path.join(output_dir, "00_login_page.png"))
    print("Login page screenshot captured.")

    # Try to find input fields for email/username and password
    print("Attempting login...")
    # Find inputs
    email_input = page.locator('input[type="email"], input[name="email"], input[name="username"], input[placeholder*="email" i], input[placeholder*="username" i]').first
    pass_input = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first

    if email_input.is_visible():
        email_input.fill("gm@company.com")
        pass_input.fill("D3mo@0001")
        submit_btn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Log in")').first
        submit_btn.click()
        print("Clicked submit button.")
        page.wait_for_timeout(5000)
        page.wait_for_load_state("networkidle")
    else:
        print("Could not find standard email input, dumping page content or buttons:")
        buttons = page.locator('button').all_inner_texts()
        print("Buttons:", buttons)

    print("Current URL after login attempt:", page.url)
    page.screenshot(path=os.path.join(output_dir, "01_dashboard.png"))

    # Let's inspect nav links / sidebar items
    links = page.locator('nav a, aside a, [role="navigation"] a, button, a').all()
    print(f"Total clickable items found: {len(links)}")
    
    # Save page title
    print("Page title:", page.title())

    browser.close()
    print("Initial check completed.")
