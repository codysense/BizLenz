import os
import subprocess
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
audio_dir = r"c:\Users\workspace\BizLenz\advertisement_suite\audio"

scenes = [
    "scene01_hook.mp3",
    "scene02_intro.mp3",
    "scene03_dashboard.mp3",
    "scene04_boms.mp3",
    "scene05_production.mp3",
    "scene06_pos.mp3",
    "scene07_cashbook.mp3",
    "scene08_assets.mp3",
    "scene09_reports.mp3",
    "scene10_cta.mp3",
]

# Create concat list
concat_list = os.path.join(audio_dir, "concat_list.txt")
with open(concat_list, "w", encoding="utf-8") as f:
    for s in scenes:
        f.write(f"file '{s}'\n")

out_master = os.path.join(audio_dir, "master_voiceover.mp3")
cmd = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", concat_list, "-c", "copy", out_master]
subprocess.run(cmd, check=True)
print("Concatenated master voiceover created at:", out_master)
