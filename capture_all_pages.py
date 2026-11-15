import sys
import os
import json
import time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

output_dir = r"c:\Users\workspace\BizLenz\ad_assets\screenshots"
os.makedirs(output_dir, exist_ok=True)

auth_state = {
    "auth-storage": json.dumps({
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
    })
}

pages_to_capture = [
    ("01_dashboard", "/"),
    ("02_pos_terminal", "/pos"),
    ("03_pos_sales", "/pos/sales"),
    ("04_inventory_items", "/inventory/items"),
    ("05_inventory_boms", "/inventory/boms"),
    ("06_inventory_transfers", "/inventory/transfers"),
    ("07_inventory_valuation", "/inventory/valuation"),
    ("08_inventory_locations", "/inventory/locations"),
    ("09_production_orders", "/production/orders"),
    ("10_production_wip", "/production/wip"),
    ("11_sales_orders", "/sales/orders"),
    ("12_sales_customers", "/sales/customers"),
    ("13_purchase_orders", "/purchases/orders"),
    ("14_purchase_vendors", "/purchases/vendors"),
    ("15_purchase_memos", "/purchases/memos"),
    ("16_journals", "/journals"),
    ("17_fixed_assets", "/assets"),
    ("18_asset_register", "/assets/register"),
    ("19_cashbook", "/cash/cashbook"),
    ("20_customer_payments", "/cash/customer-payments"),
    ("21_vendor_payments", "/cash/vendor-payments"),
    ("22_chart_of_accounts", "/management/chart-of-accounts"),
    ("23_approval_flows", "/management/approval-flows"),
    ("24_role_management", "/management/roles"),
    ("25_reports", "/reports"),
]

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    # Pre-inject auth into localStorage
    page.add_init_script(f"""
        localStorage.setItem('auth-storage', {json.dumps(auth_state['auth-storage'])});
    """)

    print("Navigating to home page with authenticated session...")
    page.goto("https://bizlens.netlify.app/", timeout=60000)
    page.wait_for_timeout(4000)

    for slug, path in pages_to_capture:
        try:
            url = f"https://bizlens.netlify.app{path}"
            print(f"Navigating to {slug}: {url}")
            page.goto(url, timeout=30000)
            page.wait_for_timeout(3500)
            
            shot_file = os.path.join(output_dir, f"{slug}.png")
            page.screenshot(path=shot_file)
            print(f"  Saved -> {shot_file}")
        except Exception as err:
            print(f"  Error on {slug}: {err}")

    browser.close()
    print("Capture run complete.")
