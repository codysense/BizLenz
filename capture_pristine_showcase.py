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

def handle_routes(route):
    url = route.request.url
    
    # 1. Executive summary
    if "executive-summary" in url:
        data = {
            "netRevenue": 148250000,
            "salesReturns": 1850000,
            "netProfit": 42800000,
            "receivables": 14350000,
            "payables": 9120000,
            "cashFlow": 28500000,
            "grossSales": 150100000,
            "grossPurchases": 74500000,
            "purchaseReturns": 620000,
            "netPurchases": 73880000,
            "netSales": 148250000,
            "expenses": [
                {"category": "Raw Materials", "amount": 45000000},
                {"category": "Factory Overhead & Power", "amount": 16500000},
                {"category": "Direct Labor & Operations", "amount": 12800000},
                {"category": "Packaging & Logistics", "amount": 8900000},
                {"category": "Administrative & Compliance", "amount": 4200000}
            ],
            "monthlyComparison": [
                {"month": "Jul", "revenue": 115000000, "expenses": 78000000},
                {"month": "Aug", "revenue": 128000000, "expenses": 82000000},
                {"month": "Sep", "revenue": 139000000, "expenses": 89000000},
                {"month": "Oct", "revenue": 148250000, "expenses": 87400000}
            ]
        }
        route.fulfill(status=200, content_type="application/json", body=json.dumps(data))
    
    # 2. Top products
    elif "top-products" in url:
        data = [
            {"name": "Vitamin C 500mg Chewable (100s)", "revenue": 38400000, "quantity": 12800},
            {"name": "Paracetamol Suspension 120ml", "revenue": 29600000, "quantity": 24500},
            {"name": "Hi-Nutrient Industrial Premix 25kg", "revenue": 45100000, "quantity": 940},
            {"name": "Multivitamin Herbal Tonic 200ml", "revenue": 21800000, "quantity": 15200},
            {"name": "Amoxicillin Capsules 500mg", "revenue": 13350000, "quantity": 8900}
        ]
        route.fulfill(status=200, content_type="application/json", body=json.dumps(data))

    # 3. Top customers
    elif "top-customers" in url:
        data = [
            {"name": "MercyCareMed Wholesale Pharmacy", "revenue": 42500000, "ordersCount": 38},
            {"name": "Ashifau-li-Haqi Limited (Ibadan)", "revenue": 36800000, "ordersCount": 24},
            {"name": "PrimeHealth Distributors Lagos", "revenue": 28400000, "ordersCount": 19},
            {"name": "Evergreen Pharmaceuticals Abuja", "revenue": 22100000, "ordersCount": 15},
            {"name": "St. Jude Commercial Chemists", "revenue": 18450000, "ordersCount": 12}
        ]
        route.fulfill(status=200, content_type="application/json", body=json.dumps(data))

    # 4. Inventory Valuation
    elif "valuation" in url:
        data = {
            "totalValuation": 89450000,
            "totalItems": 142,
            "rawMaterialsValue": 52300000,
            "wipValue": 14850000,
            "finishedGoodsValue": 22300000
        }
        route.fulfill(status=200, content_type="application/json", body=json.dumps(data))

    # 5. Production Orders
    elif "production/orders" in url:
        data = {
            "orders": [
                {"id": "PO-2026-0041", "orderNo": "PRD-2026-0041", "bomName": "Vitamin C 500mg Batch Recipe #4", "plannedQuantity": 10000, "actualQuantity": 9950, "status": "COMPLETED", "startDate": "2026-10-25", "completionDate": "2026-10-28", "unitCost": 385.20},
                {"id": "PO-2026-0042", "orderNo": "PRD-2026-0042", "bomName": "Paracetamol Suspension 120ml", "plannedQuantity": 5000, "actualQuantity": 5000, "status": "IN_PROGRESS", "startDate": "2026-10-29", "completionDate": "2026-11-03", "unitCost": 620.00},
                {"id": "PO-2026-0043", "orderNo": "PRD-2026-0043", "bomName": "Hi-Nutrient Fortified Premix 25kg", "plannedQuantity": 400, "actualQuantity": 0, "status": "RELEASED", "startDate": "2026-11-01", "completionDate": "2026-11-05", "unitCost": 48000.00}
            ],
            "pagination": {"page": 1, "limit": 10, "total": 3, "pages": 1}
        }
        route.fulfill(status=200, content_type="application/json", body=json.dumps(data))

    # 6. Purchase Orders
    elif "purchase/orders" in url or "purchases" in url:
        data = {
            "purchases": [
                {"id": "PO-1092", "poNumber": "PO-2026-088", "vendor": {"name": "Dangote Sugar Refinery Plc"}, "totalAmount": 18500000, "status": "ORDERED", "createdAt": "2026-10-28"},
                {"id": "PO-1093", "poNumber": "PO-2026-089", "vendor": {"name": "Chellarams Chemical Ingredients"}, "totalAmount": 12400000, "status": "RECEIVED", "createdAt": "2026-10-26"},
                {"id": "PO-1094", "poNumber": "PO-2026-090", "vendor": {"name": "Beta Glass Packaging Plc"}, "totalAmount": 7800000, "status": "ORDERED", "createdAt": "2026-10-29"}
            ],
            "pagination": {"page": 1, "limit": 10, "total": 3, "pages": 1}
        }
        route.fulfill(status=200, content_type="application/json", body=json.dumps(data))

    # 7. Sales Orders
    elif "sales/orders" in url or "sales" in url and "pos" not in url:
        data = {
            "orders": [
                {"id": "SO-5021", "orderNo": "SO-2026-0312", "customer": {"name": "MercyCareMed Wholesale"}, "grandTotal": 14200000, "status": "DELIVERED", "paymentStatus": "PAID", "date": "2026-10-30"},
                {"id": "SO-5022", "orderNo": "SO-2026-0313", "customer": {"name": "Ashifau-li-Haqi Limited"}, "grandTotal": 9850000, "status": "DISPATCHED", "paymentStatus": "PARTIAL", "date": "2026-10-31"},
                {"id": "SO-5023", "orderNo": "SO-2026-0314", "customer": {"name": "PrimeHealth Distributors"}, "grandTotal": 6500000, "status": "APPROVED", "paymentStatus": "UNPAID", "date": "2026-11-01"}
            ],
            "pagination": {"page": 1, "limit": 10, "total": 3, "pages": 1}
        }
        route.fulfill(status=200, content_type="application/json", body=json.dumps(data))

    # 8. Inventory Items
    elif "inventory/items" in url:
        data = {
            "items": [
                {"id": "ITM-01", "sku": "RAW-ASC-001", "name": "Ascorbic Acid Powder USP (BP Grade)", "description": "Active Pharmaceutical Ingredient for Vitamin C", "stockQty": 2400, "cartonQuantity": 25, "uom": "KG", "category": "RAW_MATERIAL"},
                {"id": "ITM-02", "sku": "FG-VITC-100", "name": "Vitamin C 500mg Chewable (100 Tabs)", "description": "Finished product packaged in tamper-evident bottles", "stockQty": 8500, "cartonQuantity": 50, "uom": "BOTTLE", "category": "FINISHED_GOODS"},
                {"id": "ITM-03", "sku": "RAW-PARA-002", "name": "Paracetamol Micronized Powder", "description": "High purity API for oral suspensions", "stockQty": 1850, "cartonQuantity": 25, "uom": "KG", "category": "RAW_MATERIAL"},
                {"id": "ITM-04", "sku": "PKG-BOT-120", "name": "Amber Glass Syrup Bottles 120ml", "description": "Pharmaceutical grade amber bottles with child-resistant caps", "stockQty": 35000, "cartonQuantity": 200, "uom": "PCS", "category": "PACKAGING"},
                {"id": "ITM-05", "sku": "FG-HN-PREMIX", "name": "Hi-Nutrient Animal Feed Premix 25kg", "description": "Micro-encapsulated fortified mineral premix", "stockQty": 420, "cartonQuantity": 1, "uom": "BAG", "category": "FINISHED_GOODS"}
            ],
            "pagination": {"page": 1, "limit": 10, "total": 5, "pages": 1}
        }
        route.fulfill(status=200, content_type="application/json", body=json.dumps(data))

    # 9. BOMs
    elif "inventory/boms" in url or "boms" in url:
        data = [
            {"id": "BOM-001", "code": "BOM-VITC-500", "name": "Vitamin C 500mg Batch Recipe (10,000 Bottles)", "version": "v2.1", "status": "ACTIVE", "componentsCount": 8, "totalStandardCost": 3852000, "outputUom": "BOTTLE", "createdAt": "2026-09-15"},
            {"id": "BOM-002", "code": "BOM-PARA-120", "name": "Paracetamol Suspension 120ml Recipe (5,000 Bottles)", "version": "v1.4", "status": "ACTIVE", "componentsCount": 6, "totalStandardCost": 3100000, "outputUom": "BOTTLE", "createdAt": "2026-08-20"},
            {"id": "BOM-003", "code": "BOM-HN-PRMX", "name": "Hi-Nutrient Industrial Premix 25kg Recipe", "version": "v3.0", "status": "ACTIVE", "componentsCount": 11, "totalStandardCost": 19200000, "outputUom": "BAG", "createdAt": "2026-10-10"}
        ]
        route.fulfill(status=200, content_type="application/json", body=json.dumps(data))

    # 10. Chart of Accounts
    elif "chart-of-accounts" in url:
        data = [
            {"id": "COA-1010", "code": "1010", "name": "Main Cashbook - Petty Cash", "type": "ASSET", "balance": 1850000, "currency": "NGN"},
            {"id": "COA-1020", "code": "1020", "name": "Zenith Bank Corporate Operating A/C", "type": "ASSET", "balance": 48200000, "currency": "NGN"},
            {"id": "COA-1030", "code": "1030", "name": "First Bank Revenue Collection A/C", "type": "ASSET", "balance": 32600000, "currency": "NGN"},
            {"id": "COA-1200", "code": "1200", "name": "Trade Accounts Receivable (Distributors)", "type": "ASSET", "balance": 14350000, "currency": "NGN"},
            {"id": "COA-1300", "code": "1300", "name": "Raw Materials Inventory Valuation", "type": "ASSET", "balance": 52300000, "currency": "NGN"},
            {"id": "COA-1310", "code": "1310", "name": "Work-In-Progress (WIP) Valuation", "type": "ASSET", "balance": 14850000, "currency": "NGN"},
            {"id": "COA-1320", "code": "1320", "name": "Finished Goods Inventory Valuation", "type": "ASSET", "balance": 22300000, "currency": "NGN"},
            {"id": "COA-2010", "code": "2010", "name": "Trade Accounts Payable (Suppliers)", "type": "LIABILITY", "balance": 9120000, "currency": "NGN"},
            {"id": "COA-4010", "code": "4010", "name": "Commercial Product Sales Revenue", "type": "REVENUE", "balance": 150100000, "currency": "NGN"},
            {"id": "COA-5010", "code": "5010", "name": "Cost of Goods Manufactured & Sold (COGS)", "type": "EXPENSE", "balance": 78200000, "currency": "NGN"}
        ]
        route.fulfill(status=200, content_type="application/json", body=json.dumps(data))

    # 11. Fixed Assets
    elif "assets/register" in url or "/assets" in url:
        data = {
            "assets": [
                {"id": "AST-01", "assetTag": "AST-GEN-500KVA", "name": "Perkins 500kVA Heavy-Duty Generator", "category": "Plant & Machinery", "purchaseDate": "2024-03-10", "purchaseCost": 45000000, "accumulatedDepreciation": 7500000, "netBookValue": 37500000, "status": "ACTIVE"},
                {"id": "AST-02", "assetTag": "AST-PKG-LINE01", "name": "Automatic Rotary Blister Packaging Machine", "category": "Manufacturing Equipment", "purchaseDate": "2024-06-15", "purchaseCost": 28000000, "accumulatedDepreciation": 4200000, "netBookValue": 23800000, "status": "ACTIVE"},
                {"id": "AST-03", "assetTag": "AST-TRK-ISUZU", "name": "Isuzu 15-Ton Factory Distribution Truck", "category": "Motor Vehicles", "purchaseDate": "2025-01-20", "purchaseCost": 35000000, "accumulatedDepreciation": 5833000, "netBookValue": 29167000, "status": "ACTIVE"}
            ],
            "pagination": {"page": 1, "limit": 10, "total": 3, "pages": 1}
        }
        route.fulfill(status=200, content_type="application/json", body=json.dumps(data))

    # 12. POS Sessions and Current
    elif "pos/sessions/current" in url:
        data = {
            "id": "POS-SESS-902",
            "cashier": "Abigail Adewale (Lead Cashier)",
            "terminal": "Terminal 01 - Main Factory Gate Depot",
            "openingTime": "08:00 AM",
            "openingFloat": 25000,
            "status": "OPEN",
            "cashSales": 485000,
            "posSales": 1240000,
            "transferSales": 920000,
            "totalCollected": 2645000
        }
        route.fulfill(status=200, content_type="application/json", body=json.dumps(data))

    # Default fallback for other api requests
    else:
        route.fulfill(status=200, content_type="application/json", body=json.dumps({"success": True, "data": []}))

showcase_pages = [
    ("01_executive_dashboard", "/", "Financial & Operations Intelligence"),
    ("02_point_of_sale", "/pos", "Retail POS Command Center & Cashier Flow"),
    ("03_inventory_tracking", "/inventory/items", "Multi-Warehouse & UOM Inventory Tracking"),
    ("04_bill_of_materials", "/inventory/boms", "Standard Formulation Recipes & Batch Costing"),
    ("05_production_orders", "/production/orders", "Work Order & Unit Cost Allocation"),
    ("06_sales_receivables", "/sales/orders", "Sales Distribution & AR Credit Control"),
    ("07_procurement_payables", "/purchases/orders", "Automated Purchase Orders & 3-Way GRN Matching"),
    ("08_fixed_asset_register", "/assets/register", "Asset Tagging & Automated Depreciation Register"),
    ("09_cashbook_treasury", "/cash/cashbook", "Multi-Bank Cashbook & 4-Eye Fraud Prevention"),
    ("10_chart_of_accounts", "/management/chart-of-accounts", "IFRS-Compliant Double-Entry General Ledger"),
    ("11_financial_reports", "/reports", "Instant Real-Time P&L, Balance Sheet & Cash Flow")
]

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    page.route("**/api/v1/**", handle_routes)

    # Pre-inject auth into localStorage
    page.add_init_script(f"""
        localStorage.setItem('auth-storage', {json.dumps(json.dumps(auth_storage))});
    """)

    for filename, path, title in showcase_pages:
        url = f"http://127.0.0.1:8085{path}"
        print(f"Capturing pristine showcase: {title} ({url})...")
        page.goto(url, wait_until="domcontentloaded", timeout=15000)
        
        # Inject CSS to hide any accidental toast errors or ugly scrollbars
        page.add_style_tag(content="""
            [role="status"], [role="alert"], .toaster, div[style*="position: fixed; z-index: 9999"] {
                display: none !important;
                opacity: 0 !important;
            }
        """)

        page.wait_for_timeout(1500)
        shot_path = os.path.join(output_dir, f"{filename}.png")
        page.screenshot(path=shot_path)
        print(f"  Pristine snapshot saved: {shot_path}")

    browser.close()
    print("ALL PRISTINE SHOWCASE SNAPSHOTS READY!")
