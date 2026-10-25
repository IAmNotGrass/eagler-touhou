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

`public/assets/dairi/avatars/` holds the profile avatar presets: 256px face
crops of every character in the distribution folder, each with all of its
expressions (normal and blush) and its alternate outfits. Each character
appears once; a package that repeats a character in different clothes — an
older design, a swimsuit, a PC-98 look — becomes another outfit of that
character. Pose variants (やられ, バトルっぽい and similar) and chibi versions are
not used.

`avatar-sources.json` records, per character and outfit, the source archive,
the folder inside it and the face square. `launcher/scripts/make-profile-avatars.py`
cuts the crops from the original packages with it and regenerates the catalog
and the published file list. The character names, search spellings and
signature colours live in `launcher/app/models/profile-avatar-characters.ts`.
The package notices permit editing (加工) for non-commercial use; the crops stay
credited to DAIRI / はるか and are not offered as separate downloads.

Additional characters and the author's root usage notice are available in the
[author's distribution folder](https://drive.google.com/drive/folders/0B34TvJayojX_SU44YUtISFVRTnM?resourcekey=0-mhlyeSSR6Pctax9CSF6FRg).
The root notice was reviewed on 2026-10-12. These third-party illustrations are
not covered by this project's GPL license; retain and consult the original usage
notices when adding or distributing artwork. An accessible download is not a
separate grant of permission.

Game save files used for local acceptance are kept outside the source and public
assets. They are not bundled with the application or its automated test fixtures.
