# 幻想人形演舞 portrait provenance

The profile avatar presets under `launcher/public/assets/tpdp/avatars/` are
256px face crops of the character portraits (立ち絵) from 幻想人形演舞
(Touhou Puppet Dance Performance) by FocasLens. The portraits were taken from
the fan-run index at https://thpdp.ver.moe/, which states it is not affiliated
with FocasLens. Each portrait remains © FocasLens; Touhou Project characters
are © ZUN / 上海アリス幻樂団.

Only Touhou characters are used: entries 001–131 and the alternate versions
946–974. The game's own human characters (entries 300–358) and two unnamed
entries are left out. Each character appears once, after the DAIRI set; an
entry that repeats a character in another version (946 Sumireko, 947 Akyuu,
958 Shinki, 974 Kasen, 020 Rukoto with Mimi-chan, 966 Gengetsu with Mugetsu)
becomes another outfit of that character.

The portraits carry no expression names, so each variant is numbered in the
order the index lists it. Variants drawn in another pose than the rest of an
entry are left out, so one face square serves the whole outfit.

`avatar-sources.json` records the portrait files and face square of each
outfit. `launcher/scripts/make-profile-avatars.py` cuts the crops from a local
copy of the portraits with it. The portraits themselves are not stored in this
repository.

No usage notice from FocasLens accompanies these portraits; check the
publisher's terms before distributing the crops.
