import sys
import os
import json
import time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
output_dir = r"c:\Users\workspace\BizLenz\ad_assets\clean_screenshots"
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
        "accessToken": "mock_jwt_token",
        "refreshToken": "mock_refresh_token",
        "isAuthenticated": True
    },
    "version": 0
}

pages = [
    ("00_login_screen", "/login", "BizLens - Control Everything, Miss Nothing"),
    ("01_executive_dashboard", "/", "Executive Financial & Operational Intelligence"),
    ("02_retail_pos", "/pos", "Retail POS Command Center & Shift Controls"),
    ("03_pos_sales_history", "/pos/sales", "POS Sales & Shift Audit Trails"),
    ("04_inventory_items", "/inventory/items", "Multi-Warehouse Inventory & UOM Conversions"),
    ("05_bill_of_materials", "/inventory/boms", "Standard Formulation Recipes & Batch Costing"),
    ("06_production_orders", "/production/orders", "Work Orders & Factory Overhead Allocation"),
    ("07_production_wip", "/production/wip", "Work-In-Progress (WIP) Tracking"),
    ("08_sales_distribution", "/sales/orders", "Sales Distribution & AR Credit Control"),
    ("09_procurement_payables", "/purchases/orders", "Automated Purchase Orders & 3-Way Matching"),
    ("10_fixed_assets", "/assets", "Fixed Asset Register & Automated Depreciation"),
    ("11_cashbook_treasury", "/cash/cashbook", "4-Eye Fraud Prevention & Multi-Bank Cashbook"),
    ("12_chart_of_accounts", "/management/chart-of-accounts", "IFRS Double-Entry Chart of Accounts"),
    ("13_financial_reports", "/reports", "Real-Time IFRS Balance Sheet, P&L & Cash Flow")
]

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    page.add_init_script(f"""
        localStorage.setItem('auth-storage', {json.dumps(json.dumps(auth_storage))});
    """)

    for filename, path, title in pages:
        url = f"http://127.0.0.1:8085{path}"
        print(f"Loading {title} ({url})...")
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(1800)
            
            # Clean toasts completely
            page.evaluate("""() => {
                const toasts = document.querySelectorAll('div[role="status"], div[role="alert"], [class*="toaster"]');
                toasts.forEach(t => t.remove());
                document.querySelectorAll('body > div').forEach(el => {
                    if (el.innerText && el.innerText.includes('Unexpected token')) {
                        el.remove();
                    }
                });
            }""")
            
            page.wait_for_timeout(300)
            shot_file = os.path.join(output_dir, f"{filename}.png")
            page.screenshot(path=shot_file)
            print(f"  Spotless snapshot -> {shot_file}")
        except Exception as err:
            print(f"  Error on {filename}: {err}")

    browser.close()
    print("ALL SPOTLESS SHOWCASE SNAPSHOTS CAPTURED!")
