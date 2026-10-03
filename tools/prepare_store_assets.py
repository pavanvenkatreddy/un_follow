from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "store-assets"
RESULTS_SOURCE = ASSETS / "source-results.png"
POPUP_SOURCE = ASSETS / "source-popup.png"
SCREENSHOT_OUT = ASSETS / "screenshot-1280x800.png"
PROMO_OUT = ASSETS / "small-promo-440x280.png"


def main():
    require_source(RESULTS_SOURCE)
    require_source(POPUP_SOURCE)
    make_screenshot()
    make_promo()
    print(f"Wrote {SCREENSHOT_OUT}")
    print(f"Wrote {PROMO_OUT}")


def require_source(path):
    if not path.exists():
        raise SystemExit(f"Missing {path}. Save the screenshot there and rerun this script.")


def make_screenshot():
    source = Image.open(RESULTS_SOURCE).convert("RGB")
    image = cover_resize(source, 1280, 800)
    image.save(SCREENSHOT_OUT, quality=94)


def make_promo():
    popup = Image.open(POPUP_SOURCE).convert("RGBA")
    results = Image.open(RESULTS_SOURCE).convert("RGB")

    canvas = Image.new("RGB", (440, 280), "#111111")
    draw = ImageDraw.Draw(canvas)

    for y in range(280):
      shade = int(17 + y * 0.025)
      draw.line((0, y, 440, y), fill=(shade, shade, shade))

    icon_path = ROOT / "icons" / "icon128.png"
    if icon_path.exists():
        icon = Image.open(icon_path).convert("RGBA").resize((76, 76), Image.Resampling.LANCZOS)
        canvas.paste(icon, (28, 34), icon)

    title_color = "#fafafa"
    muted = "#b7b7b7"
    accent = "#ffdb70"
    draw.text((28, 124), "Follow Check", fill=title_color)
    draw.text((28, 150), "Local Instagram follower comparisons", fill=muted)
    draw.rounded_rectangle((28, 194, 184, 236), radius=18, fill="#ffdb70")
    draw.text((58, 206), "Local first", fill="#111111")

    thumb = cover_resize(results, 260, 170).convert("RGBA")
    thumb = round_corners(thumb, 20)
    thumb = add_shadow(thumb)
    canvas.paste(thumb, (190, 48), thumb)

    popup_thumb = contain_resize(popup, 86, 144)
    popup_thumb = round_corners(popup_thumb, 18)
    popup_thumb = add_shadow(popup_thumb)
    canvas.paste(popup_thumb, (322, 94), popup_thumb)

    canvas.save(PROMO_OUT, quality=94)


def cover_resize(image, width, height):
    src_w, src_h = image.size
    scale = max(width / src_w, height / src_h)
    resized = image.resize((round(src_w * scale), round(src_h * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def contain_resize(image, width, height):
    src_w, src_h = image.size
    scale = min(width / src_w, height / src_h)
    return image.resize((round(src_w * scale), round(src_h * scale)), Image.Resampling.LANCZOS)


def round_corners(image, radius):
    image = image.convert("RGBA")
    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, image.width - 1, image.height - 1), radius=radius, fill=255)
    image.putalpha(mask)
    return image


def add_shadow(image):
    pad = 18
    shadow = Image.new("RGBA", (image.width + pad * 2, image.height + pad * 2), (0, 0, 0, 0))
    mask = image.getchannel("A").filter(ImageFilter.GaussianBlur(10))
    shadow_alpha = Image.new("RGBA", image.size, (0, 0, 0, 120))
    shadow_alpha.putalpha(mask)
    shadow.alpha_composite(shadow_alpha, (pad, pad + 4))
    shadow.alpha_composite(image, (pad, pad))
    return shadow


if __name__ == "__main__":
    main()
