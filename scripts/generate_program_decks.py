import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET
import re
import unicodedata
import json
from collections import defaultdict

SOURCE_DOC = Path("/Users/rokas/Desktop/IstorijaApp/programa1.docx")
OUTPUT_JS = Path("/Users/rokas/Desktop/IstorijaApp/data/program.js")

with zipfile.ZipFile(SOURCE_DOC) as z:
    xml_data = z.read("word/document.xml")

root = ET.fromstring(xml_data)
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

raw_paragraphs = []
for p in root.findall(".//w:p", ns):
    p_style = p.find("w:pPr/w:pStyle", ns)
    style = p_style.get(f"{{{ns['w']}}}val") if p_style is not None else None
    text = "".join(t.text or "" for t in p.findall(".//w:t", ns)).strip()
    if text:
        raw_paragraphs.append((style or "(none)", text))


def normalize_text(text):
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


heading_overrides = {
    "Istorija – gyvenimo mokytoja: istorijos samprata ir": "Istorija – gyvenimo mokytoja: istorijos samprata ir raida nuo Antikos iki XIX a.",
    "Istoriko laboratorija: istorijos šaltinių įvairovė ir": "Istoriko laboratorija: istorijos šaltinių įvairovė ir istorinis tyrimas",
    "Valstybingumas:suverenitetas,idėjos,": "Valstybingumas: suverenitetas, idėjos, formos",
    "LDK XIII–XVI a.: ankstyvoji ir luominė monarchija,": "LDK XIII–XVI a.: ankstyvoji ir luominė monarchija, personalinė unija",
    "XXa.antrosiospusėsekologinėskatastrofosir": "XX a. antrosios pusės ekologinės katastrofos ir judėjimai",
    "PirmosiosirantrosiosLietuvosRespublikų valstybingumo raidos ypatumai": "Pirmosios ir antrosios Lietuvos Respublikos valstybingumo raidos ypatumai",
    "santvarkose": "Kultūra ir menininko (ne)laisvė XX a. totalitarinėse santvarkose",
    "modernėjimas ir mokslo pažanga": "Pirmosios Lietuvos Respublikos kultūros modernėjimas ir mokslo pažanga",
    "ir sovietinis modernizmas": "Kultūra okupuotoje Lietuvoje: ideologizacija, cenzūra ir sovietinis modernizmas",
}

prefix_fixes = {
    "PirmosiosLietuvosRespublikoskultūros": "Pirmosios Lietuvos Respublikos kultūros",
}

heading_replacements = {
    "Kultū ra": "Kultūra",
    "kultū ra": "kultūra",
    "kultū ros": "kultūros",
    "Kultū ros": "Kultūros",
    "lū žiai": "lūžiai",
    "sandū ros": "sandūros",
    "cenzū ra": "cenzūra",
    "Respublikoskultūros": "Respublikos kultūros",
    "atkū rimo": "atkūrimo",
}


def normalize_heading(text):
    text = re.sub(r"([a-ząčęėįšųūž])([A-ZĄČĘĖĮŠŲŪŽ])", r"\1 \2", text)
    text = re.sub(r"\b([XVI]+)a\.", r"\1 a.", text)
    text = re.sub(r":(?!\s)", ": ", text)
    text = re.sub(r",(?!\s)", ", ", text)
    text = re.sub(r"\s+", " ", text).strip()
    for key, value in heading_replacements.items():
        text = text.replace(key, value)
    return text


def normalize_key(text):
    return re.sub(r"\s+", "", text).lower()


heading_styles = {"Heading1", "Heading2", "Heading3"}

normalized = []
in_toc = False
pending_prefix = None

i = 0
while i < len(raw_paragraphs):
    style, text = raw_paragraphs[i]
    text = normalize_text(text)

    if style == "Heading1" and text == "Turinys":
        in_toc = True
        normalized.append((style, text))
        i += 1
        continue

    if in_toc and style in heading_styles and style != "Heading1":
        in_toc = False

    if in_toc and style == "ListParagraph":
        i += 1
        continue

    if style == "ListParagraph":
        if i + 1 < len(raw_paragraphs):
            next_style, next_text = raw_paragraphs[i + 1]
            next_text = normalize_text(next_text)
            if next_style == "Heading2" and (next_text[:1].islower() or next_text.startswith("ir") or len(next_text) < 25):
                pending_prefix = normalize_heading(text)
                pending_prefix = prefix_fixes.get(pending_prefix, pending_prefix)
                i += 1
                continue

    if style == "ListParagraph":
        low = text.lower()
        has_definition_dash = re.search(r"\s[–-]\s", text) is not None
        if not has_definition_dash and not low.startswith(("sąvok", "egzamino", "vbe", "bendros vbe")):
            if len(text) >= 18:
                style = "Heading2"

    if style in heading_styles:
        if style == "Heading2" and pending_prefix:
            text = f"{pending_prefix} {text}"
            pending_prefix = None
        if text in heading_overrides:
            text = heading_overrides[text]
        text = normalize_heading(text)
        if text.endswith((" ir", ",", ":", "–", "ir")) and i + 1 < len(raw_paragraphs):
            next_style, next_text = raw_paragraphs[i + 1]
            next_text = normalize_text(next_text)
            if next_style not in heading_styles and len(next_text) < 60:
                text = f"{text} {next_text}"
                i += 1
    else:
        text = normalize_text(text)

    normalized.append((style, text))
    i += 1

current_group = "Istorikas, istorija ir istorinė kultūra"
current_h2 = None
current_h3 = None
sections = []

for style, text in normalized:
    if style == "Heading1":
        if text == "Turinys":
            continue
        if text.startswith("Valstybingumas"):
            current_group = "Valstybingumas"
            current_h2 = None
            current_h3 = None
            continue
        if text == "Žmogus ir aplinka":
            current_group = "Žmogus ir aplinka"
            current_h2 = None
            current_h3 = None
            continue

    if style == "Heading2":
        if normalize_key(text) == "kultūrairmokslas":
            current_group = "Kultūra ir mokslas"
            current_h2 = None
            current_h3 = None
            continue
        current_h2 = {
            "title": text,
            "group": current_group,
            "content": [],
            "subtopics": [],
        }
        sections.append(current_h2)
        current_h3 = None
        continue

    if style == "Heading3":
        if current_h2 is None:
            current_h2 = {
                "title": f"{current_group} – temos",
                "group": current_group,
                "content": [],
                "subtopics": [],
            }
            sections.append(current_h2)
        current_h3 = {"title": text, "content": []}
        current_h2["subtopics"].append(current_h3)
        continue

    if current_h3 is not None:
        current_h3["content"].append(text)
    elif current_h2 is not None:
        current_h2["content"].append(text)


def split_sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def summarize(text, max_chars=280):
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= max_chars:
        return text
    sentences = split_sentences(text)
    summary = ""
    for sentence in sentences:
        if not summary:
            if len(sentence) <= max_chars:
                summary = sentence
            else:
                summary = sentence[:max_chars].rstrip()
            continue
        if len(summary) + 1 + len(sentence) > max_chars:
            break
        summary = f"{summary} {sentence}".strip()
    return summary or text[:max_chars].rstrip()


def extract_definitions(text):
    lowered = text.lower()
    if "sąvok" not in lowered and text.count(" – ") < 2:
        return []
    text = text.replace("Sąvokos", "Sąvokos ")
    text = re.sub(r"\s+", " ", text).strip()
    results = []
    for match in re.finditer(r"([A-ZĄČĘĖĮŠŲŪŽ][^–]{2,60}) – ([^.]+)", text):
        term = match.group(1).strip().strip(";")
        definition = match.group(2).strip().strip(";")
        if len(term) < 3 or len(term) > 60 or len(definition) < 6:
            continue
        if "," in term:
            continue
        results.append((term, definition))
    return results


def extract_year_cards(text):
    text = re.sub(r"\s+", " ", text).strip()
    matches = list(re.finditer(r"\b(1[0-9]{3}|[0-9]{3})\s*m\.", text))
    if not matches:
        return []
    sentences = split_sentences(text)
    cards = []
    keywords = [
        "įvyko",
        "įkurt",
        "įsteig",
        "priėm",
        "paskelb",
        "sudary",
        "konstituc",
        "mūš",
        "karūn",
        "įstat",
        "sutart",
        "unij",
        "deklarac",
        "pasiraš",
        "nare",
        "reforma",
        "sukil",
        "karas",
    ]
    for match in matches:
        year = match.group(1)
        start = match.start()
        if start >= 2 and text[start - 1] in "–-":
            if start >= 3 and text[start - 2].isdigit():
                continue
        sentence = ""
        for s in sentences:
            if f"{year} m." in s:
                sentence = s
                break
        if not sentence:
            continue
        lowered = sentence.lower()
        if not any(keyword in lowered for keyword in keywords):
            continue
        cards.append((year, sentence))
    return cards


def slugify(text):
    text = unicodedata.normalize("NFD", text)
    text = text.lower()
    text = text.replace("ą", "a").replace("č", "c").replace("ę", "e").replace("ė", "e")
    text = text.replace("į", "i").replace("š", "s").replace("ų", "u").replace("ū", "u").replace("ž", "z")
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text


program_decks = []
all_cards = []
all_cards_by_type = defaultdict(list)


def add_card(deck_cards, card, seen):
    key = (card["front"], card["back"])
    if key in seen:
        return
    seen.add(key)
    deck_cards.append(card)


for section in sections:
    deck_cards = []
    seen = set()

    if section["content"]:
        overview_text = summarize(" ".join(section["content"]))
        if overview_text and len(overview_text) >= 80:
            add_card(
                deck_cards,
                {
                    "front": f"Skyriaus apžvalga: {section['title']}",
                    "back": overview_text,
                    "type": "overview",
                },
                seen,
            )

    for sub in section["subtopics"]:
        body = summarize(" ".join(sub["content"])) if sub["content"] else ""
        if body:
            add_card(
                deck_cards,
                {
                    "front": f"Tema: {sub['title']}",
                    "back": body,
                    "type": "topic",
                },
                seen,
            )
        else:
            add_card(
                deck_cards,
                {
                    "front": f"Tema: {sub['title']}",
                    "back": "Trumpai apibūdink pagrindinius bruožus ir reikšmę.",
                    "type": "topic",
                },
                seen,
            )

    full_texts = section["content"] + [t for sub in section["subtopics"] for t in sub["content"]]
    for paragraph in full_texts:
        for term, definition in extract_definitions(paragraph):
            add_card(
                deck_cards,
                {
                    "front": f"Sąvoka: {term}",
                    "back": definition,
                    "type": "term",
                },
                seen,
            )

        for year, sentence in extract_year_cards(paragraph):
            add_card(
                deck_cards,
                {
                    "front": f"Kas įvyko {year} m.?",
                    "back": sentence,
                    "type": "year",
                },
                seen,
            )

    for paragraph in full_texts:
        if "Egzamino taktika" in paragraph or "VBE" in paragraph:
            tip = summarize(paragraph, max_chars=240)
            add_card(
                deck_cards,
                {
                    "front": "Egzamino taktika",
                    "back": tip,
                    "type": "tip",
                },
                seen,
            )

    desc_parts = [sub["title"] for sub in section["subtopics"][:3]]
    description = " • ".join(desc_parts) if desc_parts else summarize(" ".join(section["content"]), 120)

    deck = {
        "id": slugify(section["group"] + " " + section["title"]),
        "title": section["title"],
        "description": description,
        "group": section["group"],
        "tier": "small",
        "cards": deck_cards,
    }
    program_decks.append(deck)
    all_cards.extend(deck_cards)
    for card in deck_cards:
        all_cards_by_type[card["type"]].append(card)


# Group decks
+groups = defaultdict(list)
+for deck in program_decks:
+    groups[deck["group"]].extend(deck["cards"])
+
+for group, cards in groups.items():
+    if not cards:
+        continue
+    seen = set()
+    unique_cards = []
+    for card in cards:
+        key = (card["front"], card["back"])
+        if key in seen:
+            continue
+        seen.add(key)
+        unique_cards.append(card)
+
+    program_decks.append(
+        {
+            "id": slugify(group + " viskas"),
+            "title": f"{group} (visa tema)",
+            "description": f"Didysis rinkinys: {len(unique_cards)} kortų.",
+            "group": "Didieji rinkiniai",
+            "tier": "big",
+            "cards": unique_cards,
+        }
+    )
+
+# All-program deck
+seen = set()
+unique_all = []
+for card in all_cards:
+    key = (card["front"], card["back"])
+    if key in seen:
+        continue
+    seen.add(key)
+    unique_all.append(card)
+
+program_decks.append(
+    {
+        "id": "visa-programa",
+        "title": "Visa programa",
+        "description": f"Didysis rinkinys: {len(unique_all)} kortų.",
+        "group": "Didieji rinkiniai",
+        "tier": "big",
+        "cards": unique_all,
+    }
+)
+
+# Special decks
+def filter_cards(pattern):
+    regex = re.compile(pattern, re.IGNORECASE)
+    filtered = []
+    seen = set()
+    for card in unique_all:
+        if regex.search(card["front"]) or regex.search(card["back"]):
+            key = (card["front"], card["back"])
+            if key in seen:
+                continue
+            seen.add(key)
+            filtered.append(card)
+    return filtered
+
+special_decks = [
+    ("musiai", "Mūšiai ir karai", r"mūš|karas|karo|mūšis"),
+    ("konstitucijos", "Konstitucijos", r"konstituc"),
+    ("ldk", "LDK", r"\bLDK\b|Lietuvos Didžioji Kunigaikštystė|Lietuvos Didžiosios Kunigaikštystės"),
+]
+
+for deck_id, title, pattern in special_decks:
+    cards = filter_cards(pattern)
+    if cards:
+        program_decks.append(
+            {
+                "id": deck_id,
+                "title": title,
+                "description": f"Rinkinys: {len(cards)} kortų.",
+                "group": "Specialūs rinkiniai",
+                "tier": "special",
+                "cards": cards,
+            }
+        )
+
+# Year cards deck
+year_cards = all_cards_by_type.get("year", [])
+seen = set()
+unique_year = []
+for card in year_cards:
+    key = (card["front"], card["back"])
+    if key in seen:
+        continue
+    seen.add(key)
+    unique_year.append(card)
+if unique_year:
+    program_decks.append(
+        {
+            "id": "metai-ir-ivykiai",
+            "title": "Metai ir įvykiai",
+            "description": f"Chronologija: {len(unique_year)} kortų.",
+            "group": "Specialūs rinkiniai",
+            "tier": "special",
+            "cards": unique_year,
+        }
+    )
+
+# Exam tips deck
+if all_cards_by_type.get("tip"):
+    seen = set()
+    tips = []
+    for card in all_cards_by_type["tip"]:
+        key = (card["front"], card["back"])
+        if key in seen:
+            continue
+        seen.add(key)
+        tips.append(card)
+    program_decks.append(
+        {
+            "id": "vbe-taktika",
+            "title": "VBE taktika",
+            "description": f"Patarimai ir strategijos: {len(tips)} kortų.",
+            "group": "Specialūs rinkiniai",
+            "tier": "special",
+            "cards": tips,
+        }
+    )
+
+js = "window.HISTORY_DECKS = " + json.dumps(program_decks, ensure_ascii=False, indent=2) + ";\n"
+OUTPUT_JS.write_text(js, encoding="utf-8")
+
+print(f"Wrote {OUTPUT_JS}")
+print("Deck count:", len(program_decks))
+print("Total cards:", len(unique_all))
+
+
+if __name__ == "__main__":
+    pass
PY