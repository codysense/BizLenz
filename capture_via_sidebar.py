import sys
import os
import time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
output_dir = r"c:\Users\workspace\BizLenz\ad_assets\screenshots"
os.makedirs(output_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    print("Navigating to BizLens root...")
    page.goto("https://bizlens.netlify.app/", timeout=90000)
    page.wait_for_selector('input[type="email"]', timeout=60000)

    print("Logging in...")
    page.locator('input[type="email"]').fill("gm@company.com")
    page.locator('input[type="password"]').fill("D3mo@0001")
    page.locator('button[type="submit"]').click()

    page.wait_for_selector('text=Dashboard Overview', timeout=45000)
    print("Logged in!")
    page.wait_for_timeout(2000)
    page.screenshot(path=os.path.join(output_dir, "01_dashboard.png"))

    # Test clicking "Point of Sales"
    print("Clicking Point of Sales in sidebar...")
    pos_btn = page.locator('button, a').filter(has_text="Point of Sales").first
    pos_btn.click()
    page.wait_for_timeout(1000)

    # Click "POS Terminal"
    print("Clicking POS Terminal...")
    pos_term = page.locator('a[href="/pos"]').first
    pos_term.click()
    page.wait_for_timeout(2000)
    page.screenshot(path=os.path.join(output_dir, "02_pos_terminal.png"))
    print("Captured 02_pos_terminal.png")

    # Click "Stock"
    print("Clicking Stock in sidebar...")
    stock_btn = page.locator('button, a').filter(has_text="Stock").first
    stock_btn.click()
    page.wait_for_timeout(1000)

    # Click "Items"
    print("Clicking Items...")
    items_link = page.locator('a[href="/inventory/items"]').first
    items_link.click()
    page.wait_for_timeout(2000)
    page.screenshot(path=os.path.join(output_dir, "03_inventory_items.png"))
    print("Captured 03_inventory_items.png")

    # Click "BOMs"
    print("Clicking BOMs...")
    boms_link = page.locator('a[href="/inventory/boms"]').first
    boms_link.click()
    page.wait_for_timeout(2000)
    page.screenshot(path=os.path.join(output_dir, "04_inventory_boms.png"))
    print("Captured 04_inventory_boms.png")

    # Click "Manufacturing"
    print("Clicking Manufacturing...")
    mfg_btn = page.locator('button, a').filter(has_text="Manufacturing").first
    mfg_btn.click()
    page.wait_for_timeout(1000)

    # Click "Production Orders"
    prod_link = page.locator('a[href="/production/orders"]').first
    prod_link.click()
    page.wait_for_timeout(2000)
    page.screenshot(path=os.path.join(output_dir, "05_production_orders.png"))
    print("Captured 05_production_orders.png")

    # Click "Purchases"
    purch_btn = page.locator('button, a').filter(has_text="Purchases").first
    purch_btn.click()
    page.wait_for_timeout(1000)
    po_link = page.locator('a[href="/purchases/orders"]').first
    po_link.click()
    page.wait_for_timeout(2000)
    page.screenshot(path=os.path.join(output_dir, "06_purchases_orders.png"))
    print("Captured 06_purchases_orders.png")

    # Click "Sales"
    sales_btn = page.locator('button, a').filter(has_text="Sales").first
    sales_btn.click()
    page.wait_for_timeout(1000)
    so_link = page.locator('a[href="/sales/orders"]').first
    so_link.click()
    page.wait_for_timeout(2000)
    page.screenshot(path=os.path.join(output_dir, "07_sales_orders.png"))
    print("Captured 07_sales_orders.png")

    # Click "Assets"
    asset_btn = page.locator('button, a').filter(has_text="Assets").first
    asset_btn.click()
    page.wait_for_timeout(1000)
    asset_link = page.locator('a[href="/assets/register"]').first
    asset_link.click()
    page.wait_for_timeout(2000)
    page.screenshot(path=os.path.join(output_dir, "08_asset_register.png"))
    print("Captured 08_asset_register.png")

    # Click "Cash Management"
    cash_btn = page.locator('button, a').filter(has_text="Cash Management").first
    cash_btn.click()
    page.wait_for_timeout(1000)
    cash_link = page.locator('a[href="/cash/cashbook"]').first
    cash_link.click()
    page.wait_for_timeout(2000)
    page.screenshot(path=os.path.join(output_dir, "09_cashbook.png"))
    print("Captured 09_cashbook.png")

    # Click "Management"
    mgmt_btn = page.locator('button, a').filter(has_text="Management").first
    mgmt_btn.click()
    page.wait_for_timeout(1000)
    coa_link = page.locator('a[href="/management/chart-of-accounts"]').first
    coa_link.click()
    page.wait_for_timeout(2000)
    page.screenshot(path=os.path.join(output_dir, "10_chart_of_accounts.png"))
    print("Captured 10_chart_of_accounts.png")

    # Click "Reports"
    reports_link = page.locator('a[href="/reports"]').first
    reports_link.click()
    page.wait_for_timeout(3000)
    page.screenshot(path=os.path.join(output_dir, "11_financial_reports.png"))
    print("Captured 11_financial_reports.png")

    browser.close()
    print("All captures completed successfully!")
