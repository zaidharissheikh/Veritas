"""Generates extension/icons/icon{16,48,128}.png: a white shield with an accent-blue check
on a rounded accent-blue (#0071e3) square. Dev-only tool, not shipped with the extension.

Usage (from extension/):  python tests/tools/make_icons.py      (needs Pillow)
"""
from pathlib import Path

from PIL import Image, ImageDraw

ACCENT = (0, 113, 227, 255)
WHITE = (255, 255, 255, 255)
SUPERSAMPLE = 8
ICONS_DIR = Path(__file__).resolve().parents[2] / "icons"

# size -> (transparent padding in px, check stroke as a fraction of the tile)
# Chrome's guideline for the 128px icon is a 96px mark with 16px of padding per side.
SPECS = {16: (0, 0.10), 48: (2, 0.075), 128: (16, 0.07)}


def cubic(p0, p1, p2, p3, steps=24):
    """Points along a cubic Bezier curve (excluding the start point)."""
    points = []
    for i in range(1, steps + 1):
        t = i / steps
        mt = 1 - t
        x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
        y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
        points.append((x, y))
    return points


def shield_outline():
    """Shield in unit coordinates (0..1), traced clockwise from the top centre."""
    top, shoulder_r, side_r, tip = (0.5, 0.17), (0.79, 0.27), (0.79, 0.49), (0.5, 0.85)
    shoulder_l, side_l = (1 - shoulder_r[0], shoulder_r[1]), (1 - side_r[0], side_r[1])
    points = [top]
    points += cubic(top, (0.6, 0.23), (0.7, 0.26), shoulder_r)
    points += [side_r]
    points += cubic(side_r, (0.79, 0.68), (0.66, 0.79), tip)
    points += cubic(tip, (0.34, 0.79), (0.21, 0.68), side_l)
    points += [shoulder_l]
    points += cubic(shoulder_l, (0.3, 0.26), (0.4, 0.23), top)
    return points


def draw_tile(draw, origin, extent):
    radius = extent * 0.225
    box = (origin, origin, origin + extent - 1, origin + extent - 1)
    draw.rounded_rectangle(box, radius=radius, fill=ACCENT)


def draw_mark(draw, origin, extent, stroke_fraction):
    to_px = lambda p: (origin + p[0] * extent, origin + p[1] * extent)  # noqa: E731
    draw.polygon([to_px(p) for p in shield_outline()], fill=WHITE)
    check = [to_px(p) for p in ((0.37, 0.51), (0.465, 0.605), (0.64, 0.415))]
    width = stroke_fraction * extent
    draw.line(check, fill=ACCENT, width=round(width), joint="curve")
    for x, y in (check[0], check[-1]):  # round caps
        r = width / 2
        draw.ellipse((x - r, y - r, x + r, y + r), fill=ACCENT)


def render(size):
    padding, stroke = SPECS[size]
    big = size * SUPERSAMPLE
    image = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    origin = padding * SUPERSAMPLE
    extent = big - 2 * origin
    draw_tile(draw, origin, extent)
    draw_mark(draw, origin, extent, stroke)
    return image.resize((size, size), Image.LANCZOS)


def main():
    ICONS_DIR.mkdir(exist_ok=True)
    for size in SPECS:
        path = ICONS_DIR / f"icon{size}.png"
        render(size).save(path, optimize=True)
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
