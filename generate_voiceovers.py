import asyncio
import os
import edge_tts

VOICE = "en-NG-EzinneNeural"  # Nigerian English Female (Friendly, Natural)
RATE = "+12%"                 # Slightly faster for energetic ad pacing

audio_dir = r"c:\Users\workspace\BizLenz\advertisement_suite\audio"
os.makedirs(audio_dir, exist_ok=True)

SCRIPTS = [
    ("scene01_hook", "Are you still running your factory and distribution operations on fragile spreadsheets? Stop inventory leakage, untracked batch costs, and delayed debtor collections today!"),
    ("scene02_intro", "Welcome to BizLens Enterprise ERP, built by CodySense IT Solutions. The all-in-one software purposefully engineered to give you complete operational control. Control Everything, Miss Nothing!"),
    ("scene03_dashboard", "Take command with the real-time Executive Dashboard. Monitor your gross sales, net profit margins, customer receivables, and cash flow in one unified view."),
    ("scene04_boms", "Eliminate formulation guesswork. Build multi-stage Bills of Materials, track active Work-In-Progress, and automatically capture direct labor and generator diesel per batch."),
    ("scene05_production", "Track production work orders on the factory floor from raw material issuance to finished goods warehousing, with zero recipe variance."),
    ("scene06_pos", "Accelerate retail checkouts with our high-speed Point of Sale terminal. Barcode scanning, split payments, and seamless cashier shift balancing keep your queues moving fast."),
    ("scene07_cashbook", "Protect your business with multi-tier anti-fraud governance. Every payment strictly follows a four-eye approval workflow: Prepared, Approved, Authorized, and Paid."),
    ("scene08_assets", "Track company assets seamlessly with automated asset tagging and monthly straight-line depreciation calculations directly in your Fixed Asset Register."),
    ("scene09_reports", "Make confident executive decisions. Generate instant IFRS Balance Sheets, Profit and Loss statements, and thirty-sixty-ninety day debtor aging reports at the click of a button."),
    ("scene10_cta", "Ready to transform your enterprise? BizLens is available in Cloud, Standalone Desktop, and 100% offline Local Intranet. Contact CodySense IT Solutions on zero-eight-zero, three-three-one-two, four-four-nine-one, or email kolly-four-we-all at gmail dot com. Visit bizlens dot netlify dot app today!")
]

async def generate_all_audio():
    print(f"Generating voiceover using {VOICE} at rate {RATE}...")
    for name, text in SCRIPTS:
        out_path = os.path.join(audio_dir, f"{name}.mp3")
        communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
        await communicate.save(out_path)
        print(f"  Generated: {out_path}")
    print("All voiceovers generated successfully!")

if __name__ == "__main__":
    asyncio.run(generate_all_audio())
