#!/usr/bin/env python3
"""Generate Teacher/Student login icons with transparent backgrounds.

Removes the blue gradient tile from assets/icons/login/*.png, keeping white
line art (same pixel keep logic as Melody Master skill icons).

Original assets are unchanged. Output:
  assets/icons/login/login-transparent/{name}-transparent.png

Requires: pip install Pillow
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "assets" / "icons" / "login"
OUT_DIR = SRC_DIR / "login-transparent"
NAMES = ("teacher-login", "student-login")
OUT_SIZE = 256


def process_pixel(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    if a < 20:
        return (0, 0, 0, 0)

    lum = 0.299 * r + 0.587 * g + 0.114 * b
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    sat = (max_c - min_c) / max_c if max_c > 0 else 0

    if lum < 25:
        return (0, 0, 0, 0)

    if lum >= 185 and sat < 0.35:
        alpha = min(255, int(255 * (lum - 150) / 105))
        alpha = max(alpha, 200) if lum >= 220 else alpha
        return (255, 255, 255, alpha)

    # Blue gradient plate / glow
    if b > r + 20 and b > g - 5:
        return (0, 0, 0, 0)

    if lum >= 120:
        alpha = int(min(255, (lum - 100) * 2.5))
        return (255, 255, 255, alpha)

    return (0, 0, 0, 0)


def crop_to_content(img: Image.Image, pad: int = 8) -> Image.Image:
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(img.width, right + pad)
    bottom = min(img.height, bottom + pad)
    return img.crop((left, top, right, bottom))


def fit_square(img: Image.Image, size: int, scale: float = 0.90) -> Image.Image:
    img = crop_to_content(img)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    target = max(1, int(size * scale))
    fitted = img.copy()
    fitted.thumbnail((target, target), Image.LANCZOS)
    x = (size - fitted.width) // 2
    y = (size - fitted.height) // 2
    canvas.paste(fitted, (x, y), fitted)
    return canvas


def process_file(name: str) -> Path:
    src = SRC_DIR / f"{name}.png"
    img = Image.open(src).convert("RGBA")
    out = Image.new("RGBA", img.size)
    out.putdata([process_pixel(*px) for px in img.getdata()])
    out = fit_square(out, OUT_SIZE)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    dest = OUT_DIR / f"{name}-transparent.png"
    out.save(dest, optimize=True)
    print(f"Wrote {dest.relative_to(ROOT)}")
    return dest


def main() -> None:
    for name in NAMES:
        process_file(name)


if __name__ == "__main__":
    main()
