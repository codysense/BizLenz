import os
import sys
import time
import subprocess
import imageio_ffmpeg
from playwright.sync_api import sync_playwright

ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

suite_dir = r"c:\Users\workspace\BizLenz\advertisement_suite"
temp_video_dir = os.path.join(suite_dir, "temp_rec")
os.makedirs(temp_video_dir, exist_ok=True)

html_file = os.path.join(suite_dir, "index.html")
master_audio = os.path.join(suite_dir, "audio", "master_voiceover.mp3")
final_mp4 = os.path.join(suite_dir, "BizLens_Enterprise_Commercial_Ad_1080p.mp4")

print(f"1. Recording 1080p visual canvas from {html_file}...")

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    context = browser.new_context(
        viewport={"width": 1920, "height": 1080},
        record_video_dir=temp_video_dir,
        record_video_size={"width": 1920, "height": 1080}
    )
    page = context.new_page()

    page.goto(f"file:///{html_file.replace(os.sep, '/')}", wait_until="load")
    page.wait_for_timeout(2000)

    # Trigger playback
    print("Clicking play...")
    page.locator("#playBtn").click()

    # The entire commercial is ~113.7 seconds. Let's record for 114 seconds.
    print("Recording 114 seconds of animation...")
    page.wait_for_timeout(114000)

    print("Closing recording session...")
    page.close()
    context.close()
    browser.close()

# Find recorded file
rec_files = [os.path.join(temp_video_dir, f) for f in os.listdir(temp_video_dir) if f.endswith(".webm")]
if not rec_files:
    print("Error: No recorded file found!")
    sys.exit(1)

latest_rec = max(rec_files, key=os.path.getmtime)
print(f"Recorded raw visual: {latest_rec} ({os.path.getsize(latest_rec) / (1024*1024):.2f} MB)")

print(f"2. Muxing video with Nigerian female voiceover into Universal MP4 (H.264 + AAC)...")
cmd = [
    ffmpeg_exe, "-y",
    "-i", latest_rec,
    "-i", master_audio,
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "22",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    final_mp4
]

subprocess.run(cmd, check=True)
print(f"3. SUCCESS! Final MP4 video created at:")
print(f"   {final_mp4}")
print(f"   Size: {os.path.getsize(final_mp4) / (1024*1024):.2f} MB")
