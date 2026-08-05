from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "assets" / "icons"

COLORS = {
    "background": "#173b52",
    "blue": "#1f637c",
    "cream": "#fffdf8",
    "gold": "#f2c66d",
    "line": "#d7e4e3",
}


def scale(value, size):
    return round(value * size / 512)


def draw_icon(size):
    image = Image.new("RGBA", (size, size), COLORS["background"])
    draw = ImageDraw.Draw(image)
    radius = scale(96, size)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=COLORS["background"])
    draw.ellipse((scale(342, size), scale(62, size), scale(450, size), scale(170, size)), fill=COLORS["gold"])
    draw.polygon(
        [(scale(112, size), scale(232, size)), (scale(256, size), scale(104, size)),
         (scale(400, size), scale(232, size)), (scale(374, size), scale(260, size)),
         (scale(256, size), scale(160, size)), (scale(138, size), scale(260, size))],
        fill=COLORS["gold"],
    )
    draw.rectangle((scale(148, size), scale(232, size), scale(364, size), scale(406, size)), fill=COLORS["cream"])
    draw.rectangle((scale(224, size), scale(294, size), scale(288, size), scale(406, size)), fill=COLORS["blue"])
    draw.rounded_rectangle((scale(180, size), scale(270, size), scale(228, size), scale(318, size)), radius=scale(8, size), fill=COLORS["blue"])
    draw.rounded_rectangle((scale(284, size), scale(270, size), scale(332, size), scale(318, size)), radius=scale(8, size), fill=COLORS["blue"])
    draw.line((scale(176, size), scale(336, size), scale(336, size), scale(336, size)), fill=COLORS["line"], width=max(1, scale(10, size)), joint="curve")
    return image


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    sizes = {
        "icon-512.png": 512,
        "icon-192.png": 192,
        "apple-touch-icon.png": 180,
        "favicon-32.png": 32,
        "favicon-16.png": 16,
    }
    for filename, size in sizes.items():
        draw_icon(size).save(OUTPUT_DIR / filename, format="PNG", optimize=True)


if __name__ == "__main__":
    main()
