import re
import json

INPUT = 'data/program.js'
OUTPUT = 'data/program_subdecks.js'

# Heuristics to classify a card into a subcategory
YEAR_RE = re.compile(r'\b(1[0-9]{3}|20[0-9]{2}|[0-9]{3})\b')
PERSON_RE = re.compile(r'^[A-ZĄČĘĖĮŠŲŪŽ][a-ząčęėįšųūž]+\s+[A-ZĄČĘĖĮŠŲŪŽ][a-ząčęėįšųūž]+')
SHORT_RE = re.compile(r'^.{1,60}$', re.S)


def load_decks(path):
    # data/program.js defines window.HISTORY_DECKS = [ ... ];
    txt = open(path, 'r', encoding='utf-8').read()
    start = txt.find('=')
    if start == -1:
        raise RuntimeError('Unexpected program.js format')
    json_part = txt[start+1:]
    # remove leading whitespace and possible semicolon at end
    json_part = json_part.strip()
    if json_part.endswith(';'):
        json_part = json_part[:-1]
    decks = json.loads(json_part)
    return decks


def classify_card(card):
    front = (card.get('front') or '').strip()
    back = (card.get('back') or '').strip()

    if YEAR_RE.search(front) or YEAR_RE.search(back):
        return 'Events'
    if PERSON_RE.match(front):
        return 'People'
    # if front contains words like 'sąvoka', 'samprata' -> Concepts
    if re.search(r'\b(sąvoka|samprata|terminas|kas yra|apibrėžimas)\b', front, re.I):
        return 'Concepts'
    # if short and not a person, treat as Concept/Term
    if SHORT_RE.match(front) and len(front.split()) <= 4:
        return 'Concepts'
    # else fallback
    return 'Misc'


def run():
    decks = load_decks(INPUT)
    out_decks = []
    summary = {}

    for deck in decks:
        # prepare subdeck containers
        submap = { 'People': [], 'Concepts': [], 'Events': [], 'Topics': [], 'Misc': [] }
        for card in deck.get('cards', []):
            cat = classify_card(card)
            # small heuristic: if front contains 'tema' or 'tema:' -> Topics
            if re.search(r'\btema\b|\btema:?', (card.get('front') or ''), re.I):
                cat = 'Topics'
            submap[cat].append(card)

        # create new decks for non-empty submaps
        created = 0
        for key, cards in submap.items():
            if not cards:
                continue
            new_deck = {
                'id': f"{deck.get('id','deck')}-{key.lower()}",
                'title': f"{deck.get('title','') } — {key}",
                'group': deck.get('group'),
                'cards': cards
            }
            out_decks.append(new_deck)
            created += len(cards)
        summary[deck.get('title','?')] = created

    # write output file in same format
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        f.write('window.HISTORY_DECKS = ' + json.dumps(out_decks, ensure_ascii=False, indent=2) + ';\n')

    # print short summary
    total_in = sum(len(d.get('cards', [])) for d in decks)
    total_out = sum(len(d.get('cards', [])) for d in out_decks)
    print(f'Processed {len(decks)} decks -> {len(out_decks)} sub-decks; cards in: {total_in}, cards out: {total_out}')
    for k, v in summary.items():
        print(f'{k}: {v} cards assigned')


if __name__ == '__main__':
    run()
