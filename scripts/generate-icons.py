"""从 resources/icon-source.png 生成 Android 启动图标各密度 PNG。"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "resources" / "icon-source.png"
RES = ROOT / "android" / "app" / "src" / "main" / "res"
PUBLIC = ROOT / "public"

LAUNCHER = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
FOREGROUND = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}


def pick_background(img: Image.Image) -> tuple[int, int, int, int]:
    """取四角中最亮的像素作为背景色，避免误采音符阴影。"""
    w, h = img.size
    corners = [
        img.getpixel((2, 2)),
        img.getpixel((w - 3, 2)),
        img.getpixel((2, h - 3)),
        img.getpixel((w - 3, h - 3)),
    ]

    def luminance(p: tuple[int, ...]) -> int:
        return p[0] + p[1] + p[2]

    best = max(corners, key=luminance)
    return best[:3] + (255,)


def clean_edge_shadow(img: Image.Image, bg: tuple[int, int, int, int], margin: int = 12) -> Image.Image:
    """清理贴边阴影，避免顶部/边缘出现深色细线。"""
    cleaned = img.copy()
    w, h = cleaned.size
    bg_luma = bg[0] + bg[1] + bg[2]
    for y in range(h):
        for x in range(w):
            if x >= margin and x < w - margin and y >= margin and y < h - margin:
                continue
            p = cleaned.getpixel((x, y))
            if p[0] + p[1] + p[2] < bg_luma - 40:
                cleaned.putpixel((x, y), bg)
    return cleaned


def make_square(img: Image.Image) -> tuple[Image.Image, tuple[int, int, int]]:
    bg = pick_background(img)
    img = clean_edge_shadow(img, bg)
    w, h = img.size
    size = max(w, h)
    square = Image.new("RGBA", (size, size), bg)
    square.paste(img, ((size - w) // 2, (size - h) // 2), img)
    return square, bg[:3]


def save_png(img: Image.Image, path: Path, size: int, bg: tuple[int, int, int]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    if resized.mode == "RGBA":
        canvas = Image.new("RGB", resized.size, bg)
        canvas.paste(resized, mask=resized.split()[3])
        canvas.save(path, "PNG", optimize=True)
    else:
        resized.save(path, "PNG", optimize=True)


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"缺少源图: {SRC}")

    square, bg = make_square(Image.open(SRC).convert("RGBA"))
    print(f"background rgb={bg}")

    for density, size in LAUNCHER.items():
        folder = RES / f"mipmap-{density}"
        save_png(square, folder / "ic_launcher.png", size, bg)
        save_png(square, folder / "ic_launcher_round.png", size, bg)

    for density, size in FOREGROUND.items():
        folder = RES / f"mipmap-{density}"
        save_png(square, folder / "ic_launcher_foreground.png", size, bg)

    save_png(square, PUBLIC / "app-icon.png", 512, bg)
    square_rgb = Image.new("RGB", square.size, bg)
    square_rgb.paste(square, mask=square.split()[3])
    square_rgb.save(PUBLIC / "app-icon.jpg", "JPEG", quality=92)
    print("generated icons from", SRC)


if __name__ == "__main__":
    main()
