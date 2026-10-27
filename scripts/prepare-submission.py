"""Prepare the supplied portfolio PDF as durable, static booklet assets."""

import argparse
import json
from pathlib import Path
import shutil
import subprocess

from pypdf import PdfReader

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('--renderer', required=True)
args = parser.parse_args()
destination = Path(__file__).resolve().parents[1] / 'public' / 'portfolio-2026'
destination.mkdir(parents=True, exist_ok=True)
reader = PdfReader(args.source)
pages = []
for index, page in enumerate(reader.pages):
    number = index + 1
    prefix = destination / f'page-{number:02}'
    subprocess.run([
        args.renderer, '-f', str(number), '-l', str(number), '-singlefile',
        '-scale-to', '2200', '-jpeg', '-jpegopt', 'quality=94,optimize=y',
        str(args.source), str(prefix),
    ], check=True, capture_output=True)
    lines = (page.extract_text() or '').splitlines()
    label = lines[0].replace('STUDIO VOIGT / SELECTED WORK', '').strip()
    if not label or len(label) > 65:
        label = f'Portfolio page {number:02}'
    pages.append({'src': f'/portfolio-2026/page-{number:02}.jpg', 'label': label})
first = reader.pages[0].mediabox
manifest = {
    'title': 'Lukas Voigt | Selected Work 2026',
    'width': float(first.width), 'height': float(first.height),
    'pdf': '/portfolio-2026/lukas-voigt-portfolio-2026.pdf', 'pages': pages,
}
(destination / 'book.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
shutil.copyfile(args.source, destination / 'lukas-voigt-portfolio-2026.pdf')
print(f'Prepared {len(pages)} pages and the original PDF in {destination}')
