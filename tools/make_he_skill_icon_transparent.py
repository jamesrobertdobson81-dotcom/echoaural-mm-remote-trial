#!/usr/bin/env python3
"""Generate the Harmony Explorer "Key Signatures" skill icon with a transparent background.

Same badge-to-line-art pipeline as tools/make_ii_skill_icons_transparent.py:
removes the white canvas, strips the blue gradient tile, keeps only the white
line art, and strips the anti-aliased rim left at the tile edge.

Requires: pip install Pillow
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path.home() / "Desktop" / "Key Signature App.png"
OUT_DIR = ROOT / "assets" / "icons" / "modules" / "he-transparent"
OUT_NAME = "key-signatures-transparent"
OUT_SIZE = 256
FIT_SCALE = 0.98


def lum_sat(r: int, g: int, b: int) -> tuple[float, float]:
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    mx, mn = max(r, g, b), min(r, g, b)
    sat = (mx - mn) / mx if mx else 0.0
    return lum, sat


def mm_keep_stroke(r: int, g: int, b: int, _a: int) -> tuple[int, int, int, int]:
    """Same keep logic as tools/make_mm_skill_icons_transparent.py."""
    lum, sat = lum_sat(r, g, b)
    if lum < 25:
        return (0, 0, 0, 0)
    if lum >= 185 and sat < 0.35:
        alpha = min(255, int(255 * (lum - 150) / 105))
        if lum >= 220:
            alpha = max(alpha, 200)
        return (255, 255, 255, alpha)
    if b > r + 20 and b > g - 5:
        return (0, 0, 0, 0)
    if lum >= 120:
        alpha = int(min(255, (lum - 100) * 2.5))
        return (255, 255, 255, alpha)
    return (0, 0, 0, 0)


def flood_white_canvas(img: Image.Image) -> list[list[bool]]:
    w, h = img.size
    px = img.load()
    mask = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def is_canvas(r: int, g: int, b: int, a: int) -> bool:
        if a < 30:
            return True
        lum, sat = lum_sat(r, g, b)
        return lum > 235 and sat < 0.08

    def push(x: int, y: int) -> None:
        if 0 <= x < w and 0 <= y < h and not mask[y][x] and is_canvas(*px[x, y]):
            mask[y][x] = True
            q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)
    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            push(nx, ny)
    return mask


def process_badge(img: Image.Image) -> Image.Image:
    # Note: unlike the II badges this pipeline was copied from, this source is
    # sparse line art (thin strokes on an otherwise-transparent result), so the
    # flood-based strip_perimeter_rim step (tuned for denser badge content)
    # treats nearly every stroke pixel as "near an edge" and erases the art.
    # The white-canvas removal + stroke-keep pass alone is already clean here.
    w, h = img.size
    sp = img.load()
    canvas = flood_white_canvas(img)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dp = out.load()
    for y in range(h):
        for x in range(w):
            if canvas[y][x]:
                continue
            dp[x, y] = mm_keep_stroke(*sp[x, y])
    return out


def fit_square(img: Image.Image, size: int = OUT_SIZE, scale: float = FIT_SCALE) -> Image.Image:
    bbox = img.getbbox()
    if bbox is None:
        raise RuntimeError("No opaque content")
    pad = 10
    l, t, r, b = bbox
    l, t = max(0, l - pad), max(0, t - pad)
    r, b = min(img.size[0], r + pad), min(img.size[1], b + pad)
    cropped = img.crop((l, t, r, b))
    cw, ch = cropped.size
    s = min(size / cw, size / ch) * scale
    nw, nh = max(1, int(round(cw * s))), max(1, int(round(ch * s)))
    scaled = cropped.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(scaled, ((size - nw) // 2, (size - nh) // 2), scaled)
    px = canvas.load()
    for y in range(size):
        for x in range(size):
            r, g, b, a = px[x, y]
            if a < 70:
                px[x, y] = (0, 0, 0, 0)
            else:
                px[x, y] = (255, 255, 255, max(a, 200) if a >= 90 else a)
    return canvas


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source: {SRC}")
    img = Image.open(SRC).convert("RGBA")
    out = process_badge(img)
    out = fit_square(out)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    dest = OUT_DIR / f"{OUT_NAME}.png"
    out.save(dest, optimize=True)
    opaque = sum(1 for p in out.getdata() if p[3] > 10)
    print(f"Wrote {dest.relative_to(ROOT)} (opaque={opaque})")


if __name__ == "__main__":
    main()
