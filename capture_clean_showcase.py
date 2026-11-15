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
        "accessToken": "mock_jwt_token",
        "refreshToken": "mock_refresh_token",
        "isAuthenticated": True
    },
    "version": 0
}

showcase_pages = [
    ("01_executive_dashboard", "/", "Financial & Executive Intelligence"),
    ("02_retail_pos", "/pos", "Retail POS Command Center"),
    ("03_pos_sales_history", "/pos/sales", "POS Sales & Shift Audit"),
    ("04_inventory_items", "/inventory/items", "Multi-Warehouse Inventory & UOM"),
    ("05_bill_of_materials", "/inventory/boms", "Standard Formulation Recipes & BOM"),
    ("06_production_orders", "/production/orders", "Work Orders & Batch Cost Allocation"),
    ("07_sales_receivables", "/sales/orders", "Sales Distribution & AR Credit Control"),
    ("08_procurement_payables", "/purchases/orders", "Purchase Orders & Vendor Payables"),
    ("09_fixed_asset_register", "/assets/register", "Asset Tagging & Automated Depreciation"),
    ("10_cashbook_treasury", "/cash/cashbook", "Multi-Bank Cashbook & Treasury Flow"),
    ("11_chart_of_accounts", "/management/chart-of-accounts", "IFRS-Compliant Double-Entry General Ledger"),
    ("12_financial_reports", "/reports", "Instant Financial Statements (P&L, Balance Sheet, Cash Flow)")
]

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    # Pre-inject auth into localStorage
    page.add_init_script(f"""
        localStorage.setItem('auth-storage', {json.dumps(json.dumps(auth_storage))});
    """)

    for filename, path, title in showcase_pages:
        url = f"http://127.0.0.1:8085{path}"
        print(f"Capturing: {title} ({url})...")
        page.goto(url, wait_until="networkidle", timeout=15000)
        
        # Inject CSS to hide toasts if any
        page.add_style_tag(content="""
            .toaster, [role="status"], [role="alert"] {
                display: none !important;
            }
        """)

        page.wait_for_timeout(2000)
        shot_path = os.path.join(output_dir, f"{filename}.png")
        page.screenshot(path=shot_path)
        print(f"  Saved -> {shot_path}")

    browser.close()
    print("ALL CLEAN SHOWCASE SNAPSHOTS CAPTURED!")
