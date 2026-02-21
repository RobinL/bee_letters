#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///

import argparse
import subprocess
from pathlib import Path

# Voice assets live under public/assets/voice relative to the repo root
DEFAULT_ROOT = Path(__file__).resolve().parent.parent / "public" / "assets" / "voice"

FFMPEG = "ffmpeg"  # or full path if not on PATH

# Trim exactly 0.1s from the start and end of each clip.
EDGE_TRIM_FILTER = "atrim=start=0.1,areverse,atrim=start=0.1,areverse"
HIGHPASS_FILTER = "highpass=f=80"
LOWPASS_FILTER = "lowpass=f=12000"
NOISE_REDUCTION_FILTER = "afftdn=nf=-25"
COMPRESSOR_FILTER = (
    "acompressor=threshold=-18dB:ratio=2.5:attack=5:release=80:makeup=3"
)
LOUDNESS_FILTER = "loudnorm=I=-16:TP=-1.5:LRA=7"

AUDIO_FILTER = ",".join(
    [
        EDGE_TRIM_FILTER,
        HIGHPASS_FILTER,
        LOWPASS_FILTER,
        NOISE_REDUCTION_FILTER,
        COMPRESSOR_FILTER,
        LOUDNESS_FILTER,
    ]
)

def process_file(src: Path, dst: Path):
    # Write to a temporary file first so final output is only replaced on success.
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp_dst = dst.with_name(dst.stem + "_tmp.webm")
    cmd = [
        FFMPEG,
        "-y",
        "-i", str(src),
        "-af", AUDIO_FILTER,
        "-ar", "48000",  # resample if needed
        "-ac", "1",      # mono is fine for voice
        "-c:a", "libopus",
        "-b:a", "96k",
        str(tmp_dst),
    ]
    print("Processing", src, "->", dst)
    try:
        subprocess.run(cmd, check=True)
        tmp_dst.replace(dst)
    finally:
        if tmp_dst.exists():
            tmp_dst.unlink()

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Normalise .webm voice files in a directory tree."
    )
    parser.add_argument(
        "root",
        nargs="?",
        default=str(DEFAULT_ROOT),
        help="Root folder containing .webm files (default: public/assets/voice).",
    )
    parser.add_argument(
        "--output-root",
        dest="output_root",
        default=None,
        help="Optional output root. If omitted, files are processed in place.",
    )
    return parser.parse_args()

def main():
    args = parse_args()
    root = Path(args.root).expanduser().resolve()
    if not root.exists():
        raise SystemExit(f"Voice folder not found: {root}")
    output_root = (
        Path(args.output_root).expanduser().resolve()
        if args.output_root is not None
        else root
    )

    for path in root.rglob("*.webm"):
        if output_root == root:
            dst = path
        else:
            dst = output_root / path.relative_to(root)
        process_file(path, dst)

if __name__ == "__main__":
    main()
