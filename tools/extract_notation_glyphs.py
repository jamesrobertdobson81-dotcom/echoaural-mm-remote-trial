#!/usr/bin/env python3
"""Extract standalone clef / note / accidental glyphs from the Desktop reference
collages into assets/icons/notation/, for use across Melodic Intervals, Harmony
Explorer's key-signature app, and any future notation-drawing app.

Each source collage is a transparent PNG with 2-3 glyphs side by side; this
crops each to its tight bounding box (plus a small margin) and caps the
longer edge so files stay small without softening at typical stave sizes.

Requires: pip install Pillow
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DESKTOP = Path.home() / "Desktop"
OUT_DIR = ROOT / "assets" / "icons" / "notation"
MAX_EDGE = 420
MARGIN_RATIO = 0.04

# name -> (source collage, crop box (left, right) at full collage width)
SOURCES = [
    ("treble-clef", "clefs png icons.png", (215, 354)),
    ("alto-clef", "clefs png icons.png", (680, 837)),
    ("bass-clef", "clefs png icons.png", (1135, 1341)),
    ("crotchet", "crotchet quaver and semiquaver png icons.png", (246, 339)),
    ("quaver", "crotchet quaver and semiquaver png icons.png", (729, 880)),
    ("semiquaver", "crotchet quaver and semiquaver png icons.png", (1175, 1333)),
    ("sharp", "Sharp and flat pngs icons.png", (864, 943)),
    ("flat", "Sharp and flat pngs icons.png", (1284, 1375)),
]


ALPHA_THRESHOLD = 40  # ignore near-invisible stray alpha noise when computing the tight bbox


def tight_bbox(img: Image.Image, threshold: int = ALPHA_THRESHOLD):
    alpha = img.getchannel("A").point(lambda a: 255 if a > threshold else 0)
    return alpha.getbbox()


def process(name: str, src_name: str, box: tuple[int, int]) -> None:
    src = DESKTOP / src_name
    img = Image.open(src).convert("RGBA")
    left, right = box
    strip = img.crop((left, 0, right, img.size[1]))
    bbox = tight_bbox(strip)
    if bbox is None:
        raise RuntimeError(f"No opaque content for {name} in {src_name}")
    tight = strip.crop(bbox)
    w, h = tight.size
    margin = round(max(w, h) * MARGIN_RATIO)
    padded = Image.new("RGBA", (w + margin * 2, h + margin * 2), (0, 0, 0, 0))
    padded.paste(tight, (margin, margin), tight)

    pw, ph = padded.size
    scale = min(1.0, MAX_EDGE / max(pw, ph))
    if scale < 1.0:
        padded = padded.resize((max(1, round(pw * scale)), max(1, round(ph * scale))), Image.LANCZOS)

    dest = OUT_DIR / f"{name}.png"
    padded.save(dest, optimize=True)
    print(f"Wrote {dest.relative_to(ROOT)} {padded.size}")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, src_name, box in SOURCES:
        process(name, src_name, box)


if __name__ == "__main__":
    main()
