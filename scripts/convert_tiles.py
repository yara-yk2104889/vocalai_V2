import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "VocalAI Generated"
APP = ROOT / "vocalai_v2"
OUT = APP / "public" / "tiles"

FOLDER_TO_CAT = {
    "Activites": "activities",
    "Body Parts": "body_parts",
    "Core": "core",
    "Emotions": "feelings",
    "Food, Drink": "food_drink",
    "Pain": "pains",
    "People": "people",
    "Phrases": "phrases",
    "Question": "questions",
    "Sensory": "sensory",
}

# filename (lowercased stem) -> tile English label, where they differ
ALIASES = {
    ("core", "i am sick"): "Sick",
    ("sensory", "i need break"): "I need a break",
    ("phrases", "my name is"): "__my_name__",
    ("phrases", "your welcome"): "You're welcome",
    ("sensory", "i feel overwhelmed"): "Feeling overwhelmed",
}


def slug(label: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", label.lower())
    return s.strip("-")


WHITE_MIN = 235       # a pixel counts as background white if all channels are >= this
CARD_WHITE_MIN = 200  # retry level for images drawn as a card with a faint gray border
SENTINEL = (255, 0, 254)


def remove_white_background(im: Image.Image, white_min: int = WHITE_MIN) -> Image.Image:
    """Make white regions touching the image border transparent.

    Only edge-connected white is removed, so white enclosed by outlines
    (eyes, teeth, plates) stays opaque.
    """
    work = im.convert("RGB")
    w, h = work.size
    border = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] \
        + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    for xy in border:
        px = work.getpixel(xy)
        if px != SENTINEL and min(px) >= white_min:
            ImageDraw.floodfill(work, xy, SENTINEL, thresh=255 - white_min)

    rgb = np.asarray(im.convert("RGB")).astype(np.int16)
    bg = np.all(np.asarray(work) == SENTINEL, axis=-1)
    alpha = np.full(bg.shape, 255, dtype=np.uint8)
    alpha[bg] = 0

    # Soften the anti-aliased fringe next to removed areas so no white halo remains.
    near = np.asarray(Image.fromarray(bg.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0
    fringe = near & ~bg
    whiteness = rgb.min(axis=-1)
    alpha[fringe] = np.clip((255 - whiteness[fringe]) * 255 // 60, 0, 255).astype(np.uint8)

    out = im.convert("RGBA")
    out.putalpha(Image.fromarray(alpha))
    return out


entries = []
for folder, cat in FOLDER_TO_CAT.items():
    (OUT / cat).mkdir(parents=True, exist_ok=True)
    for f in sorted((SRC / folder).glob("*.png")):
        label = ALIASES.get((cat, f.stem.lower()), f.stem)
        s = slug(label)
        im = Image.open(f).convert("RGBA")
        im.thumbnail((512, 512), Image.LANCZOS)
        # Mostly-opaque images (e.g. a card with only its outer corners transparent)
        # are flattened onto white so the card background gets removed too.
        if (np.asarray(im.getchannel("A")) < 20).mean() < 0.15:
            im = Image.alpha_composite(Image.new("RGBA", im.size, "white"), im)
            cleared = remove_white_background(im)
            if (np.asarray(cleared.getchannel("A")) < 20).mean() < 0.15:
                cleared = remove_white_background(im, CARD_WHITE_MIN)
            im = cleared
        im.thumbnail((256, 256), Image.LANCZOS)
        im.save(OUT / cat / f"{s}.webp", "WEBP", quality=85)
        entries.append(f"{cat}/{s}")

ts = (
    "// Generated from \"VocalAI Generated/\" by scripts/convert_tiles.py — images live in public/tiles/.\n"
    "export const TILE_IMAGES = new Set<string>([\n"
    + "".join(f'  "{e}",\n' for e in sorted(entries))
    + "]);\n\n"
    "export function tileSlug(label: string): string {\n"
    "  return label.toLowerCase().replace(/[^a-z0-9]+/g, \"-\").replace(/^-+|-+$/g, \"\");\n"
    "}\n\n"
    "export function tileImageFor(cat: string, enLabel: string): string | undefined {\n"
    "  const key = `${cat}/${tileSlug(enLabel)}`;\n"
    "  return TILE_IMAGES.has(key) ? `/tiles/${key}.webp` : undefined;\n"
    "}\n"
)
(APP / "lib" / "tile-images.ts").write_text(ts, encoding="utf-8")
print(len(entries), "images written")
