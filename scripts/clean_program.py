#!/usr/bin/env python3
import re
import json
from pathlib import Path

p = Path('data/program.js')
text = p.read_text(encoding='utf-8')

m = re.search(r'window\.HISTORY_DECKS\s*=\s*(\[.*\])\s*;', text, re.S)
if not m:
    print('Could not find HISTORY_DECKS array in data/program.js')
    raise SystemExit(1)

arr = json.loads(m.group(1))

# helpers
re_space_after_punct = re.compile(r'([\.,;:])(?=(?!\s|\n|\.|\,))')
re_missing_space_after_period_upper = re.compile(r'\.([A-ZĄČĘĖĮŠŲŪŽ])')
re_repeat_punct = re.compile(r'([\.,;:]){2,}')
re_multi_space = re.compile(r'\s{2,}')
re_year_only = re.compile(r'^\s*\d{3,4}\s*m\.?\s*$', re.I)
re_year_digits = re.compile(r'^(?:\s*)(\d{3,4})(?:\s*m\.?\s*)$')

removed = 0
fixed_parens = 0
fixed_spaces = 0
fixed_cards = 0

for deck in arr:
    new_cards = []
    for card in deck.get('cards', []):
        orig_front = card.get('front','') or ''
        orig_back = card.get('back','') or ''

        def norm(s):
            if not isinstance(s,str):
                return s
            s = s.replace('\xa0',' ')
            # fix missing space after punctuation
            s_new = re_space_after_punct.sub(r'\1 ', s)
            s = s_new
            # ensure a space after period if followed by uppercase (missed spaces)
            s = re_missing_space_after_period_upper.sub(r'. \1', s)
            # collapse repeated punctuation (replace with single instance)
            s = re_repeat_punct.sub(r'\1', s)
            # collapse multiple whitespace
            s = re_multi_space.sub(' ', s)
            # trim
            s = s.strip()
            return s

        front = norm(orig_front)
        back = norm(orig_back)

        # fix unbalanced parentheses by appending closing ) if needed
        if front.count('(') > front.count(')'):
            front = front + ')' * (front.count('(')-front.count(')'))
            fixed_parens += 1
        if back.count('(') > back.count(')'):
            back = back + ')' * (back.count('(')-back.count(')'))
            fixed_parens += 1

        # remove trivial year-answer cards where back is only the year (like '1569m.' or '1569 m.')
        if re_year_only.match(back):
            # if front also just asks about the year, drop card
            if re.search(r'\b(kas|ką|kas įvyko|kas buvo)\b', front, re.I) or re.search(r'\b\d{3,4}\b', front):
                removed += 1
                continue
            # otherwise replace back with normalized year format
            m2 = re_year_digits.match(back)
            if m2:
                back = m2.group(1) + ' m.'

        # if back equals front or both empty -> skip
        if not back and not front:
            removed += 1
            continue
        if front == back:
            removed += 1
            continue

        # small heuristic: if back is just a digit (year) and front contains year plus context, remove
        if re.match(r'^\d{3,4}$', back) and re.search(r'\d{3,4}', front):
            removed += 1
            continue

        # normalize spaces again
        front2 = norm(front)
        back2 = norm(back)
        if front2 != front or back2 != back:
            fixed_spaces += 1
        front, back = front2, back2

        card['front'] = front
        card['back'] = back
        new_cards.append(card)
    deck['cards'] = new_cards

    # fix any leftover literal "\\1" artifacts introduced earlier
    def fix_backrefs(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                obj[k] = fix_backrefs(v)
            return obj
        if isinstance(obj, list):
            return [fix_backrefs(x) for x in obj]
        if isinstance(obj, str):
            s = obj.replace('\\1', '. ')
            s = s.replace('.  ', '. ')
            return s
        return obj

    arr = fix_backrefs(arr)
# write back
out = 'window.HISTORY_DECKS = ' + json.dumps(arr, ensure_ascii=False, indent=2) + ';\n'
p.write_text(out, encoding='utf-8')
print(f'Wrote cleaned data/program.js — removed {removed} cards, fixed {fixed_parens} parens, normalized {fixed_spaces} cards')
