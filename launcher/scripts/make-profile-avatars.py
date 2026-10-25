"""Cut the profile avatar presets from the DAIRI packages and 幻想人形演舞 portraits.

Usage (from launcher/, needs ImageMagick 7):
  python3 scripts/make-profile-avatars.py DAIRI_PACKAGES_DIR TPDP_PORTRAITS_DIR

DAIRI_PACKAGES_DIR mirrors the DAIRI distribution folder: <work folder>/<character>.zip.
TPDP_PORTRAITS_DIR holds the 幻想人形演舞 portraits as <entry>_<variant>.png.
docs/dairi-art/avatar-sources.json and docs/tpdp-art/avatar-sources.json name,
for each character, the outfits to use: the source (a folder inside a DAIRI
archive, or a list of portrait files), an outfit id ("" for the default) and a
face square [centre x, centre y, side] in source pixels. Every expression of an
outfit shares its pose, so the one square serves them all.

Writes 256px WebP crops to public/assets/<set>/avatars/<character>/[<outfit>/]<expression>.webp,
the catalog app/models/profile-avatar-catalog.ts, and the published file list
between the "profile avatars" markers in lib/frontend-static-manifest.mjs. The
sources themselves are never copied.
"""
import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

LAUNCHER = Path(__file__).resolve().parent.parent
SETS = {"dairi": LAUNCHER.parent / "docs/dairi-art/avatar-sources.json", "tpdp": LAUNCHER.parent / "docs/tpdp-art/avatar-sources.json"}
CATALOG = LAUNCHER / "app/models/profile-avatar-catalog.ts"
MANIFEST = LAUNCHER / "lib/frontend-static-manifest.mjs"
PAD = 600  # Crops may run past the canvas edge; transparent padding keeps them square.

# Package expression names -> stable ids, in display order. Variant spellings
# share an id; a trailing 影 adds "-shade" and a trailing number "-<n>".
EXPRESSIONS = {
    "微笑": "smile", "朗らか": "cheerful", "余裕": "confident", "普通": "neutral", "普": "neutral", "笑い": "laugh",
    "強気笑い": "bold-laugh", "にひひ": "grin", "苦笑": "wry-smile", "ウインク": "wink", "べろ": "tongue", "ドヤ": "smug", "どや": "smug",
    "不敵": "fearless", "強気": "bold", "皮肉っぽい": "sarcastic", "恍惚": "ecstatic", "イイネ！": "nice",
    "そうこなくっちゃ": "eager", "ワクワクするぜ～": "excited", "マジだよ": "for-real", "真剣": "serious", "気迫": "fierce",
    "ふむ": "musing", "思案": "pondering", "考え中": "pondering", "思案汗": "pondering-sweat", "回答": "explaining",
    "あ！": "ah", "ん！": "hm", "驚く": "surprised", "驚き": "surprised", "吃驚": "surprised", "焦り": "flustered",
    "焦る": "flustered", "慌て": "flustered", "緊張": "nervous", "迫真": "intense", "困惑": "puzzled", "惑い": "puzzled",
    "困り": "troubled", "困る": "troubled", "困": "troubled", "弱る": "dismayed", "落ち込み": "dismayed",
    "・・・・": "speechless", "これだから…": "sigh", "ったく今の若いもんは": "grumble", "不満": "pout",
    "不機嫌": "sulky", "呆れ": "exasperated", "＞＜": "scrunched", "怒る": "angry", "怒り": "angry", "睨む": "glare",
    "剣呑": "menacing", "狂気": "mad", "泣く": "cry", "特殊": "special",
    "楽": "joy", "喜": "delight", "喜び": "delight", "嬉": "delight", "うきうき": "elated", "楽観": "optimistic", "照れ": "shy",
    "照れ顔": "shy", "照笑": "shy-smile", "ハート": "smitten", "恍惚": "ecstatic", "笑う": "laugh", "哄笑": "guffaw",
    "不敵な笑み": "fearless", "ドヤ顔": "smug", "ドヤァ": "smug", "挑発": "taunt", "嘲り": "mocking", "ふーん": "hmph",
    "とぼけ": "playing-dumb", "真顔": "straight-face", "目閉じ": "eyes-closed", "きょとん": "blank", "惚け": "dazed",
    "ぐるぐる": "dizzy", "mgmg": "munching", "にがーい": "bitter", "ちょっと驚き": "startled", "驚愕": "shocked", "愕然": "shocked",
    "訝し": "suspicious", "悩む": "worried", "悟り": "enlightened", "堪え": "enduring", "弱り": "dismayed", "どんより": "gloomy",
    "困り涙": "teary", "泣き": "cry", "哀": "sad", "悲壮": "tragic", "絶望": "despair", "痛い": "pained", "屈辱": "humiliated",
    "敗北": "defeated", "滝汗": "sweating", "ドン引き": "appalled", "引き": "appalled", "軽蔑": "contempt",
    "ゴミをみるような目": "disdain", "ゴミを見るような目": "disdain", "膨れ": "puffed", "不服": "disgruntled", "いらっ": "irritated",
    "怒": "angry", "激怒": "furious", "にらみ": "glare", "俺の話聞いて": "listen", "コケー！": "cluck", "こーん": "kon",
    "機能停止": "shutdown", "気づく": "noticing", "汗": "sweating", "涙": "teary", "": "neutral", "通常": "neutral", "陽気": "cheerful",
    "驚": "surprised", "流し目笑": "sidelong-smile", "睨": "glare", "レッツディガップ！": "lets-dig", "手加減無用！": "no-mercy", "おろかものめが": "fool", "すべて無に返そう": "annihilate",
}
# Folders whose PNGs are a variant's expressions; 赤面 holds the blushing ones.
GROUPS = {"通常": False, "表情": False, "表情差分": False, "感情差分": False, "赤面": True}
# Companions, props, battle poses, damaged clothes and second poses are not outfits.
EXCLUDED = re.compile(r"(^|/)(上海蓬莱|上海＆蓬莱人形|感情お面|バトル|服ビリ|ポーズ[2-9])$")
ORDER = list(dict.fromkeys(EXPRESSIONS.values()))


def member_name(info):
    name = info.filename
    if not info.flag_bits & 0x800:
        try:
            name = name.encode("cp437").decode("cp932")
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
    return name


def expression_id(label, unknown):
    """Stable id for a package expression name; unknown names get x<n>."""
    blush = "赤面" in label
    label = label.replace("赤面", "")
    shade = label.endswith("影")
    label = label.removesuffix("影")
    number = re.search(r"(\d+)$", label)
    label = label[: number.start()] if number else label
    base = EXPRESSIONS.get(label)
    if base is None:
        base = unknown.setdefault(label, f"x{len(unknown) + 1}")
    return ("blush-" if blush else "") + base + ("-shade" if shade else "") + (f"-{number.group(1)}" if number else "")


def outfit_folders(archive):
    """Folders holding a variant's expression PNGs: {folder: [(member, label, blushing)]}.
    Expressions sit in 通常/赤面-style group folders or directly in a folder; loose
    files beside group folders are props and ignored."""
    grouped, loose = {}, {}
    for info in archive.infolist():
        match = re.fullmatch(r"(.+)/([^/]*?)[（(](.+)[）)]\.png", member_name(info))
        if not match:
            continue
        parent, label = match.group(1), match.group(3)
        leaf = parent.rsplit("/", 1)[-1]
        if leaf in GROUPS:
            folder = parent.rsplit("/", 1)[0] if "/" in parent else ""
            grouped.setdefault(folder, []).append((info, label, GROUPS[leaf]))
        else:
            loose.setdefault(parent, []).append((info, label, False))
    folders = {**{folder: members for folder, members in loose.items() if folder not in grouped}, **grouped}
    return {folder: members for folder, members in folders.items() if not EXCLUDED.search(folder)}


def expressions(archive, folder, first, unknown):
    """(id, member) pairs of an outfit folder, the requested first expression leading."""
    found = {}
    for info, label, blush in outfit_folders(archive).get(folder, []):
        found.setdefault(expression_id(("赤面" if blush else "") + label, unknown), info)

    def rank(key):
        plain = key.removeprefix("blush-")
        base = re.sub(r"(-shade)?(-\d+)?$", "", plain)
        return (key != first, key.startswith("blush-"), ORDER.index(base) if base in ORDER else len(ORDER), plain)
    return [(key, found[key]) for key in sorted(found, key=rank)]


def crop(source, target, square):
    cx, cy, side = square
    x, y = round(cx - side / 2) + PAD, round(cy - side / 2) + PAD
    subprocess.run(["magick", source, "-bordercolor", "none", "-border", str(PAD),
                    "-crop", f"{side}x{side}+{x}+{y}", "+repage", "-resize", "256x256",
                    "-define", "webp:alpha-quality=90", "-quality", "80", target], check=True)


def main(dairi_packages, tpdp_portraits):
    catalog, files, unknown = {}, [], {}
    with tempfile.TemporaryDirectory() as work:
        for art, sources_path in SETS.items():
            output = LAUNCHER / f"public/assets/{art}/avatars"
            shutil.rmtree(output, ignore_errors=True)
            for character, outfits in json.loads(sources_path.read_text())["characters"].items():
                catalog_id = character if art == "dairi" else f"{art}-{character}"
                catalog[catalog_id] = []
                for outfit in outfits:
                    target_dir = output / character / outfit["costume"] if outfit["costume"] else output / character
                    target_dir.mkdir(parents=True, exist_ok=True)
                    if "files" in outfit:
                        # Portraits carry no expression names: number them in order.
                        chosen = [(f"face-{index + 1}", Path(tpdp_portraits) / name) for index, name in enumerate(outfit["files"])]
                        for key, source in chosen:
                            crop(source, target_dir / f"{key}.webp", outfit["crop"])
                            files.append((target_dir / f"{key}.webp").relative_to(LAUNCHER / "public").as_posix())
                    else:
                        with zipfile.ZipFile(Path(dairi_packages) / outfit["archive"]) as archive:
                            chosen = expressions(archive, outfit["folder"], outfit.get("first", "smile"), unknown)
                            for key, info in chosen:
                                source = Path(work) / "source.png"
                                source.write_bytes(archive.read(info))
                                crop(source, target_dir / f"{key}.webp", outfit["crop"])
                                files.append((target_dir / f"{key}.webp").relative_to(LAUNCHER / "public").as_posix())
                    catalog[catalog_id].append((outfit["costume"], [key for key, _ in chosen]))
    rows = ",\n".join(f"  {json.dumps(character)}: [{', '.join(f'[{json.dumps(costume)}, {json.dumps(keys)}]' for costume, keys in outfits)}]"
                      for character, outfits in catalog.items())
    names = {code: label for label, code in unknown.items()}
    CATALOG.write_text(
        "// Generated by scripts/make-profile-avatars.py; do not edit.\n"
        "/** Per character, its outfits (\"\" is the default) and their expression ids, the default avatar first. */\n"
        f"export const AVATAR_CATALOG = {{\n{rows},\n}} as const;\n"
        "/** Package names of expressions without a translation, by id. */\n"
        f"export const AVATAR_EXPRESSION_NAMES: Record<string, string> = {json.dumps(names, ensure_ascii=False)};\n")
    manifest = MANIFEST.read_text()
    begin = "  // BEGIN profile avatars: generated by scripts/make-profile-avatars.py\n"
    end = "  // END profile avatars\n"
    head, rest = manifest.split(begin)
    _, tail = rest.split(end)
    MANIFEST.write_text(head + begin + "".join(f"  ['{file}', false],\n" for file in files) + end + tail)
    print(f"{len(files)} avatars for {len(catalog)} characters")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
