"""Render the app icon: the site's touhou98 yin-yang glyph, white on the
launcher's dark rounded tile, at 1024px for `tauri icon` to scale."""

from pathlib import Path
from tempfile import TemporaryDirectory

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

SIZE = 1024


def main() -> None:
    here = Path(__file__).resolve().parent.parent
    font = TTFont(here.parent / "launcher/public/assets/fonts/touhou98.woff2")
    font.flavor = None
    with TemporaryDirectory() as temporary:
        ttf = Path(temporary) / "touhou98.ttf"
        font.save(ttf)
        face = ImageFont.truetype(str(ttf), 700)
        image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((40, 40, SIZE - 40, SIZE - 40), radius=200, fill=(23, 23, 21, 255))
        left, top, right, bottom = face.getbbox("☯")
        draw.text(((SIZE - right + left) // 2 - left, (SIZE - bottom + top) // 2 - top), "☯", font=face, fill=(235, 231, 223, 255))
        image.save(here / "app-icon.png")


if __name__ == "__main__":
    main()
