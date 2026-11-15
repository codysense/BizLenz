import os
import sys
import json
from http.server import SimpleHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

DIST_DIR = os.path.abspath(r"c:\Users\workspace\BizLenz\Frontend\dist")

MOCK_DATA = {
    "/api/v1/dashboard/executive-summary": {
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
            {"category": "Raw Material Inputs", "amount": 42500000},
            {"category": "Generator Fuel & Factory Power", "amount": 14200000},
            {"category": "Direct Plant Labor", "amount": 11800000},
            {"category": "Packaging & Freight Logistics", "amount": 8300000},
            {"category": "Quality Assurance & Regulatory", "amount": 3400000}
        ],
        "monthlyComparison": [
            {"month": "Jul", "revenue": 115000000, "expenses": 78000000},
            {"month": "Aug", "revenue": 128000000, "expenses": 82000000},
            {"month": "Sep", "revenue": 139000000, "expenses": 89000000},
            {"month": "Oct", "revenue": 148250000, "expenses": 87400000}
        ]
    },
    "/api/v1/inventory/valuation": {
        "totalValuation": 89450000,
        "totalItems": 142,
        "rawMaterialsValue": 52300000,
        "wipValue": 14850000,
        "finishedGoodsValue": 22300000
    },
    "/api/v1/dashboard/top-products": [
        {"name": "Vitamin C 500mg Chewable (100s)", "revenue": 38400000, "quantity": 12800},
        {"name": "Paracetamol Suspension 120ml", "revenue": 29600000, "quantity": 24500},
        {"name": "Hi-Nutrient Industrial Premix 25kg", "revenue": 45100000, "quantity": 940},
        {"name": "Multivitamin Herbal Tonic 200ml", "revenue": 21800000, "quantity": 15200},
        {"name": "Amoxicillin Capsules 500mg", "revenue": 13350000, "quantity": 8900}
    ],
    "/api/v1/dashboard/top-customers": [
        {"name": "MercyCareMed Wholesale Pharmacy", "revenue": 42500000, "ordersCount": 38},
        {"name": "Ashifau-li-Haqi Limited (Ibadan)", "revenue": 36800000, "ordersCount": 24},
        {"name": "PrimeHealth Distributors Lagos", "revenue": 28400000, "ordersCount": 19},
        {"name": "Evergreen Pharmaceuticals Abuja", "revenue": 22100000, "ordersCount": 15},
        {"name": "St. Jude Commercial Chemists", "revenue": 18450000, "ordersCount": 12}
    ],
    "/api/v1/dashboard/alerts": [
        {"id": "ALT-1", "type": "warning", "message": "Ascorbic Acid Powder below reorder point (2,400 KG remaining)", "timestamp": "10 mins ago"},
        {"id": "ALT-2", "type": "info", "message": "Batch PRD-2026-0041 completed quality clearance", "timestamp": "1 hour ago"}
    ],
    "/api/v1/production/orders": {
        "orders": [
            {"id": "PO-1", "orderNo": "PRD-2026-0041", "bomName": "Vitamin C 500mg Batch Recipe #4", "plannedQuantity": 10000, "actualQuantity": 9950, "status": "COMPLETED", "startDate": "2026-10-25", "completionDate": "2026-10-28", "unitCost": 385.20},
            {"id": "PO-2", "orderNo": "PRD-2026-0042", "bomName": "Paracetamol Suspension 120ml", "plannedQuantity": 5000, "actualQuantity": 5000, "status": "IN_PROGRESS", "startDate": "2026-10-29", "completionDate": "2026-11-03", "unitCost": 620.00},
            {"id": "PO-3", "orderNo": "PRD-2026-0043", "bomName": "Hi-Nutrient Fortified Premix 25kg", "plannedQuantity": 400, "actualQuantity": 0, "status": "RELEASED", "startDate": "2026-11-01", "completionDate": "2026-11-05", "unitCost": 48000.00}
        ],
        "pagination": {"page": 1, "limit": 10, "total": 3, "pages": 1}
    },
    "/api/v1/purchase/orders": {
        "purchases": [
            {"id": "PO-1092", "poNumber": "PO-2026-088", "vendor": {"name": "Dangote Sugar Refinery Plc"}, "totalAmount": 18500000, "status": "ORDERED", "createdAt": "2026-10-28"},
            {"id": "PO-1093", "poNumber": "PO-2026-089", "vendor": {"name": "Chellarams Chemical Ingredients"}, "totalAmount": 12400000, "status": "RECEIVED", "createdAt": "2026-10-26"},
            {"id": "PO-1094", "poNumber": "PO-2026-090", "vendor": {"name": "Beta Glass Packaging Plc"}, "totalAmount": 7800000, "status": "ORDERED", "createdAt": "2026-10-29"}
        ],
        "pagination": {"page": 1, "limit": 10, "total": 3, "pages": 1}
    },
    "/api/v1/sales/orders": {
        "orders": [
            {"id": "SO-5021", "orderNo": "SO-2026-0312", "customer": {"name": "MercyCareMed Wholesale"}, "grandTotal": 14200000, "status": "DELIVERED", "paymentStatus": "PAID", "date": "2026-10-30"},
            {"id": "SO-5022", "orderNo": "SO-2026-0313", "customer": {"name": "Ashifau-li-Haqi Limited"}, "grandTotal": 9850000, "status": "DISPATCHED", "paymentStatus": "PARTIAL", "date": "2026-10-31"},
            {"id": "SO-5023", "orderNo": "SO-2026-0314", "customer": {"name": "PrimeHealth Distributors"}, "grandTotal": 6500000, "status": "APPROVED", "paymentStatus": "UNPAID", "date": "2026-11-01"}
        ],
        "pagination": {"page": 1, "limit": 10, "total": 3, "pages": 1}
    },
    "/api/v1/inventory/items": {
        "items": [
            {"id": "ITM-01", "sku": "RAW-ASC-001", "name": "Ascorbic Acid Powder USP (BP Grade)", "description": "Active Pharmaceutical Ingredient for Vitamin C", "stockQty": 2400, "cartonQuantity": 25, "uom": "KG", "category": "RAW_MATERIAL"},
            {"id": "ITM-02", "sku": "FG-VITC-100", "name": "Vitamin C 500mg Chewable (100 Tabs)", "description": "Finished product packaged in tamper-evident bottles", "stockQty": 8500, "cartonQuantity": 50, "uom": "BOTTLE", "category": "FINISHED_GOODS"},
            {"id": "ITM-03", "sku": "RAW-PARA-002", "name": "Paracetamol Micronized Powder", "description": "High purity API for oral suspensions", "stockQty": 1850, "cartonQuantity": 25, "uom": "KG", "category": "RAW_MATERIAL"},
            {"id": "ITM-04", "sku": "PKG-BOT-120", "name": "Amber Glass Syrup Bottles 120ml", "description": "Pharmaceutical grade amber bottles with child-resistant caps", "stockQty": 35000, "cartonQuantity": 200, "uom": "PCS", "category": "PACKAGING"},
            {"id": "ITM-05", "sku": "FG-HN-PREMIX", "name": "Hi-Nutrient Animal Feed Premix 25kg", "description": "Micro-encapsulated fortified mineral premix", "stockQty": 420, "cartonQuantity": 1, "uom": "BAG", "category": "FINISHED_GOODS"}
        ],
        "pagination": {"page": 1, "limit": 10, "total": 5, "pages": 1}
    },
    "/api/v1/inventory/boms": [
        {"id": "BOM-001", "code": "BOM-VITC-500", "name": "Vitamin C 500mg Batch Recipe (10,000 Bottles)", "version": "v2.1", "status": "ACTIVE", "componentsCount": 8, "totalStandardCost": 3852000, "outputUom": "BOTTLE", "createdAt": "2026-09-15"},
        {"id": "BOM-002", "code": "BOM-PARA-120", "name": "Paracetamol Suspension 120ml Recipe (5,000 Bottles)", "version": "v1.4", "status": "ACTIVE", "componentsCount": 6, "totalStandardCost": 3100000, "outputUom": "BOTTLE", "createdAt": "2026-08-20"},
        {"id": "BOM-003", "code": "BOM-HN-PRMX", "name": "Hi-Nutrient Industrial Premix 25kg Recipe", "version": "v3.0", "status": "ACTIVE", "componentsCount": 11, "totalStandardCost": 19200000, "outputUom": "BAG", "createdAt": "2026-10-10"}
    ],
    "/api/v1/management/chart-of-accounts": [
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
    ],
    "/api/v1/assets/register": {
        "assets": [
            {"id": "AST-01", "assetTag": "AST-GEN-500KVA", "name": "Perkins 500kVA Heavy-Duty Generator", "category": "Plant & Machinery", "purchaseDate": "2024-03-10", "purchaseCost": 45000000, "accumulatedDepreciation": 7500000, "netBookValue": 37500000, "status": "ACTIVE"},
            {"id": "AST-02", "assetTag": "AST-PKG-LINE01", "name": "Automatic Rotary Blister Packaging Machine", "category": "Manufacturing Equipment", "purchaseDate": "2024-06-15", "purchaseCost": 28000000, "accumulatedDepreciation": 4200000, "netBookValue": 23800000, "status": "ACTIVE"},
            {"id": "AST-03", "assetTag": "AST-TRK-ISUZU", "name": "Isuzu 15-Ton Factory Distribution Truck", "category": "Motor Vehicles", "purchaseDate": "2025-01-20", "purchaseCost": 35000000, "accumulatedDepreciation": 5833000, "netBookValue": 29167000, "status": "ACTIVE"}
        ],
        "pagination": {"page": 1, "limit": 10, "total": 3, "pages": 1}
    },
    "/api/v1/pos/sessions/current": {
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
}

class SPARequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # If it's an API request, return JSON!
        if path.startswith("/api/v1/"):
            # Check exact or prefix match
            res = None
            for key, val in MOCK_DATA.items():
                if path.startswith(key):
                    res = val
                    break
            if res is None:
                # Default generic API response
                res = {"success": True, "items": [], "data": [], "pagination": {"page": 1, "limit": 10, "total": 0, "pages": 1}}

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(res).encode('utf-8'))
            return

        # Static assets and SPA routing
        local_path = self.translate_path(self.path)
        if not os.path.exists(local_path) or os.path.isdir(local_path):
            self.path = "/index.html"

        return super().do_GET()

    def do_POST(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"success": True}).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

def run(port=8085):
    server_address = ('127.0.0.1', port)
    httpd = HTTPServer(server_address, SPARequestHandler)
    print(f"Serving SPA with API mock from {DIST_DIR} on http://127.0.0.1:{port}")
    httpd.serve_forever()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8085
    run(port)
