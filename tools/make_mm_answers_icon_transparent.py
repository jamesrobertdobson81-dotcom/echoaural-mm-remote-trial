#!/usr/bin/env python3
"""Generate Melody Master answers empty-state icon from Homework mode PNG.

Removes the blue gradient tile and outer squircle plate, keeping white line art
on a transparent background.

Requires: pip install Pillow
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "icons" / "dashboard" / "homework.png"
OUT_DIR = ROOT / "assets" / "icons" / "modes" / "mm-transparent"
OUT_SIZE = 256
# Crop margin — excludes the drawn squircle plate at the edges of the source tile.
CROP_MARGIN_RATIO = 0.11
# Scale art to this fraction of OUT_SIZE so corners are not clipped in the UI.
ART_SCALE = 0.86
MM_PINK = (255, 93, 186)  # #FF5DBA


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


def crop_inner(img: Image.Image) -> Image.Image:
    w, h = img.size
    m = int(min(w, h) * CROP_MARGIN_RATIO)
    return img.crop((m, m, w - m, h - m))


def trim_edge_halo(img: Image.Image) -> Image.Image:
    """Remove anti-aliased squircle remnants along the outer rim."""
    w, h = img.size
    cx, cy = (w - 1) / 2, (h - 1) / 2
    max_r = math.hypot(cx, cy)
    keep_r = max_r * 0.92
    out = img.copy()
    px = out.load()
    for y in range(h):
        for x in range(w):
            if math.hypot(x - cx, y - cy) > keep_r:
                px[x, y] = (255, 255, 255, 0)
    return out


def tint_pixel(
    r: int, g: int, b: int, a: int, x: int, y: int, w: int, h: int
) -> tuple[int, int, int, int]:
    """Keep mostly white line art; add soft MM-pink accents on selected strokes."""
    if a == 0:
        return (r, g, b, a)

    nx = x / max(w - 1, 1)
    ny = y / max(h - 1, 1)

    strength = 0.0

    # Pen body and tip — upper-right accent.
    pen_dist = math.hypot(nx - 0.74, ny - 0.30)
    if pen_dist < 0.22:
        strength = max(strength, max(0.0, 1.0 - pen_dist / 0.22) * 0.42)

    # Right-hand page lines — very light pink wash.
    if 0.48 < nx < 0.72 and 0.38 < ny < 0.82:
        strength = max(strength, 0.14)

    # Book spine fold — faint accent.
    spine_dist = math.hypot(nx - 0.46, ny - 0.58)
    if spine_dist < 0.12:
        strength = max(strength, max(0.0, 1.0 - spine_dist / 0.12) * 0.18)

    if strength <= 0:
        return (r, g, b, a)

    pr, pg, pb = MM_PINK
    blend = min(1.0, strength)
    return (
        int(r * (1 - blend) + pr * blend),
        int(g * (1 - blend) + pg * blend),
        int(b * (1 - blend) + pb * blend),
        a,
    )


def fit_on_canvas(img: Image.Image, size: int, scale: float) -> Image.Image:
    """Centre art on a square canvas with inset so edges do not clip."""
    target = max(1, int(size * scale))
    ratio = min(target / img.width, target / img.height)
    resized = img.resize(
        (max(1, int(img.width * ratio)), max(1, int(img.height * ratio))),
        Image.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ox = (size - resized.width) // 2
    oy = (size - resized.height) // 2
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def trim_transparent(img: Image.Image, pad: int = 8) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(img.width, x1 + pad)
    y1 = min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1))


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    img = crop_inner(img)
    out = Image.new("RGBA", img.size)
    out.putdata([process_pixel(*px) for px in img.getdata()])
    out = trim_edge_halo(out)
    out = trim_transparent(out)

    w, h = out.size
    tinted = out.copy()
    px_out = tinted.load()
    px_in = out.load()
    for y in range(h):
        for x in range(w):
            px_out[x, y] = tint_pixel(*px_in[x, y], x, y, w, h)

    out = fit_on_canvas(tinted, OUT_SIZE, ART_SCALE)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    dest = OUT_DIR / "answers-transparent.png"
    out.save(dest, optimize=True)
    print(f"Wrote {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
