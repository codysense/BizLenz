import sys
import os
import json
import time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

output_dir = r"c:\Users\workspace\BizLenz\ad_assets\screenshots"
os.makedirs(output_dir, exist_ok=True)

auth_storage = {
    "state": {
        "user": {
            "id": "cmvxpwloy0006rywqxxwysoi8",
            "email": "gm@company.com",
            "name": "General Manager",
            "roles": ["General Manager"],
            "permissions": []
        },
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbXZ4cHdsb3kwMDA2cnl3cXh4d3lzb2k4IiwiZW1haWwiOiJnbUBjb21wYW55LmNvbSIsInNlc3Npb25Ub2tlbiI6Ijc0MjUzOWJjOGY3ODYzNDc0OTIyYzE3NDVkYjM4MTBjNWUzYzIxMDc5OTlhNGJhYzNjY2Q1YTUzYzYwMzk3MTYiLCJpYXQiOjE3OTM2MzQxMjcsImV4cCI6MTc5MzY3NzMyN30.2pzvDkIZeYZxU_lXOzM7uqkoLlFeX_6Oc7eX477Ow8k",
        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbXZ4cHdsb3kwMDA2cnl3cXh4d3lzb2k4IiwiaWF0IjoxNzkzNjM0MTI3LCJleHAiOjE4NTU4NDIxMjd9.bOlK4_64HmpHdy7urlo829BUjjDt-r0iJf4KYMu5jno",
        "isAuthenticated": True
    },
    "version": 0
}

pages = [
    ("01_dashboard", "/"),
    ("02_pos_terminal", "/pos"),
    ("03_inventory_items", "/inventory/items"),
    ("04_inventory_boms", "/inventory/boms"),
    ("05_production_orders", "/production/orders"),
    ("06_sales_orders", "/sales/orders"),
    ("07_purchase_orders", "/purchases/orders"),
    ("08_assets_register", "/assets/register"),
    ("09_cashbook", "/cash/cashbook"),
    ("10_chart_of_accounts", "/management/chart-of-accounts"),
    ("11_approval_flows", "/management/approval-flows"),
    ("12_reports", "/reports"),
]

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    # Pre-populate localStorage for domain
    page.add_init_script(f"""
        window.localStorage.setItem('auth-storage', JSON.stringify({json.dumps(auth_storage)}));
    """)

    for slug, path in pages:
        url = f"https://bizlens.netlify.app{path}"
        print(f"Loading {slug} ({url})...")
        try:
            page.goto(url, wait_until="commit", timeout=45000)
            page.wait_for_timeout(4000) # wait for React render + API
            shot_file = os.path.join(output_dir, f"{slug}.png")
            page.screenshot(path=shot_file)
            print(f"  OK: {shot_file}")
        except Exception as e:
            print(f"  Failed {slug}: {e}")

    browser.close()
    print("Done!")
