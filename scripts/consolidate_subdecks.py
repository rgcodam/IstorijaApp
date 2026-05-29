import json
import shutil
import re

PROG = 'data/program.js'
BACKUP = 'data/program.js.bak'
THRESHOLD = 2

def load_program(path):
    txt = open(path, 'r', encoding='utf-8').read()
    start = txt.find('=')
    json_part = txt[start+1:].strip()
    if json_part.endswith(';'):
        json_part = json_part[:-1]
    return json.loads(json_part)

def save_program(path, decks):
    with open(path, 'w', encoding='utf-8') as f:
        f.write('window.HISTORY_DECKS = ' + json.dumps(decks, ensure_ascii=False, indent=2) + ';\n')

def main():
    shutil.copyfile(PROG, BACKUP)
    decks = load_program(PROG)

    # group decks by section (title before ' — ')
    groups = {}
    for d in decks:
        title = d.get('title','')
        if ' — ' in title:
            sec = title.split(' — ')[0].strip()
        else:
            sec = title.strip()
        groups.setdefault(sec, []).append(d)

    moved = 0
    removed_deck_ids = []
    new_decks = []

    for sec, ds in groups.items():
        # if only one deck in section, keep as is
        if len(ds) <= 1:
            new_decks.extend(ds)
            continue

        # find or create 'Kiti' deck for this section
        kiti = None
        others = []
        for d in ds:
            if d.get('title','').endswith(' — Kiti'):
                kiti = d
            else:
                others.append(d)

        if not kiti:
            kiti = {
                'id': re.sub(r'[^a-z0-9]+','-', sec.lower()) + '-kiti',
                'title': f"{sec} — Kiti",
                'description': '',
                'group': ds[0].get('group',''),
                'tier': 'small',
                'cards': []
            }

        # move cards from tiny decks into kiti
        kept = []
        for d in others:
            cnt = len(d.get('cards',[]))
            if cnt <= THRESHOLD:
                kiti['cards'].extend(d.get('cards',[]))
                moved += cnt
                removed_deck_ids.append(d.get('id'))
            else:
                kept.append(d)

        # add kept decks and kiti (only if it has cards)
        new_decks.extend(kept)
        if kiti.get('cards'):
            new_decks.append(kiti)

    save_program(PROG, new_decks)

    print(f'Merged {moved} cards from {len(removed_deck_ids)} tiny decks into Kiti decks; backup at {BACKUP}')

if __name__ == '__main__':
    main()
