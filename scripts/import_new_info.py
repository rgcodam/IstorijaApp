import json
import re

PROG = 'data/program.js'
NEW = 'new_INFO.json'

def load_program(path):
    txt = open(path, 'r', encoding='utf-8').read()
    start = txt.find('=')
    json_part = txt[start+1:].strip()
    if json_part.endswith(';'):
        json_part = json_part[:-1]
    return json.loads(json_part)

def load_new(path):
    return json.load(open(path, 'r', encoding='utf-8'))

def slugify(s):
    s = s.lower()
    s = re.sub(r'[^a-z0-9ąčęėįšųūž\- ]+', '', s)
    s = s.replace(' ', '-')
    s = re.sub(r'-+', '-', s)
    return s

def main():
    prog = load_program(PROG)
    new = load_new(NEW)

    existing_fronts = set()
    for d in prog:
        for c in d.get('cards', []):
            existing_fronts.add((c.get('front') or '').strip().lower())

    added_decks = []
    added_cards = 0

    for section in new.get('subcategories_by_subject', []) or new.get('sections', []):
        sec_title = section.get('section')
        for sub in section.get('subcategories', []):
            sub_title = sub.get('subcategory')
            cards = []
            for item in sub.get('cards', []):
                front = (item.get('q') or item.get('front') or '').strip()
                back = (item.get('a') or item.get('back') or '').strip()
                if not front:
                    continue
                if front.lower() in existing_fronts:
                    continue
                cards.append({'front': front, 'back': back, 'type': 'term'})
                existing_fronts.add(front.lower())
                added_cards += 1

            if cards:
                deck_id = f"{slugify(sec_title)}-{slugify(sub_title)}"
                new_deck = {
                    'id': deck_id,
                    'title': f"{sec_title} — {sub_title}",
                    'description': '',
                    'group': prog[0].get('group') if prog else '',
                    'tier': 'small',
                    'cards': cards
                }
                added_decks.append(new_deck)

    if not added_decks:
        print('No new cards to add')
        return

    # append new decks to program decks
    prog.extend(added_decks)

    with open(PROG, 'w', encoding='utf-8') as f:
        f.write('window.HISTORY_DECKS = ' + json.dumps(prog, ensure_ascii=False, indent=2) + ';\n')

    print(f'Appended {len(added_decks)} decks with {added_cards} new cards to {PROG}')

if __name__ == '__main__':
    main()
