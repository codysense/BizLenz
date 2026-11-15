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
    ("03_pos_sales_history", "/pos/sales"),
    ("04_inventory_items", "/inventory/items"),
    ("05_inventory_boms", "/inventory/boms"),
    ("06_inventory_locations", "/inventory/locations"),
    ("07_inventory_valuation", "/inventory/valuation"),
    ("08_inventory_ledger", "/inventory/ledger"),
    ("09_production_orders", "/production/orders"),
    ("10_production_wip", "/production/wip"),
    ("11_sales_orders", "/sales/orders"),
    ("12_sales_customers", "/sales/customers"),
    ("13_purchases_orders", "/purchases/orders"),
    ("14_purchases_vendors", "/purchases/vendors"),
    ("15_memos", "/purchases/memos"),
    ("16_journals", "/journals"),
    ("17_stock_adjustments", "/stock-adjustments"),
    ("18_fixed_assets", "/assets"),
    ("19_asset_register", "/assets/register"),
    ("20_cashbook", "/cash/cashbook"),
    ("21_customer_payments", "/cash/customer-payments"),
    ("22_vendor_payments", "/cash/vendor-payments"),
    ("23_chart_of_accounts", "/management/chart-of-accounts"),
    ("24_approval_flows", "/management/approval-flows"),
    ("25_role_management", "/management/roles"),
    ("26_reports", "/reports"),
]

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    # Pre-inject auth into localStorage
    page.add_init_script(f"""
        localStorage.setItem('auth-storage', {json.dumps(json.dumps(auth_storage))});
    """)

    for slug, path in pages:
        url = f"http://127.0.0.1:8085{path}"
        try:
            print(f"Capturing {slug} ({url})...")
            page.goto(url, wait_until="networkidle", timeout=10000)
        except Exception:
            page.wait_for_timeout(2000)
        
        page.wait_for_timeout(1000)
        shot_path = os.path.join(output_dir, f"{slug}.png")
        page.screenshot(path=shot_path)
        print(f"  Saved -> {shot_path}")

    browser.close()
    print("ALL SNAPSHOTS CAPTURED!")
