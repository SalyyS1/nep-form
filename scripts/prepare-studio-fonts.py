"""Bundle OFL Google Fonts as Vietnamese-capable, renamed WOFF2 subsets."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import json
import re
import urllib.request
import urllib.parse
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public/fonts/studio'
CACHE = ROOT / 'work/font-sources'
FONTS = [
    ('montserrat', 'Montserrat', 'Hiện đại', 600),
    ('oswald', 'Oswald', 'Nổi bật', 600),
    ('anton', 'Anton', 'Nổi bật', 400),
    ('bangers', 'Bangers', 'Nổi bật', 400),
    ('pacifico', 'Pacifico', 'Viết tay', 400),
    ('lobster', 'Lobster', 'Viết tay', 400),
    ('dancingscript', 'Dancing Script', 'Viết tay', 500),
    ('playfairdisplay', 'Playfair Display', 'Cổ điển', 500),
    ('lora', 'Lora', 'Cổ điển', 500),
    ('merriweather', 'Merriweather', 'Cổ điển', 400),
    ('patrickhand', 'Patrick Hand', 'Viết tay', 400),
    ('comfortaa', 'Comfortaa', 'Hiện đại', 500),
    ('chakrapetch', 'Chakra Petch', 'Hiện đại', 500),
    ('spacemono', 'Space Mono', 'Hiện đại', 400),
]
VIETNAMESE = 'ÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ'
UNICODES = set(range(32, 127)) | set(range(0xA0, 0x250)) | set(range(0x300, 0x370)) | set(range(0x1E00, 0x1F00)) | set(range(0x2000, 0x2070)) | {0x20AB, 0x20AC}


def fetch(url):
    return urllib.request.urlopen(url, timeout=60).read()


def prepare(item):
    index, (slug, label, group, weight) = item
    base = f'https://raw.githubusercontent.com/google/fonts/main/ofl/{slug}/'
    metadata = fetch(base + 'METADATA.pb').decode()
    if 'subsets: "vietnamese"' not in metadata:
        raise ValueError(f'{slug} does not advertise Vietnamese')
    normal = next(block for block in re.findall(r'fonts \{(.*?)\n\}', metadata, re.S) if 'style: "normal"' in block)
    filename = re.search(r'filename: "([^"]+)"', normal)[1]
    source = fetch(base + urllib.parse.quote(filename))
    (CACHE / filename).write_bytes(source)
    license_text = fetch(base + 'OFL.txt')
    (DEST / f'{slug}-ofl.txt').write_bytes(license_text)
    font = TTFont(CACHE / filename)
    if 'fvar' in font:
        axes = {axis.axisTag: (weight if axis.axisTag == 'wght' else axis.defaultValue) for axis in font['fvar'].axes}
        font = instantiateVariableFont(font, axes, inplace=True)
    missing = [character for character in VIETNAMESE + VIETNAMESE.lower() if ord(character) not in font.getBestCmap()]
    if missing:
        raise ValueError(f'{slug} misses Vietnamese glyphs: {missing}')
    # Modified subsets use a neutral new internal name, retaining original copyright/license.
    family = f'NEP Library {index:02d}'
    for name_id, value in [(1, family), (2, 'Regular'), (3, family + ' Regular'), (4, family + ' Regular'), (6, family.replace(' ', '') + '-Regular'), (16, family), (17, 'Regular')]:
        font['name'].setName(value, name_id, 3, 1, 0x409)
        font['name'].setName(value, name_id, 1, 0, 0)
    options = subset.Options()
    options.name_IDs = ['*']
    options.name_languages = ['*']
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=UNICODES)
    sub.subset(font)
    font.flavor = 'woff2'
    target = DEST / f'{slug}.woff2'
    font.save(target)
    return {'id': slug, 'label': label, 'group': group, 'weight': font['OS/2'].usWeightClass, 'path': f'/fonts/studio/{slug}.woff2', 'source': base + urllib.parse.quote(filename), 'license': f'/fonts/studio/{slug}-ofl.txt', 'sourceSha256': hashlib.sha256(source).hexdigest(), 'bytes': target.stat().st_size}


if __name__ == '__main__':
    DEST.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        entries = list(pool.map(prepare, enumerate(FONTS, 1)))
    manifest = {'license': 'SIL Open Font License 1.1', 'modifications': 'Static weights, Latin/Vietnamese/punctuation subset, renamed NEP Library internal families. Original copyrights retained.', 'fonts': entries}
    (ROOT / 'data/studio-font-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Bundled {len(entries)} fonts, {sum(entry["bytes"] for entry in entries):,} bytes; full Vietnamese coverage verified.')
