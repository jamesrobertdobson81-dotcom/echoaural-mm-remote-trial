#!/usr/bin/env python3
"""Generate Melody Master skill icons with transparent backgrounds.

Removes the blue gradient tile from shared module PNGs, keeping white line art.
Original assets in assets/icons/modules/ are unchanged (used by other modules).

Requires: pip install Pillow
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "assets" / "icons" / "modules"
OUT_DIR = SRC_DIR / "mm-transparent"
NAMES = ("melodic-dictation", "melodic-intervals", "melodic-devices")
OUT_SIZE = 256


def process_pixel(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    sat = (max_c - min_c) / max_c if max_c > 0 else 0

    if lum < 25:
        return (255, 255, 255, 0)

    if lum >= 185 and sat < 0.35:
        alpha = min(255, int(255 * (lum - 150) / 105))
        alpha = max(alpha, 200) if lum >= 220 else alpha
        return (255, 255, 255, alpha)

    if b > r + 20 and b > g - 5:
        return (255, 255, 255, 0)

    if lum >= 120:
        alpha = int(min(255, (lum - 100) * 2.5))
        return (255, 255, 255, alpha)

    return (255, 255, 255, 0)


def process_file(name: str) -> None:
    src = SRC_DIR / f"{name}.png"
    img = Image.open(src).convert("RGBA")
    out = Image.new("RGBA", img.size)
    out.putdata([process_pixel(*px) for px in img.getdata()])
    out = out.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    dest = OUT_DIR / f"{name}-transparent.png"
    out.save(dest, optimize=True)
    print(f"Wrote {dest.relative_to(ROOT)}")


def main() -> None:
    for name in NAMES:
        process_file(name)


if __name__ == "__main__":
    main()
