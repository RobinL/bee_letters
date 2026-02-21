# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "openai>=1.40",
# ]
# ///

"""
Label sprites in processed_assets/3_3_items using OpenRouter and write renamed
copies to processed_assets/items in the same structure style as
src/assets/images/items/<letter>/<name>.png.
"""

from __future__ import annotations

import base64
import os
import random
import re
import shutil
import time
from pathlib import Path
from typing import Iterable

from openai import OpenAI, APIError, RateLimitError

# OpenRouter specific model ID (Free tier variant)
# You can change this to "google/gemini-2.0-flash-lite-001" for the paid tier
MODEL_ID = "google/gemini-2.5-flash-lite"

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = REPO_ROOT / "processed_assets" / "3_3_items"
DEST_ROOT = REPO_ROOT / "processed_assets" / "items"
START_AT_LETTER = ""  # e.g. "m" to skip a-l
FREE_TIER_REQUESTS_PER_MINUTE = 15  # Adjust based on OpenRouter limits
MIN_REQUEST_INTERVAL = 60 / FREE_TIER_REQUESTS_PER_MINUTE
MAX_RETRIES = 3
_last_request_ts = 0.0


def resolve_api_key() -> str:
    # Check for OpenRouter key first, then generic OpenAI key
    key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if key:
        return key
    try:
        from secret_keys import OPENROUTER_API_KEY
    except Exception:
        try:
            from scripts.secret_keys import OPENROUTER_API_KEY
        except Exception:
            OPENROUTER_API_KEY = ""
    if OPENROUTER_API_KEY:
        return OPENROUTER_API_KEY

    try:
        from secret_keys import GEMINI_API_KEY
    except Exception:
        try:
            from scripts.secret_keys import GEMINI_API_KEY
        except Exception as exc:
            raise RuntimeError(
                "Set OPENROUTER_API_KEY in environment or scripts/secret_keys.py"
            ) from exc
    if GEMINI_API_KEY:
        return GEMINI_API_KEY
    raise RuntimeError(
        "Set OPENROUTER_API_KEY in environment or scripts/secret_keys.py"
    )


def infer_expected_letter(source_dir_name: str) -> str | None:
    name = source_dir_name.lower()
    if len(name) == 1 and name.isalpha():
        return name
    return None


def build_prompt(expected_letter: str | None) -> str:
    if expected_letter:
        return (
            "You are labelling a sprite image for children. "
            f"Identify the primary object and return a lowercase noun that starts with '{expected_letter.upper()}'. "
            "Keep it to one or two words, no punctuation, no numbering, and avoid adjectives. "
            "If the object is unclear, make your best guess that still starts with the required letter."
        )
    return (
        "You are labelling a sprite image for children. "
        "Identify the primary object and return a lowercase noun (one or two words). "
        "No punctuation, no numbering, and avoid adjectives."
    )


def sanitize_label(raw: str, expected_letter: str | None) -> str:
    first_line = raw.strip().splitlines()[0].lower() if raw else ""
    cleaned = re.sub(r"[^a-z0-9]+", "_", first_line).strip("_")
    if not cleaned:
        cleaned = f"{expected_letter or 'item'}_unknown"
    if expected_letter and not cleaned.startswith(expected_letter):
        cleaned = f"{expected_letter}_{cleaned}"
    if not cleaned[0].isalpha():
        cleaned = f"{expected_letter or 'item'}_{cleaned}"
    return cleaned


def destination_letter(label: str, expected_letter: str | None) -> str:
    if expected_letter:
        return expected_letter
    first = label[0].lower()
    if first.isalpha():
        return first
    return "misc"


def ensure_unique_path(dest_dir: Path, filename: str) -> Path:
    candidate = dest_dir / filename
    if not candidate.exists():
        return candidate
    stem = Path(filename).stem
    suffix = Path(filename).suffix
    for i in range(2, 100):
        alt = dest_dir / f"{stem}_{i}{suffix}"
        if not alt.exists():
            return alt
    raise RuntimeError(f"Could not find unique name for {filename}")


def iter_source_images(root: Path) -> Iterable[tuple[Path, str | None]]:
    for source_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        expected_letter = infer_expected_letter(source_dir.name)
        for image_path in sorted(source_dir.glob("*.png")):
            yield image_path, expected_letter

    # Also support png files placed directly under SOURCE_ROOT.
    for image_path in sorted(root.glob("*.png")):
        yield image_path, None


def wait_for_rate_limit() -> None:
    global _last_request_ts
    now = time.monotonic()
    elapsed = now - _last_request_ts
    wait_time = MIN_REQUEST_INTERVAL - elapsed
    if wait_time > 0:
        time.sleep(wait_time)
        now = time.monotonic()
    _last_request_ts = now


def encode_image(image_path: Path) -> str:
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")


def generate_with_backoff(client: OpenAI, messages: list[dict]) -> str:
    last_exc: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        wait_for_rate_limit()
        try:
            response = client.chat.completions.create(
                model=MODEL_ID,
                messages=messages,
                extra_headers={
                    "HTTP-Referer": "https://localhost",  # Required by OpenRouter
                    "X-Title": "Sprite Labeler Script",
                },
            )
            content = response.choices[0].message.content
            return content if content else ""
        except (RateLimitError, APIError) as exc:
            last_exc = exc
            # Handle standard OpenAI header retry logic or fallback
            retry_header = getattr(exc, "response", None)
            retry_after = 2.0  # Default fallback

            # Try to find retry header in headers dict if available
            if hasattr(exc, "headers") and "retry-after" in exc.headers:
                try:
                    retry_after = float(exc.headers["retry-after"])
                except ValueError:
                    pass

            # If it's a 429 (Rate Limit), apply jitter
            if isinstance(exc, RateLimitError) or (
                hasattr(exc, "status_code") and exc.status_code == 429
            ):
                jitter = random.uniform(0.5, 1.5)
                sleep_for = retry_after + jitter
                print(
                    f"Rate limited on attempt {attempt}/{MAX_RETRIES}; "
                    f"sleeping {sleep_for:.1f}s before retrying."
                )
                time.sleep(sleep_for)
            else:
                # Non-rate-limit API errors might not be transient, but we retry anyway for stability
                print(f"API Error on attempt {attempt}: {exc}")
                time.sleep(2)
        except Exception as exc:
            # Unexpected errors (network, etc)
            print(f"Unexpected error on attempt {attempt}: {exc}")
            last_exc = exc
            time.sleep(2)

    if last_exc:
        raise last_exc
    raise RuntimeError("generate_with_backoff failed without capturing an exception")


def describe_image(client: OpenAI, image_path: Path, expected_letter: str | None) -> str:
    base64_image = encode_image(image_path)

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": build_prompt(expected_letter)},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{base64_image}"},
                },
            ],
        }
    ]

    text = generate_with_backoff(client, messages)
    if not text:
        raise ValueError("Empty response from Gemini via OpenRouter")
    return sanitize_label(text, expected_letter)


# --- Main Execution ---

if not SOURCE_ROOT.exists():
    raise SystemExit(f"Source folder not found: {SOURCE_ROOT}")

api_key = resolve_api_key()

# Configure OpenAI client for OpenRouter
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=api_key,
)

DEST_ROOT.mkdir(parents=True, exist_ok=True)

for image_path, expected_letter in iter_source_images(SOURCE_ROOT):
    try:
        label = describe_image(client, image_path, expected_letter)
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to name {image_path}: {exc}")
        fallback_prefix = expected_letter or "item"
        label = f"{fallback_prefix}_unknown"

    letter = destination_letter(label, expected_letter)
    if START_AT_LETTER and letter < START_AT_LETTER.lower():
        print(f"Skipping {image_path} due to START_AT_LETTER={START_AT_LETTER}")
        continue

    dest_dir = DEST_ROOT / letter
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_name = f"{label}.png"
    dest_path = ensure_unique_path(dest_dir, dest_name)
    shutil.copy2(image_path, dest_path)
    print(f"Wrote {dest_path}")
