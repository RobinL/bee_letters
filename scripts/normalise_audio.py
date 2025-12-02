import subprocess
from pathlib import Path

# Voice assets live under public/assets/voice relative to the repo root
ROOT = Path(__file__).resolve().parent.parent / "public" / "assets" / "voice"

FFMPEG = "ffmpeg"  # or full path if not on PATH

# Tweak thresholds if it cuts too much/too little silence
SILENCE_FILTER = (
    "silenceremove="
    "start_periods=1:"
    "start_threshold=-35dB:"
    "start_silence=0.1:"
    "stop_periods=1:"
    "stop_threshold=-35dB:"
    "stop_silence=0.2"
)

LOUDNESS_FILTER = "loudnorm=I=-16:TP=-1.5:LRA=11"
HIGHPASS_FILTER = "highpass=f=80"
COMPAND_FILTER = "compand=attacks=0.2:decays=0.6:points=-80/-80|-30/-10|0/-2"

AUDIO_FILTER = ",".join(
    [SILENCE_FILTER, LOUDNESS_FILTER, HIGHPASS_FILTER, COMPAND_FILTER]
)

def process_file(src: Path):
    # Write to a temporary file first so we can replace the original atomically
    tmp_dst = src.with_name(src.stem + "_tmp.webm")
    cmd = [
        FFMPEG,
        "-y",
        "-i", str(src),
        "-af", AUDIO_FILTER,
        "-ar", "48000",  # resample if needed
        "-ac", "1",      # mono is fine for voice
        "-c:a", "libopus",
        str(tmp_dst),
    ]
    print("Processing", src, "->", src)
    try:
        subprocess.run(cmd, check=True)
        tmp_dst.replace(src)
    finally:
        if tmp_dst.exists():
            tmp_dst.unlink()

def main():
    if not ROOT.exists():
        raise SystemExit(f"Voice folder not found: {ROOT}")

    for path in ROOT.rglob("*.webm"):
        process_file(path)

if __name__ == "__main__":
    main()
