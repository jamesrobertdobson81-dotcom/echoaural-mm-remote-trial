#!/usr/bin/env python3
"""Generate Instrument Identifier skill icons with transparent backgrounds.

Matches Melody Master skill-icon pixel characteristics:
white stroke pixels only, fully transparent elsewhere (RGB 0,0,0,a=0).

Sources (preferred order):
  1. Newest ChatGPT line drawings in ~/Downloads
  2. Desktop Instruments.png / Ensembles.png (blue badge on white canvas)
  3. assets/icons/modules/{instruments,ensembles}.png

Requires: pip install Pillow
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "icons" / "modules" / "ii-transparent"
OUT_SIZE = 256
FIT_SCALE = 0.90
DOWNLOADS = Path.home() / "Downloads"
DESKTOP = Path.home() / "Desktop"


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


def strip_perimeter_rim(img: Image.Image, ratio: float = 0.045, min_band: int = 40) -> Image.Image:
    w, h = img.size
    px = img.load()
    band = max(min_band, int(min(w, h) * ratio))
    canvas = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        if 0 <= x < w and 0 <= y < h and not canvas[y][x] and px[x, y][3] < 16:
            canvas[y][x] = True
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

    inf = 10**9
    dist = [[inf] * w for _ in range(h)]
    q = deque()
    for y in range(h):
        for x in range(w):
            if canvas[y][x]:
                dist[y][x] = 0
                q.append((x, y))
    while q:
        x, y = q.popleft()
        nd = dist[y][x] + 1
        if nd > band + 4:
            continue
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not canvas[ny][nx] and dist[ny][nx] > nd:
                dist[ny][nx] = nd
                q.append((nx, ny))

    out = img.copy()
    op = out.load()
    for y in range(h):
        for x in range(w):
            if dist[y][x] <= band and op[x, y][3] > 0:
                op[x, y] = (0, 0, 0, 0)
    return out


def process_badge(img: Image.Image) -> Image.Image:
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
    return strip_perimeter_rim(out)


def process_white_on_dark(img: Image.Image) -> Image.Image:
    w, h = img.size
    sp = img.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dp = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = sp[x, y]
            if a < 15:
                continue
            lum, _ = lum_sat(r, g, b)
            if lum < 170:
                continue
            rgba = mm_keep_stroke(r, g, b, a)
            if rgba[3] > 0:
                alpha = int(rgba[3] * (a / 255.0))
                if alpha > 10:
                    dp[x, y] = (255, 255, 255, alpha)
    return out


def process_gray_on_dark(img: Image.Image) -> Image.Image:
    """ChatGPT gray chalk strokes on near-transparent/black canvas."""
    w, h = img.size
    sp = img.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dp = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = sp[x, y]
            if a < 30:
                continue
            lum, _ = lum_sat(r, g, b)
            vis = lum * (a / 255.0)
            if vis < 18:
                continue
            if lum < 28 and a > 200:
                continue
            strength = min(1.0, (vis - 15) / 55.0)
            if strength < 0.12:
                continue
            alpha = int(min(255, 40 + strength * 280))
            if vis >= 50:
                alpha = max(alpha, 200)
            if vis >= 80:
                alpha = max(alpha, 230)
            dp[x, y] = (255, 255, 255, alpha)
    return out


def classify(img: Image.Image) -> str:
    w, h = img.size
    px = img.load()
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    white_canvas = bright = 0
    for y in range(0, h, 8):
        for x in range(0, w, 8):
            r, g, b, a = px[x, y]
            if a < 20:
                continue
            lum, sat = lum_sat(r, g, b)
            if lum > 235 and a > 200:
                white_canvas += 1
            if lum >= 200:
                bright += 1
    corner_lum = sum(lum_sat(c[0], c[1], c[2])[0] for c in corners) / 4
    corner_a = sum(c[3] for c in corners) / 4
    if white_canvas > 200 and corner_lum > 200:
        return "badge"
    if corner_a < 40 or corner_lum < 40:
        return "white_on_dark" if bright > 50 else "gray_on_dark"
    return "white_on_dark"


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


def newest_chatgpt(*needles: str) -> Path | None:
    matches = []
    for p in DOWNLOADS.glob("ChatGPT Image*.png"):
        matches.append(p)
    if not matches:
        return None
    matches.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    # Prefer files whose content matches later via classify; return newest pair by mtime
    return matches[0] if matches else None


def resolve_sources() -> dict[str, Path]:
    """Pick Instruments / Ensembles sources."""
    chatgpt = sorted(DOWNLOADS.glob("ChatGPT Image*.png"), key=lambda p: p.stat().st_mtime, reverse=True)
    # Heuristic: newest two ChatGPT images are often the pair (ensembles, instruments)
    chosen: dict[str, Path] = {}
    for p in chatgpt[:6]:
        img = Image.open(p).convert("RGBA")
        kind = classify(img)
        # Gray chalk = instruments; white-on-dark denser = ensembles
        w, h = img.size
        px = img.load()
        bright = sum(
            1
            for y in range(0, h, 6)
            for x in range(0, w, 6)
            if px[x, y][3] > 30 and lum_sat(px[x, y][0], px[x, y][1], px[x, y][2])[0] >= 200
        )
        if kind == "gray_on_dark" and "instruments" not in chosen:
            chosen["instruments"] = p
        elif kind == "white_on_dark" and bright > 200 and "ensembles" not in chosen:
            chosen["ensembles"] = p
        if len(chosen) == 2:
            break

    if "instruments" not in chosen:
        for p in (DESKTOP / "Instruments.png", ROOT / "assets/icons/modules/instruments.png"):
            if p.exists():
                chosen["instruments"] = p
                break
    if "ensembles" not in chosen:
        for p in (DESKTOP / "Ensembles.png", ROOT / "assets/icons/modules/ensembles.png"):
            if p.exists():
                chosen["ensembles"] = p
                break
    return chosen


def process_file(name: str, src: Path) -> None:
    img = Image.open(src).convert("RGBA")
    kind = classify(img)
    print(f"{name}: {src} ({kind})")
    if kind == "badge":
        out = process_badge(img)
    elif kind == "gray_on_dark":
        out = process_gray_on_dark(img)
    else:
        out = process_white_on_dark(img)
    out = fit_square(out)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out.save(OUT_DIR / f"{name}-transparent.png", optimize=True)
    out.save(OUT_DIR / f"{name}-transparent-v3.png", optimize=True)
    opaque = sum(1 for p in out.getdata() if p[3] > 10)
    print(f"  wrote transparent + v3 (opaque={opaque})")


def main() -> None:
    sources = resolve_sources()
    for name in ("instruments", "ensembles"):
        if name not in sources:
            raise SystemExit(f"Missing source for {name}")
        process_file(name, sources[name])


if __name__ == "__main__":
    main()
