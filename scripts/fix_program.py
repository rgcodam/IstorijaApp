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

decks = json.loads(m.group(1))

# helpers
re_missing_space_camel = re.compile(r'([a-ząčęėįšųūž])([A-ZĄČĘĖĮŠŲŪŽ])')
re_split_word_space = re.compile(r'([a-zčėįšųž])\s+([a-zčėįšųž]{1,3})\b', re.I)
re_hyphenated_mid = re.compile(r'([a-ząčęėįšųūž]+)-\s*([a-ząčęėįšųūž]+)', re.I)
re_year_only = re.compile(r'^\s*(\d{3,4})\s*m\.?\s*$', re.I)

flags = []
fixed_count = 0
inferred_year_count = 0
marked_review = 0


def apply_known_fixes(front, back):
    if front == 'Sąvoka: Lietuvos karaliaus Mindaugo karū navimo šventės (Liepos 6-osios)' and back == 'Kas įvyko 1990 m.':
        return (
            'Sąvoka: Lietuvos karaliaus Mindaugo karūnavimo šventė (Liepos 6-oji)',
            '1990 m. liepos 6-oji buvo paskelbta Lietuvos valstybės diena.'
        )
    if front == 'Sąvoka: Lietuvos karaliaus Mindaugo karū navimo šventės (Liepos 6-osios)' and 'Vasario 16-oji ir Kovo 11-oji' in back:
        return (
            'Sąvoka: Lietuvos karaliaus Mindaugo karūnavimo šventė (Liepos 6-oji)',
            '1990 m. liepos 6-oji buvo paskelbta Lietuvos valstybės diena.'
        )
    if front == 'Kas įvyko 1990 m. ?' and 'Mindaugo karū navimo' in back:
        return (
            'Sąvoka: Lietuvos karaliaus Mindaugo karūnavimo šventė (Liepos 6-oji)',
            '1990 m. liepos 6-oji buvo paskelbta Lietuvos valstybės diena.'
        )
    if front == 'Sąvoka: Jonas ŽemaitisVytautas' and '2018 m.' in back:
        return (
            'Sąvoka: Jonas Žemaitis-Vytautas',
            '2018 m. Seimas paskelbė Jono Žemaičio-Vytauto metus.'
        )
    if front == 'Sąvoka: Targovicos konfederacija prieš Gegužės 3-iosios konstituciją). „Nihil novi“':
        return (
            'Sąvoka: Targovicos konfederacija',
            '1792 m. Targovicos konfederacija buvo bajorų sąjunga, kuri rėmė Rusijos įsikišimą ir priešinosi Gegužės 3-iosios konstitucijai.'
        )
    if front == 'Sąvoka: Nihil novi“' and back == 'Kas įvyko 1505 m.':
        return (
            'Sąvoka: Nihil novi',
            '1505 m. priimtas „Nihil novi“ įstatymas: be visos bajorijos sutikimo seimas negalėjo priimti naujų įstatymų.'
        )
    if front == 'Kas įvyko 1505 m. ?' and back.startswith('ATR sąvokos Koekvacija'):
        return (
            'Kas įvyko 1505 m. ?',
            '„Nihil novi“ – 1505 m.'
        )
    if front == 'Sąvoka: ATR sąvokos Koekvacija':
        return (
            'Sąvoka: Koekvacija',
            'bajoro teisė balsuoti seime vietoj kito (parduoti / perduoti savo balsą)'
        )
    if front == 'Kas įvyko 1940 m. ?':
        return (
            front,
            'Dezinformacija / „netikros naujienos“ – sąmoningas melagingų faktų skleidimas apie praeitį (pvz. sovietmečiu teigta, kad 1940 m. Lietuva savanoriškai įstojo į SSRS).'
        )
    if front == 'Tema: Istorijos interpretacija vs. instrumentalizacija':
        return (
            front,
            'Istorija visada buvo politikos įrankis. Istorijos politika – tai praeities įvykių naudojimas dabarties politiniams tikslams pasiekti.'
        )
    return front, back

for deck in decks:
    # build year->text index from deck
    year_index = {}
    combined_texts = []
    for card in deck.get('cards', []):
        combined = ' '.join([str(card.get('front','')), str(card.get('back',''))])
        combined_texts.append(combined)
        for y in re.findall(r'\b(\d{3,4})\b', combined):
            year_index.setdefault(y, []).append(combined)

    for card in deck.get('cards', []):
        review_reasons = []
        # normalize simple camel-case joins like 'sąvokosIstoriografija'
        front = card.get('front','') or ''
        back = card.get('back','') or ''
        orig_front, orig_back = front, back

        # insert space between lower+Upper patterns
        front = re_missing_space_camel.sub(r'\1 \2', front)
        back = re_missing_space_camel.sub(r'\1 \2', back)

        # fix hyphenated mid-word splits like 'kultu-ra' or 'kultu- ra'
        front = re_hyphenated_mid.sub(r'\1\2', front)
        back = re_hyphenated_mid.sub(r'\1\2', back)

        # fix short split words with stray spaces (heuristic)
        def fix_splits(s):
            # join single-letter splits and common two-letter fragments
            return re.sub(r'\b(\w{1,3})\s+(?=[a-ząčęėįšųūž]{2,})', lambda m: m.group(1)+" ", s)
        # (we'll not aggressively join to avoid wrong merges)

        # normalize multiple spaces
        front = re.sub(r'\s{2,}', ' ', front).strip()
        back = re.sub(r'\s{2,}', ' ', back).strip()

        front, back = apply_known_fixes(front, back)

        # attempt to infer year-only backs
        m_year = re_year_only.match(back)
        if m_year:
            y = m_year.group(1)
            candidates = year_index.get(y, [])
            if candidates:
                # pick the longest candidate (likely explanatory)
                cand = max(candidates, key=len)
                # remove the year mention itself and trim
                cand_clean = re.sub(r'\b'+re.escape(y)+r'\b', y, cand)
                # choose a substring after year if present
                # as a simple answer, take sentence that contains the year
                sentences = re.split(r'(?<=[\.!?])\s+', cand)
                chosen = None
                for s in sentences:
                    if re.search(r'\b'+re.escape(y)+r'\b', s):
                        chosen = s.strip()
                        break
                if not chosen:
                    chosen = cand_clean
                # set back to chosen (but keep concise)
                back = chosen
                inferred_year_count += 1
            else:
                review_reasons.append('year_only_no_context')

        # flag if back is too short or just repeats front
        if back.strip() == '' or back.strip() == front.strip():
            review_reasons.append('empty_or_duplicate')

        # flag if many non-letter artifacts
        if re.search(r'\\\\1|\\1|\\x', front+back):
            review_reasons.append('artifact_sequences')

        # flag suspicious hyphenation patterns
        if re.search(r'[a-ząčęėįšųūž]-\s+[a-ząčęėįšųūž]', front+back, re.I):
            review_reasons.append('hyphen_split')

        # update card
        card['front'] = front
        card['back'] = back
        if review_reasons:
            card['needs_review'] = True
            card['review_reasons'] = review_reasons
            marked_review += 1
            flags.append({'deck': deck.get('id'), 'front': front, 'back': back, 'reasons': review_reasons})
        else:
            card.pop('needs_review', None)
            card.pop('review_reasons', None)

        if (front != orig_front) or (back != orig_back):
            fixed_count += 1

# write output with review flags
out = 'window.HISTORY_DECKS = ' + json.dumps(decks, ensure_ascii=False, indent=2) + ';\n'
Path('data/program.js').write_text(out, encoding='utf-8')

# write a CSV of flagged cards for manual review
import csv
with open('data/program_review_flags.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f)
    w.writerow(['deck_id','front','back','reasons'])
    for r in flags:
        w.writerow([r['deck'], r['front'], r['back'], ';'.join(r['reasons'])])

print(f'Finished fixes: fixed_count={fixed_count}, inferred_years={inferred_year_count}, marked_for_review={marked_review}')
print('Wrote data/program.js and data/program_review_flags.csv')
