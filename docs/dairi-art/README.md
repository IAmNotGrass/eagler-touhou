# DAIRI artwork provenance

The 30 selected PNGs in `public/assets/dairi/` are unchanged originals from the
character ZIP packages listed in `selection.json`. That file records each
archive, selected member and SHA-256 digest. The corresponding original package
readme files are retained in this directory, and attribution is delivered in
`assets/dairi/CREDITS.txt`.

The project owner supplied these packages locally. On 2026-10-12 the original 20 selected files were verified byte-for-byte
against those supplied packages. Ten additional packages were downloaded from
the distribution folder: Sanae, Nitori, Patchouli, Suika and six TH20 characters.
Their selected PNGs are also unchanged originals, recorded in `selection.json`. The additional
expressions and costumes in the packages are not included in the application.

`public/assets/dairi/avatars/<character>/<expression>.webp` holds 256px head
crops used as profile avatar presets: every expression in each package's own
通常 (normal) and 赤面 (blush) folders, 470 in all. Props, companion dolls and
alternate costumes are not used. `launcher/scripts/make-dairi-avatars.py` cuts
them from the original packages with the per-character face square in
`avatar-crops.json` (expressions share their character's pose) and regenerates
the expression catalog and the published file list. The package notices permit
editing (加工) for non-commercial use; the crops stay credited to DAIRI / はるか
and are not offered as separate downloads.

Additional characters and the author's root usage notice are available in the
[author's distribution folder](https://drive.google.com/drive/folders/0B34TvJayojX_SU44YUtISFVRTnM?resourcekey=0-mhlyeSSR6Pctax9CSF6FRg).
The root notice was reviewed on 2026-10-12. These third-party illustrations are
not covered by this project's GPL license; retain and consult the original usage
notices when adding or distributing artwork. An accessible download is not a
separate grant of permission.

Game save files used for local acceptance are kept outside the source and public
assets. They are not bundled with the application or its automated test fixtures.
