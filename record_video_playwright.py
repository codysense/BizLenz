import os
import time
from playwright.sync_api import sync_playwright

output_dir = r"c:\Users\workspace\BizLenz\advertisement_suite\video_exports"
os.makedirs(output_dir, exist_ok=True)

html_path = r"c:\Users\workspace\BizLenz\advertisement_suite\index.html"

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    # Configure video recording at full HD 1920x1080
    context = browser.new_context(
        viewport={"width": 1920, "height": 1080},
        record_video_dir=output_dir,
        record_video_size={"width": 1920, "height": 1080}
    )
    page = context.new_page()

    print(f"Loading advertisement video player from {html_path}...")
    page.goto(f"file:///{html_path.replace(os.sep, '/')}", wait_until="load")
    page.wait_for_timeout(2000)

    # Click play button
    print("Starting commercial video playback...")
    page.locator("#playBtn").click()

    # Record full 70 seconds of commercial
    print("Recording 72 seconds of 1080p video frames...")
    page.wait_for_timeout(72000)

    print("Finishing video recording...")
    page.close()
    context.close()
    browser.close()

# Find the recorded video file and rename it
files = [f for f in os.listdir(output_dir) if f.endswith(".webm")]
if files:
    # Get latest
    latest = max([os.path.join(output_dir, f) for f in files], key=os.path.getmtime)
    final_dest = os.path.join(r"c:\Users\workspace\BizLenz\advertisement_suite", "BizLens_Enterprise_Commercial_Ad_1080p.webm")
    if os.path.exists(final_dest):
        os.remove(final_dest)
    os.rename(latest, final_dest)
    print(f"COMMERCIAL AD VIDEO EXPORTED TO: {final_dest}")
    print(f"File size: {os.path.getsize(final_dest) / (1024 * 1024):.2f} MB")
else:
    print("No webm file found in output directory.")
