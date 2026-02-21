# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "numpy>=1.26",
#   "opencv-python-headless>=4.10",
#   "Pillow>=10.0",
#   "rembg[cpu]>=2.0",
# ]
# ///

import os

import cv2
import numpy as np
from PIL import Image
from rembg import remove


def trim_transparent_border(image):
    """Crop away fully transparent pixels so the image bounds match visible content."""
    if image.mode != "RGBA":
        return image

    alpha = np.array(image.split()[-1])
    non_transparent = np.argwhere(alpha > 0)
    if non_transparent.size == 0:
        return image

    y_min, x_min = non_transparent.min(axis=0)
    y_max, x_max = non_transparent.max(axis=0) + 1
    return image.crop((x_min, y_min, x_max, y_max))


def process_sheet(image_path, output_folder):
    """Process a 3x3 grid image, splitting into 9 cells, removing backgrounds, and trimming excess space."""
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: Could not find image at {image_path}")
        return

    height, width = img.shape[:2]
    cell_height = height // 3
    cell_width = width // 3

    count = 0
    for row in range(3):
        for col in range(3):
            # Calculate cell boundaries
            y1 = row * cell_height
            y2 = (row + 1) * cell_height if row < 2 else height
            x1 = col * cell_width
            x2 = (col + 1) * cell_width if col < 2 else width

            cell = img[y1:y2, x1:x2]

            # Run rembg to strip the background and produce RGBA output
            cell_rgb = cv2.cvtColor(cell, cv2.COLOR_BGR2RGB)
            pil_input = Image.fromarray(cell_rgb)
            pil_output = remove(pil_input)
            if pil_output.mode != "RGBA":
                pil_output = pil_output.convert("RGBA")

            pil_output = trim_transparent_border(pil_output)

            count += 1
            filename = os.path.join(output_folder, f"item_{count}.png")
            pil_output.save(filename)

    print(f"Success! Processed {count} images into '{output_folder}'.")


input_dir = "./original_assets/3_3_sheets"
output_root = "./processed_assets/3_3_items"

for filename in sorted(os.listdir(input_dir)):
    if not filename.lower().endswith(".png"):
        continue

    letter = filename.split("_", 1)[0]
    image_path = os.path.join(input_dir, filename)
    output_folder = os.path.join(output_root, letter)

    print(f"Processing {image_path} -> {output_folder}")
    process_sheet(image_path, output_folder)
