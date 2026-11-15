import sys
import json
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page()

    def on_request(req):
        if "api" in req.url or "auth" in req.url or "login" in req.url:
            print(f"[REQ] {req.method} {req.url}")
            if req.post_data:
                print(f"      Data: {req.post_data}")

    def on_response(res):
        if "api" in res.url or "auth" in res.url or "login" in res.url:
            print(f"[RES] {res.status} {res.url}")
            try:
                print(f"      Body: {res.text()[:200]}")
            except:
                pass

    page.on("request", on_request)
    page.on("response", on_response)
    page.on("console", lambda m: print(f"[CONSOLE] {m.text}"))

    print("Loading login page...")
    page.goto("https://bizlens.netlify.app/login", wait_until="load", timeout=45000)
    
    print("Filling form...")
    page.locator('input[type="email"]').fill("gm@company.com")
    page.locator('input[type="password"]').fill("D3mo@0001")

    print("Clicking submit...")
    page.locator('button[type="submit"]').click()

    page.wait_for_timeout(6000)

    print("Current URL:", page.url)
    browser.close()
