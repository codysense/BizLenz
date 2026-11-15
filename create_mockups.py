import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

output_dir = r"c:\Users\workspace\BizLenz\advertisement_suite\framed_shots"
os.makedirs(output_dir, exist_ok=True)

source_shots = {
    "login": (r"c:\Users\workspace\BizLenz\ad_assets\screenshots\00_login_page.png", "https://bizlens.netlify.app/login", "Secure Enterprise Portal"),
    "dashboard": (r"c:\Users\workspace\BizLenz\ad_assets\screenshots\01_dashboard.png", "https://bizlens.netlify.app/dashboard", "Real-Time Executive Intelligence"),
    "pos": (r"c:\Users\workspace\BizLenz\ad_assets\screenshots\02_pos_terminal.png", "https://bizlens.netlify.app/pos", "High-Speed Retail POS Command Center"),
    "boms": (r"c:\Users\workspace\BizLenz\ad_assets\screenshots\05_inventory_boms.png", "https://bizlens.netlify.app/inventory/boms", "Formulation Recipe & Batch Costing"),
    "production": (r"c:\Users\workspace\BizLenz\ad_assets\screenshots\09_production_orders.png", "https://bizlens.netlify.app/production/orders", "Work Orders & Shop-Floor Tracking"),
    "fixed_assets": (r"c:\Users\workspace\BizLenz\ad_assets\screenshots\18_fixed_assets.png", "https://bizlens.netlify.app/assets", "Fixed Asset Register & Depreciation"),
    "cashbook": (r"c:\Users\workspace\BizLenz\ad_assets\screenshots\20_cashbook.png", "https://bizlens.netlify.app/cash/cashbook", "4-Eye Payment Anti-Fraud Workflow"),
    "reports": (r"c:\Users\workspace\BizLenz\ad_assets\clean_screenshots\13_financial_reports.png", "https://bizlens.netlify.app/reports", "IFRS Automated Financial Reporting"),
}

def create_window_mockup(img_path, url_text, title_text, out_path):
    orig = Image.open(img_path).convert("RGBA")
    
    # If the image is wider than 1540 and has toasts on the right (like dashboard/cashbook from task-131),
    # crop out the right toast bar (x from 0 to 1540) unless it's clean_screenshots or login
    if "clean_screenshots" not in img_path and "login" not in img_path:
        w, h = orig.size
        orig = orig.crop((0, 0, min(1540, w), h))

    target_w = 1600
    target_h = int(orig.height * (target_w / orig.width))
    orig = orig.resize((target_w, target_h), Image.Resampling.LANCZOS)

    header_h = 56
    border_radius = 16

    # Create mockup canvas
    mockup = Image.new("RGBA", (target_w, target_h + header_h), (255, 255, 255, 0))
    draw = ImageDraw.Draw(mockup)

    # Window header background (sleek dark graphite / mac style)
    draw.rounded_rectangle([0, 0, target_w, target_h + header_h], radius=border_radius, fill=(15, 23, 42, 255))
    draw.rounded_rectangle([0, 0, target_w, header_h + 20], radius=border_radius, fill=(24, 33, 47, 255))
    draw.rectangle([0, 30, target_w, header_h], fill=(24, 33, 47, 255))

    # Window control dots (Red, Yellow, Green)
    draw.ellipse([20, 20, 34, 34], fill=(239, 68, 68))
    draw.ellipse([44, 20, 58, 34], fill=(245, 158, 11))
    draw.ellipse([68, 20, 82, 34], fill=(16, 185, 129))

    # URL bar pill in header
    url_pill_w = 600
    url_x = (target_w - url_pill_w) // 2
    draw.rounded_rectangle([url_x, 12, url_x + url_pill_w, 44], radius=8, fill=(38, 48, 64))
    
    # Text in URL bar
    draw.text((url_x + 20, 18), f"🔒 {url_text}", fill=(180, 200, 220))

    # Paste inner app screenshot
    mockup.paste(orig, (0, header_h))

    # Add subtle border
    draw.rounded_rectangle([0, 0, target_w - 1, target_h + header_h - 1], radius=border_radius, outline=(70, 85, 105, 180), width=2)

    mockup.save(out_path, "PNG")
    print(f"Created framed mockup: {out_path}")

for key, (path, url, title) in source_shots.items():
    if os.path.exists(path):
        out = os.path.join(output_dir, f"{key}_framed.png")
        create_window_mockup(path, url, title, out)
    else:
        print(f"File not found: {path}")

print("All window mockups generated successfully!")
