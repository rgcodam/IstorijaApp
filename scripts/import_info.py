#!/usr/bin/env python3
import json, re
from pathlib import Path

info = json.loads(Path('INFO.json').read_text(encoding='utf-8'))
subject = info.get('subject','Program')
sections = info.get('sections', [])

def slugify(s):
    s = s.lower()
    s = re.sub(r"[^a-z0-9ąćęėįšųūž\s-]", '', s)
    s = re.sub(r'\s+', '-', s.strip())
    s = re.sub(r'-+', '-', s)
    return s

decks = []
for sec in sections:
    title = sec.get('section') or 'Untitled'
    cards = []
    for c in sec.get('cards', []):
        q = c.get('q','').strip()
        a = c.get('a','').strip()
        if not q and not a:
            continue
        card = {'front': q, 'back': a, 'type': 'term'}
        cards.append(card)

    deck = {
        'id': slugify(title),
        'title': title,
        'description': '',
        'group': subject,
        'tier': 'small',
        'cards': cards
    }
    decks.append(deck)

out = 'window.HISTORY_DECKS = ' + json.dumps(decks, ensure_ascii=False, indent=2) + ';\n'
Path('data/program.js').write_text(out, encoding='utf-8')
print(f'Wrote data/program.js with {len(decks)} decks and {sum(len(d["cards"]) for d in decks)} cards')
