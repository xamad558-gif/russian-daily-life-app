from __future__ import annotations

import argparse
import json
import math
import re
import urllib.parse
from collections import defaultdict
from pathlib import Path

import arabic_reshaper
import qrcode
from bidi.algorithm import get_display
from PIL import Image, ImageOps
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "words.json"
OUTPUT_DIR = ROOT / "output" / "pdf"

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 28
GAP = 14
HEADER_HEIGHT = 54
FOOTER_HEIGHT = 22
CARD_WIDTH = (PAGE_WIDTH - (2 * MARGIN) - GAP) / 2
CARD_HEIGHT = (PAGE_HEIGHT - (2 * MARGIN) - HEADER_HEIGHT - FOOTER_HEIGHT - GAP) / 2
CARD_IMAGE_HEIGHT = 140
CARD_TEXT_X = 12
CARD_TEXT_WIDTH = CARD_WIDTH - (2 * CARD_TEXT_X)
QR_SIZE = 30
WORDS_PER_WRITING_PAGE = 10
CUMULATIVE_REVIEW_SIZE = 20
INDEX_ENTRIES_PER_PAGE = 38
SHORT_SECTION_THRESHOLD = 5  # sections with this many words or fewer get a bonus practice block

FONT_REGULAR = "Tahoma"
FONT_BOLD = "Tahoma-Bold"

SECTION_ORDER = ["home", "living-room", "bedroom", "kitchen", "bathroom", "door-window"]
SECTION_TITLES = {
    "home": ("Home Basics", "الأساسيات المنزلية"),
    "living-room": ("Living Room", "غرفة المعيشة"),
    "bedroom": ("Bedroom", "غرفة النوم"),
    "kitchen": ("Kitchen", "المطبخ"),
    "bathroom": ("Bathroom", "الحمام"),
    "door-window": ("Doors and Windows", "الأبواب والنوافذ"),
}

ACCENT = colors.HexColor("#134E6F")
ACCENT_LIGHT = colors.HexColor("#EAF5FA")
TEXT = colors.HexColor("#17313F")
MUTED = colors.HexColor("#60707A")
CARD_FILL = colors.white
CARD_BORDER = colors.HexColor("#D7E2E8")
WRITING_LINE = colors.HexColor("#B8CAD3")
TRACE_TEXT = colors.HexColor("#AABBC3")
EXERCISE_FILL = colors.HexColor("#FFF9EE")
SUCCESS_FILL = colors.HexColor("#EAF5FA")

# Each profile controls which meaning language(s) appear on the main reference
# card, which translation lines appear under a Russian example sentence, and
# which columns the back-of-book index uses. "full" is the unchanged
# comprehensive teacher/review reference; ar/en/ru are slimmer, audience-
# specific editions built from the exact same data and layout code.
LANGUAGE_PROFILES = {
    "full": {
        "key": "full",
        "output_name": "russian_daily_life_workbook.pdf",
        "edition_en": "Full Reference Edition",
        "edition_ar": "النسخة المرجعية الشاملة",
        "card_meanings": ("ar", "en"),
        "example_langs": ("ar", "en"),
        "index_langs": ("ru", "ar", "en"),
        "footer_label": "Russian Daily Life - full reference book",
    },
    "ar": {
        "key": "ar",
        "output_name": "russian_daily_life_workbook_ar.pdf",
        "edition_en": "Arabic Learner Edition",
        "edition_ar": "نسخة المتعلم الناطق بالعربية",
        "card_meanings": ("ar",),
        "example_langs": ("ar",),
        "index_langs": ("ru", "ar"),
        "footer_label": "Russian Daily Life - Arabic learner edition",
    },
    "en": {
        "key": "en",
        "output_name": "russian_daily_life_workbook_en.pdf",
        "edition_en": "English Learner Edition",
        "edition_ar": "نسخة المتعلم الناطق بالإنجليزية",
        "card_meanings": ("en",),
        "example_langs": ("en",),
        "index_langs": ("ru", "en"),
        "footer_label": "Russian Daily Life - English learner edition",
    },
    "ru": {
        "key": "ru",
        "output_name": "russian_daily_life_workbook_ru.pdf",
        "edition_en": "Russian Immersion Edition",
        "edition_ar": "نسخة الانغماس الروسي",
        "card_meanings": ("ar", "en"),
        "example_langs": (),
        "index_langs": ("ru",),
        "footer_label": "Russian Daily Life - Russian immersion edition",
    },
}

MEANING_LABELS = {"ar": "SA Arabic", "en": "US English"}


def register_fonts() -> None:
    font_dir = Path("C:/Windows/Fonts")
    pdfmetrics.registerFont(TTFont(FONT_REGULAR, str(font_dir / "tahoma.ttf")))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, str(font_dir / "tahomabd.ttf")))


def has_arabic(text: str) -> bool:
    return bool(re.search(r"[\u0600-\u06FF]", text))


def shape_arabic(text: str) -> str:
    if not has_arabic(text):
        return text
    return get_display(arabic_reshaper.reshape(text))


def load_words() -> list[dict]:
    with DATA_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def group_words(words: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for item in words:
        grouped[item["subCategory"]].append(item)
    for section in grouped:
        grouped[section].sort(key=lambda item: (-int(item.get("frequency", 0)), item["id"]))
    return grouped


def chunk_items(items: list[dict], size: int) -> list[list[dict]]:
    return [items[index : index + size] for index in range(0, len(items), size)]


def ordered_words(grouped: dict[str, list[dict]]) -> list[dict]:
    return [item for section in SECTION_ORDER for item in grouped.get(section, [])]


def build_page_plan(grouped: dict[str, list[dict]]) -> dict:
    total_words = sum(len(grouped.get(section, [])) for section in SECTION_ORDER)
    plan = {
        "reference_pages": {},
        "writing_pages": {},
        "test_pages": {},
        "word_reference_page": {},
        "cumulative_pages": [],
        "index_pages": [],
        "solution_section_pages": {},
        "solution_cumulative_pages": [],
        "pronunciation_page": 0,
        "notes_page": 0,
    }
    page_no = 4

    for section in SECTION_ORDER:
        items = grouped.get(section, [])
        reference_count = max(1, math.ceil(len(items) / 4))
        plan["reference_pages"][section] = list(range(page_no, page_no + reference_count))
        for index, item in enumerate(items):
            plan["word_reference_page"][item["id"]] = page_no + (index // 4)
        page_no += reference_count

        writing_count = max(1, math.ceil(len(items) / WORDS_PER_WRITING_PAGE))
        plan["writing_pages"][section] = list(range(page_no, page_no + writing_count))
        page_no += writing_count

        plan["test_pages"][section] = page_no
        page_no += 1

    plan["pronunciation_page"] = page_no
    page_no += 1

    cumulative_count = max(1, math.ceil(total_words / CUMULATIVE_REVIEW_SIZE))
    plan["cumulative_pages"] = list(range(page_no, page_no + cumulative_count))
    page_no += cumulative_count

    index_count = max(1, math.ceil(total_words / INDEX_ENTRIES_PER_PAGE))
    plan["index_pages"] = list(range(page_no, page_no + index_count))
    page_no += index_count

    for section in SECTION_ORDER:
        plan["solution_section_pages"][section] = page_no
        page_no += 1
    plan["solution_cumulative_pages"] = list(range(page_no, page_no + cumulative_count))
    page_no += cumulative_count
    plan["notes_page"] = page_no
    return plan


def draw_checkbox(pdf: canvas.Canvas, x: float, y: float, label: str, width: float = 78) -> None:
    pdf.setStrokeColor(CARD_BORDER)
    pdf.setFillColor(colors.white)
    pdf.rect(x, y - 2, 10, 10, fill=1, stroke=1)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_REGULAR, 8.4)
    pdf.drawString(x + 15, y, label)


def draw_rule(pdf: canvas.Canvas, x: float, y: float, width: float, dashed: bool = False) -> None:
    pdf.setStrokeColor(WRITING_LINE)
    pdf.setLineWidth(0.7)
    if dashed:
        pdf.setDash(2, 2)
    else:
        pdf.setDash()
    pdf.line(x, y, x + width, y)
    pdf.setDash()


def gender_label(item: dict) -> str:
    gender = item.get("grammar", {}).get("ru", {}).get("gender", "")
    labels = {
        "masculine": "M mужской",
        "feminine": "F женский",
        "neuter": "N средний",
    }
    return labels.get(gender, "unknown")


def choose_items(items: list[dict], limit: int) -> list[dict]:
    if len(items) <= limit:
        return items
    positions = [round(index * (len(items) - 1) / (limit - 1)) for index in range(limit)]
    return [items[position] for position in positions]


def make_blank_sentence(item: dict) -> str:
    sentence = item.get("exampleRu", "")
    russian = item.get("russian", "")
    parts = []
    for token in russian.split():
        clean_token = re.sub(r"[^\wёЁ]", "", token)
        if not clean_token:
            continue
        stem_length = max(3, len(clean_token) - 3)
        parts.append(re.escape(clean_token[:stem_length]) + r"\w*")
    pattern = r"\s+".join(parts) if parts else re.escape(russian)
    blanked = re.sub(pattern, "____________", sentence, count=1, flags=re.IGNORECASE)
    return blanked if blanked != sentence else f"{sentence}  ____________"


def resolve_image_path(relative_path: str) -> Path:
    candidate = ROOT / relative_path
    if candidate.exists():
        return candidate

    basename = Path(relative_path).name
    fallback = ROOT / "assets" / "images" / "words" / basename
    if fallback.exists():
        return fallback

    search_root = ROOT / "assets" / "images"
    for match in search_root.rglob(basename):
        return match

    raise FileNotFoundError(f"Image not found: {relative_path}")


def wrap_text(text: str, font_name: str, font_size: float, max_width: float) -> list[str]:
    words = text.split()
    if not words:
        return [""]

    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if pdfmetrics.stringWidth(candidate, font_name, font_size) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def draw_wrapped_text(
    pdf: canvas.Canvas,
    text: str,
    x: float,
    y_top: float,
    width: float,
    font_name: str,
    font_size: float,
    leading: float,
    color=TEXT,
    align: str = "left",
) -> float:
    if not text:
        return 0
    pdf.setFont(font_name, font_size)
    pdf.setFillColor(color)
    visual_text = shape_arabic(text)
    lines = wrap_text(visual_text, font_name, font_size, width)
    baseline = y_top
    for line in lines:
        if align == "right":
            pdf.drawRightString(x + width, baseline, line)
        else:
            pdf.drawString(x, baseline, line)
        baseline -= leading
    return y_top - baseline


def fit_image(path: Path, max_width: float, max_height: float) -> ImageReader:
    image = Image.open(path).convert("RGB")
    fitted = ImageOps.contain(image, (int(max_width * 2), int(max_height * 2)), Image.Resampling.LANCZOS)
    canvas_image = Image.new("RGB", (int(max_width * 2), int(max_height * 2)), "white")
    canvas_image.paste(fitted, ((canvas_image.width - fitted.width) // 2, (canvas_image.height - fitted.height) // 2))
    return ImageReader(canvas_image)


_QR_CACHE: dict[str, ImageReader] = {}


def pronunciation_qr(russian_word: str) -> ImageReader:
    """QR code linking to an external, unofficial Google Translate TTS URL.

    There is no real audio in this project (see docs/WORD_SCHEMA.md Audio
    policy) and no public URL for the app itself, so this points at a free
    external TTS endpoint instead. It is unofficial and can rate-limit or
    change without notice - treat it as a bonus, not a guarantee.
    """
    if russian_word in _QR_CACHE:
        return _QR_CACHE[russian_word]
    query = urllib.parse.quote(russian_word)
    url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl=ru&client=tw-ob&q={query}"
    qr = qrcode.make(url, border=1, box_size=4)
    reader = ImageReader(qr.get_image())
    _QR_CACHE[russian_word] = reader
    return reader


def draw_header(pdf: canvas.Canvas, title_en: str, title_ar: str, subtitle: str, page_no: int) -> None:
    pdf.setFillColor(ACCENT)
    pdf.rect(0, PAGE_HEIGHT - 16, PAGE_WIDTH, 16, fill=1, stroke=0)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 20)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 44, title_en)
    pdf.setFont(FONT_BOLD, 15)
    pdf.drawRightString(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 44, shape_arabic(title_ar))
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 9.5)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 58, subtitle)
    pdf.drawRightString(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 58, f"Page {page_no}")
    pdf.setStrokeColor(CARD_BORDER)
    pdf.line(MARGIN, PAGE_HEIGHT - 66, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 66)


def draw_footer(pdf: canvas.Canvas, page_no: int, profile: dict) -> None:
    pdf.setStrokeColor(CARD_BORDER)
    pdf.line(MARGIN, 18, PAGE_WIDTH - MARGIN, 18)
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 8.8)
    pdf.drawString(MARGIN, 8, profile["footer_label"])
    pdf.drawRightString(PAGE_WIDTH - MARGIN, 8, str(page_no))


def draw_cover(pdf: canvas.Canvas, total_words: int, profile: dict) -> None:
    pdf.setFillColor(colors.white)
    pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    pdf.setFillColor(ACCENT)
    pdf.rect(0, PAGE_HEIGHT - 76, PAGE_WIDTH, 76, fill=1, stroke=0)

    pdf.setFillColor(colors.white)
    pdf.setFont(FONT_BOLD, 28)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 54, "Russian Daily Life")
    pdf.setFont(FONT_BOLD, 20)
    pdf.drawRightString(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 54, shape_arabic("الحياة اليومية الروسية"))
    pdf.setFont(FONT_REGULAR, 14)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 98, f"Workbook - {profile['edition_en']}")
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 10.5)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 118, f"{total_words} words - 6 sections - photo cards + writing + review pages")
    pdf.drawString(MARGIN, PAGE_HEIGHT - 136, "Use this book offline while the website handles audio, progress, and quizzes.")

    cover_images = [
        ("assets/images/words/house.jpg", MARGIN, PAGE_HEIGHT - 300, 160, 108),
        ("assets/images/words/kitchen.jpg", MARGIN + 170, PAGE_HEIGHT - 300, 160, 108),
        ("assets/images/words/bedroom.jpg", MARGIN, PAGE_HEIGHT - 420, 160, 108),
        ("assets/images/words/bathroom.jpg", MARGIN + 170, PAGE_HEIGHT - 420, 160, 108),
    ]
    for rel_path, x, y, width, height in cover_images:
        image_path = ROOT / rel_path
        pdf.roundRect(x, y, width, height, 10, fill=0, stroke=1)
        pdf.drawImage(fit_image(image_path, width - 8, height - 8), x + 4, y + 4, width - 8, height - 8, preserveAspectRatio=True, anchor="c")

    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 13)
    pdf.drawString(MARGIN, 255, "What is inside")
    pdf.setFont(FONT_REGULAR, 11)
    meaning_note = " and ".join(MEANING_LABELS[lang] for lang in profile["card_meanings"])
    bullets = [
        "Photo cards for every word in the app - Russian first, with stressed pronunciation.",
        f"Meaning shown in: {meaning_note}.",
        "Example sentence to support reading and speaking.",
        "Writing, recall, matching, and spaced-review pages.",
        "QR code per word for a quick external pronunciation check.",
    ]
    bullet_y = 232
    for bullet in bullets:
        pdf.circle(MARGIN + 4, bullet_y + 3, 1.6, fill=1, stroke=0)
        pdf.drawString(MARGIN + 12, bullet_y, bullet)
        bullet_y -= 19

    callout_x = PAGE_WIDTH - MARGIN - 240
    callout_y = 152
    pdf.setStrokeColor(CARD_BORDER)
    pdf.setFillColor(colors.white)
    pdf.roundRect(callout_x, callout_y, 240, 110, 12, fill=1, stroke=1)
    pdf.setFillColor(ACCENT)
    pdf.setFont(FONT_BOLD, 12)
    pdf.drawRightString(PAGE_WIDTH - MARGIN - 12, callout_y + 88, shape_arabic(profile["edition_ar"]))
    pdf.setFillColor(TEXT)
    draw_wrapped_text(
        pdf,
        "اعتمد على الموقع للصوت والاختبارات، واعتمد على الكتاب للكتابة والمراجعة والطباعة.",
        callout_x + 12,
        callout_y + 66,
        216,
        FONT_REGULAR,
        10.2,
        13,
        color=TEXT,
        align="right",
    )

    draw_footer(pdf, 1, profile)


def draw_contents_v2(pdf: canvas.Canvas, grouped: dict[str, list[dict]], page_no: int, plan: dict, profile: dict) -> None:
    draw_header(pdf, "Contents", "الفهرس", "Reference, writing, and review map", page_no)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 16)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 100, "Chapter overview")
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 10.5)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 118, "Every section is followed by writing practice and a self-test.")

    table_x = MARGIN
    table_y = PAGE_HEIGHT - 145
    row_h = 28
    col_w1 = 205
    col_w2 = 108
    col_w3 = 108
    col_w4 = 108
    table_width = col_w1 + col_w2 + col_w3 + col_w4
    pdf.setStrokeColor(CARD_BORDER)
    pdf.setFillColor(colors.white)
    pdf.roundRect(table_x, table_y - (len(SECTION_ORDER) + 1) * row_h, table_width, (len(SECTION_ORDER) + 1) * row_h, 12, fill=1, stroke=1)
    pdf.setFillColor(ACCENT_LIGHT)
    pdf.rect(table_x, table_y, table_width, row_h, fill=1, stroke=0)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 9.5)
    pdf.drawString(table_x + 10, table_y + 9, "Section")
    pdf.drawString(table_x + col_w1 + 10, table_y + 9, "Reference")
    pdf.drawString(table_x + col_w1 + col_w2 + 10, table_y + 9, "Writing")
    pdf.drawString(table_x + col_w1 + col_w2 + col_w3 + 10, table_y + 9, "Test")
    for index, section in enumerate(SECTION_ORDER, start=1):
        row_y = table_y - index * row_h
        pdf.setStrokeColor(CARD_BORDER)
        pdf.line(table_x, row_y, table_x + table_width, row_y)
        title_en, title_ar = SECTION_TITLES[section]
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_BOLD, 9.5)
        pdf.drawString(table_x + 10, row_y + 9, f"{index}. {title_en}")
        pdf.setFont(FONT_REGULAR, 8.6)
        pdf.drawRightString(table_x + col_w1 - 10, row_y + 9, shape_arabic(title_ar))
        pdf.setFont(FONT_BOLD, 9.5)
        pdf.drawString(table_x + col_w1 + 10, row_y + 9, str(plan["reference_pages"][section][0]))
        pdf.drawString(table_x + col_w1 + col_w2 + 10, row_y + 9, str(plan["writing_pages"][section][0]))
        pdf.drawString(table_x + col_w1 + col_w2 + col_w3 + 10, row_y + 9, str(plan["test_pages"][section]))

    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 13)
    pdf.drawString(MARGIN, 425, "Book tools")
    pdf.setFont(FONT_REGULAR, 10.2)
    tools = [
        f"Pronunciation guide: page {plan['pronunciation_page']}.",
        f"Cumulative reviews: pages {plan['cumulative_pages'][0]}-{plan['cumulative_pages'][-1]}.",
        f"Word index: pages {plan['index_pages'][0]}-{plan['index_pages'][-1]}.",
        "Answer keys are placed at the end so you can test yourself first.",
    ]
    tool_y = 403
    for tool in tools:
        pdf.circle(MARGIN + 4, tool_y + 3, 1.6, fill=1, stroke=0)
        pdf.drawString(MARGIN + 12, tool_y, tool)
        tool_y -= 17

    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 13)
    pdf.drawString(MARGIN, 313, "How to use each word")
    steps = [
        "1. Look at the photo, say the Russian word, then check the stressed pronunciation line.",
        "2. Cover the meaning column and recall it from memory.",
        "3. Complete the writing page and section test before checking the answer key.",
        "4. Scan the QR code if you want to hear an external pronunciation check.",
    ]
    pdf.setFont(FONT_REGULAR, 10.2)
    step_y = 291
    for step in steps:
        pdf.drawString(MARGIN + 8, step_y, step)
        step_y -= 17

    draw_footer(pdf, page_no, profile)


def draw_card_v3(pdf: canvas.Canvas, item: dict, x: float, y: float, section_label: str, profile: dict) -> None:
    pdf.setFillColor(CARD_FILL)
    pdf.setStrokeColor(CARD_BORDER)
    pdf.roundRect(x, y, CARD_WIDTH, CARD_HEIGHT, 14, fill=1, stroke=1)

    tag_y = y + CARD_HEIGHT - 20
    pdf.setFillColor(ACCENT_LIGHT)
    pdf.roundRect(x + 10, tag_y - 3, 128, 16, 8, fill=1, stroke=0)
    pdf.setFillColor(ACCENT)
    pdf.setFont(FONT_BOLD, 8.2)
    pdf.drawString(x + 16, tag_y, f"{item['id']} - {section_label}")
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 8)
    pdf.drawRightString(x + CARD_WIDTH - 12, tag_y, f"Lv {item.get('level', '')} | Freq {item.get('frequency', '')}")

    image_top = tag_y - 12
    image_path = resolve_image_path(item["imagePath"])
    pdf.drawImage(
        fit_image(image_path, CARD_WIDTH - 20, CARD_IMAGE_HEIGHT),
        x + 10,
        image_top - CARD_IMAGE_HEIGHT,
        CARD_WIDTH - 20,
        CARD_IMAGE_HEIGHT,
        preserveAspectRatio=True,
        anchor="c",
    )

    # QR badge overlapping the photo's inner corner - external pronunciation check.
    qr_x = x + CARD_WIDTH - 10 - QR_SIZE
    qr_y = image_top - QR_SIZE
    pdf.setFillColor(colors.white)
    pdf.roundRect(qr_x - 2, qr_y - 2, QR_SIZE + 4, QR_SIZE + 4, 4, fill=1, stroke=0)
    pdf.drawImage(pronunciation_qr(item["russian"]), qr_x, qr_y, QR_SIZE, QR_SIZE)

    text_x = x + CARD_TEXT_X
    cursor = image_top - CARD_IMAGE_HEIGHT - 14

    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 19)
    pdf.drawString(text_x, cursor, item["russian"])
    cursor -= 16

    pdf.setFillColor(ACCENT)
    pdf.setFont(FONT_REGULAR, 10.5)
    pdf.drawString(text_x, cursor, item.get("transliterationStressed") or item.get("transliteration", ""))
    cursor -= 16

    meaning_font_size = 10.6 if len(profile["card_meanings"]) == 1 else 9.2
    meaning_leading = 13 if len(profile["card_meanings"]) == 1 else 11.2
    meaning_color = TEXT if len(profile["card_meanings"]) == 1 else MUTED
    for lang in profile["card_meanings"]:
        value = item.get("arabic") if lang == "ar" else item.get("english")
        align = "right" if lang == "ar" else "left"
        used = draw_wrapped_text(pdf, value, text_x, cursor, CARD_TEXT_WIDTH, FONT_BOLD, meaning_font_size, meaning_leading, color=meaning_color, align=align)
        cursor -= max(used, meaning_leading)

    cursor -= 6
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_BOLD, 9)
    pdf.drawString(text_x, cursor, "Russian example")
    cursor -= 12
    pdf.setFillColor(TEXT)
    used = draw_wrapped_text(pdf, item["exampleRu"], text_x, cursor, CARD_TEXT_WIDTH, FONT_REGULAR, 8.7, 10.5, color=TEXT)
    cursor -= max(used, 10.5)
    for lang in profile["example_langs"]:
        value = item.get("exampleAr") if lang == "ar" else item.get("exampleEn")
        align = "right" if lang == "ar" else "left"
        used = draw_wrapped_text(pdf, value, text_x, cursor, CARD_TEXT_WIDTH, FONT_REGULAR, 8.3, 9.8, color=MUTED, align=align)
        cursor -= max(used, 9.8)


def draw_section_pages_v2(pdf: canvas.Canvas, grouped: dict[str, list[dict]], plan: dict, profile: dict) -> None:
    for section in SECTION_ORDER:
        items = grouped.get(section, [])
        if not items:
            continue
        title_en, title_ar = SECTION_TITLES[section]
        for page_index, page_no in enumerate(plan["reference_pages"][section]):
            draw_header(pdf, title_en, title_ar, f"{len(items)} photo cards - pronunciation + examples", page_no)
            page_items = items[page_index * 4 : (page_index + 1) * 4]
            positions = [
                (MARGIN, PAGE_HEIGHT - 66 - HEADER_HEIGHT - CARD_HEIGHT),
                (MARGIN + CARD_WIDTH + GAP, PAGE_HEIGHT - 66 - HEADER_HEIGHT - CARD_HEIGHT),
                (MARGIN, MARGIN + FOOTER_HEIGHT + GAP),
                (MARGIN + CARD_WIDTH + GAP, MARGIN + FOOTER_HEIGHT + GAP),
            ]
            for item, (x, y) in zip(page_items, positions):
                draw_card_v3(pdf, item, x, y, title_en, profile)
            draw_footer(pdf, page_no, profile)
            pdf.showPage()

        writing_chunks = chunk_items(items, WORDS_PER_WRITING_PAGE)
        for part_index, (page_no, page_items) in enumerate(zip(plan["writing_pages"][section], writing_chunks), start=1):
            draw_writing_page(pdf, section, page_items, page_no, part_index, len(writing_chunks), profile, bonus=len(items) <= SHORT_SECTION_THRESHOLD)
            pdf.showPage()

        draw_section_test_page(pdf, section, items, plan["test_pages"][section], profile)
        pdf.showPage()


def draw_progress_page(pdf: canvas.Canvas, grouped: dict[str, list[dict]], page_no: int, profile: dict) -> None:
    draw_header(pdf, "My progress", "متابعة تقدمي", "Check each part as you complete it", page_no)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 16)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 100, "Start with a small promise")
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 10.3)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 118, "Write your name, choose a pace, and mark the work you finish on paper.")

    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 10.5)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 155, "Name:")
    draw_rule(pdf, MARGIN + 42, PAGE_HEIGHT - 153, 180)
    pdf.drawString(MARGIN + 250, PAGE_HEIGHT - 155, "Start date:")
    draw_rule(pdf, MARGIN + 310, PAGE_HEIGHT - 153, 100)

    table_x = MARGIN
    table_y = PAGE_HEIGHT - 190
    row_h = 49
    table_width = PAGE_WIDTH - 2 * MARGIN
    pdf.setFillColor(colors.white)
    pdf.setStrokeColor(CARD_BORDER)
    pdf.roundRect(table_x, table_y - (len(SECTION_ORDER) + 1) * row_h, table_width, (len(SECTION_ORDER) + 1) * row_h, 12, fill=1, stroke=1)
    pdf.setFillColor(ACCENT_LIGHT)
    pdf.rect(table_x, table_y, table_width, row_h, fill=1, stroke=0)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 9.5)
    pdf.drawString(table_x + 10, table_y + 18, "Section")
    pdf.drawString(table_x + 210, table_y + 18, "Words")
    pdf.drawString(table_x + 270, table_y + 18, "Reference")
    pdf.drawString(table_x + 360, table_y + 18, "Writing")
    pdf.drawString(table_x + 450, table_y + 18, "Test")
    for index, section in enumerate(SECTION_ORDER, start=1):
        row_y = table_y - index * row_h
        pdf.setStrokeColor(CARD_BORDER)
        pdf.line(table_x, row_y, table_x + table_width, row_y)
        title_en, title_ar = SECTION_TITLES[section]
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_BOLD, 9.3)
        pdf.drawString(table_x + 10, row_y + 28, title_en)
        pdf.setFont(FONT_REGULAR, 8.7)
        pdf.drawRightString(table_x + 195, row_y + 14, shape_arabic(title_ar))
        pdf.setFont(FONT_BOLD, 10)
        pdf.drawString(table_x + 210, row_y + 22, str(len(grouped.get(section, []))))
        draw_checkbox(pdf, table_x + 270, row_y + 25, "done")
        draw_checkbox(pdf, table_x + 360, row_y + 25, "done")
        draw_checkbox(pdf, table_x + 450, row_y + 25, "done")

    callout_y = 112
    pdf.setFillColor(SUCCESS_FILL)
    pdf.setStrokeColor(CARD_BORDER)
    pdf.roundRect(MARGIN, callout_y, PAGE_WIDTH - 2 * MARGIN, 82, 12, fill=1, stroke=1)
    pdf.setFillColor(ACCENT)
    pdf.setFont(FONT_BOLD, 12)
    pdf.drawString(MARGIN + 14, callout_y + 57, "Four marks of a useful study session")
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_REGULAR, 9.5)
    for index, text in enumerate(["I said the word aloud.", "I checked the pronunciation.", "I wrote it from memory.", "I reviewed it again later."]):
        draw_checkbox(pdf, MARGIN + 14 + (index % 2) * 255, callout_y + 30 - (index // 2) * 22, text, 220)
    draw_footer(pdf, page_no, profile)


def draw_writing_page(
    pdf: canvas.Canvas,
    section: str,
    items: list[dict],
    page_no: int,
    part_index: int,
    total_parts: int,
    profile: dict,
    bonus: bool = False,
) -> None:
    title_en, title_ar = SECTION_TITLES[section]
    draw_header(pdf, "Writing practice", f"{title_ar} - الكتابة", f"{title_en} - part {part_index} of {total_parts}", page_no)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 13)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 91, "Trace once, then write the word three times.")
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 9.2)
    pdf.drawRightString(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 91, shape_arabic("غطِّ المعنى واكتب من الذاكرة"))

    table_x = MARGIN
    table_top = PAGE_HEIGHT - 108
    table_width = PAGE_WIDTH - 2 * MARGIN
    header_h = 25
    row_h = 64
    word_x = table_x + 34
    meaning_x = table_x + 180
    writing_x = table_x + 350
    writing_width = table_width - 350 - 8
    table_height = header_h + row_h * len(items)
    pdf.setFillColor(colors.white)
    pdf.setStrokeColor(CARD_BORDER)
    pdf.roundRect(table_x, table_top - table_height, table_width, table_height, 10, fill=1, stroke=1)
    pdf.setFillColor(ACCENT_LIGHT)
    pdf.rect(table_x, table_top - header_h, table_width, header_h, fill=1, stroke=0)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 9)
    pdf.drawString(table_x + 8, table_top - 16, "#")
    pdf.drawString(word_x, table_top - 16, "Russian word")
    pdf.drawString(meaning_x, table_top - 16, "Meaning - cover this")
    pdf.drawString(writing_x, table_top - 16, "Trace and write")
    for column_x in (meaning_x - 14, writing_x - 14):
        pdf.setStrokeColor(CARD_BORDER)
        pdf.line(column_x, table_top - table_height, column_x, table_top)

    meaning_langs = profile["card_meanings"]
    for index, item in enumerate(items, start=1):
        row_top = table_top - header_h - (index - 1) * row_h
        row_bottom = row_top - row_h
        if index % 2 == 0:
            pdf.setFillColor(colors.HexColor("#FBFCFC"))
            pdf.rect(table_x + 1, row_bottom, table_width - 2, row_h, fill=1, stroke=0)
        pdf.setStrokeColor(CARD_BORDER)
        pdf.line(table_x, row_bottom, table_x + table_width, row_bottom)
        pdf.setFillColor(MUTED)
        pdf.setFont(FONT_BOLD, 9)
        pdf.drawString(table_x + 8, row_top - 22, str(index))
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_BOLD, 11.5)
        pdf.drawString(word_x, row_top - 20, item["russian"])
        pdf.setFillColor(ACCENT)
        pdf.setFont(FONT_REGULAR, 8.7)
        pdf.drawString(word_x, row_top - 35, item.get("transliterationStressed") or item.get("transliteration", ""))
        meaning_cursor = row_top - 18
        for lang in meaning_langs:
            value = item["arabic"] if lang == "ar" else item["english"]
            align = "right" if lang == "ar" else "left"
            pdf.setFillColor(TEXT if lang == meaning_langs[0] else MUTED)
            used = draw_wrapped_text(pdf, value, meaning_x, meaning_cursor, 155, FONT_BOLD if lang == meaning_langs[0] else FONT_REGULAR, 9.3 if lang == meaning_langs[0] else 8.3, 11, color=TEXT if lang == meaning_langs[0] else MUTED, align=align)
            meaning_cursor -= max(used, 11)
        pdf.setFillColor(TRACE_TEXT)
        pdf.setFont(FONT_REGULAR, 9.5)
        pdf.drawString(writing_x, row_top - 17, f"Trace: {item['russian']}")
        draw_rule(pdf, writing_x, row_top - 31, writing_width, dashed=True)
        draw_rule(pdf, writing_x, row_top - 46, writing_width)
        draw_rule(pdf, writing_x, row_top - 60, writing_width)

    bonus_top = table_top - table_height - 22
    if bonus and bonus_top > 90:
        pdf.setFillColor(EXERCISE_FILL)
        pdf.setStrokeColor(CARD_BORDER)
        pdf.roundRect(table_x, 60, table_width, bonus_top - 60, 10, fill=1, stroke=1)
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_BOLD, 10.5)
        pdf.drawString(table_x + 14, bonus_top - 20, "Bonus: build your own sentence")
        pdf.setFillColor(MUTED)
        pdf.setFont(FONT_REGULAR, 8.8)
        pdf.drawRightString(table_x + table_width - 14, bonus_top - 20, shape_arabic("مكافأة: كوّن جملتك الخاصة"))
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_REGULAR, 9.2)
        pdf.drawString(table_x + 14, bonus_top - 38, "Pick two words from this page and write one Russian sentence using both of them.")
        for line_y in range(int(bonus_top) - 58, 75, -22):
            draw_rule(pdf, table_x + 14, line_y, table_width - 28)

    draw_footer(pdf, page_no, profile)


def matching_items(items: list[dict]) -> tuple[list[dict], list[dict]]:
    selected = choose_items(items, min(8, len(items)))
    if len(selected) < 2:
        return selected, selected
    rotation = 2 if len(selected) > 3 else 1
    return selected, selected[rotation:] + selected[:rotation]


def meaning_text(item: dict, profile: dict) -> str:
    parts = [item["arabic"] if lang == "ar" else item["english"] for lang in profile["card_meanings"]]
    return " / ".join(parts)


def draw_matching_exercise(pdf: canvas.Canvas, items: list[dict], y_top: float, profile: dict) -> float:
    selected, meanings = matching_items(items)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 11.5)
    pdf.drawString(MARGIN, y_top, "1. Match the Russian word to its meaning")
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 8.7)
    pdf.drawRightString(PAGE_WIDTH - MARGIN, y_top, shape_arabic("صِل الكلمة بالمعنى الصحيح"))
    y_top -= 18
    row_h = 26
    left_x = MARGIN + 10
    right_x = MARGIN + 282
    for index, item in enumerate(selected):
        row_y = y_top - index * row_h
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_BOLD, 9.5)
        pdf.drawString(left_x, row_y, f"{index + 1}. {item['russian']}")
        pdf.setFillColor(ACCENT)
        pdf.setFont(FONT_REGULAR, 7.8)
        pdf.drawString(left_x + 3, row_y - 11, item.get("transliterationStressed") or item.get("transliteration", ""))
        pdf.setStrokeColor(WRITING_LINE)
        pdf.setDash(2, 2)
        pdf.line(left_x + 150, row_y - 2, right_x - 16, row_y - 2)
        pdf.setDash()
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_BOLD, 9)
        pdf.drawString(right_x, row_y, f"{chr(65 + index)}.")
        primary_lang = profile["card_meanings"][0]
        primary_value = meanings[index]["arabic"] if primary_lang == "ar" else meanings[index]["english"]
        draw_wrapped_text(pdf, primary_value, right_x + 18, row_y, 212, FONT_BOLD, 8.7, 9.5, color=TEXT, align="right" if primary_lang == "ar" else "left")
        if len(profile["card_meanings"]) > 1:
            secondary_lang = profile["card_meanings"][1]
            secondary_value = meanings[index]["arabic"] if secondary_lang == "ar" else meanings[index]["english"]
            pdf.setFillColor(MUTED)
            pdf.setFont(FONT_REGULAR, 7.8)
            pdf.drawString(right_x + 18, row_y - 11, secondary_value)
    return y_top - len(selected) * row_h - 8


def draw_fill_exercise(pdf: canvas.Canvas, items: list[dict], y_top: float, profile: dict) -> tuple[float, list[dict]]:
    selected = choose_items(items, min(3, len(items)))
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 11.5)
    pdf.drawString(MARGIN, y_top, "2. Complete the Russian sentence")
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 8.7)
    pdf.drawRightString(PAGE_WIDTH - MARGIN, y_top, shape_arabic("اكتب الكلمة الروسية الناقصة"))
    y_top -= 19
    row_height = 39 if profile["example_langs"] else 26
    for index, item in enumerate(selected, start=1):
        sentence_y = y_top - (index - 1) * row_height
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_REGULAR, 9.2)
        pdf.drawString(MARGIN + 10, sentence_y, f"{index}. {make_blank_sentence(item)}")
        hint_y = sentence_y - 13
        for lang in profile["example_langs"]:
            value = item["exampleAr"] if lang == "ar" else item["exampleEn"]
            pdf.setFillColor(MUTED)
            used = draw_wrapped_text(pdf, value, MARGIN + 10, hint_y, PAGE_WIDTH - 2 * MARGIN - 20, FONT_REGULAR, 8.2, 9.5, color=MUTED, align="right" if lang == "ar" else "left")
            hint_y -= max(used, 9.5)
    return y_top - len(selected) * row_height - 9, selected


def draw_grammar_exercise(pdf: canvas.Canvas, items: list[dict], y_top: float) -> None:
    selected = choose_items(items, min(3, len(items)))
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 11.5)
    pdf.drawString(MARGIN, y_top, "3. Grammar check: gender and plural")
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 8.7)
    pdf.drawRightString(PAGE_WIDTH - MARGIN, y_top, shape_arabic("حدّد الجنس واكتب الجمع"))
    y_top -= 21
    columns = [(MARGIN + 10, "Word"), (MARGIN + 190, "Gender"), (MARGIN + 310, "Plural")]
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_BOLD, 8.4)
    for x, label in columns:
        pdf.drawString(x, y_top, label)
    for index, item in enumerate(selected, start=1):
        row_y = y_top - index * 29
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_REGULAR, 9.2)
        pdf.drawString(MARGIN + 10, row_y, f"{index}. {item['russian']}")
        pdf.setFont(FONT_REGULAR, 8.8)
        pdf.drawString(MARGIN + 190, row_y, "M   F   N")
        draw_rule(pdf, MARGIN + 310, row_y - 1, 190)


def draw_section_test_page(pdf: canvas.Canvas, section: str, items: list[dict], page_no: int, profile: dict) -> None:
    title_en, title_ar = SECTION_TITLES[section]
    draw_header(pdf, "Section test", f"اختبار - {title_ar}", f"{title_en} - close the book before you begin", page_no)
    pdf.setFillColor(EXERCISE_FILL)
    pdf.setStrokeColor(CARD_BORDER)
    pdf.roundRect(MARGIN, PAGE_HEIGHT - 112, PAGE_WIDTH - 2 * MARGIN, 28, 8, fill=1, stroke=1)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_REGULAR, 9.2)
    pdf.drawString(MARGIN + 12, PAGE_HEIGHT - 101, "Score: ____ / ____     Date: __________     I used the website audio:  Yes / No")
    y = PAGE_HEIGHT - 137
    y = draw_matching_exercise(pdf, items, y, profile)
    fill_y, fill_items = draw_fill_exercise(pdf, items, y, profile)
    draw_grammar_exercise(pdf, items, fill_y)
    draw_footer(pdf, page_no, profile)


def draw_solution_page(pdf: canvas.Canvas, title_en: str, title_ar: str, items: list[dict], page_no: int, subtitle: str, profile: dict) -> None:
    draw_header(pdf, "Answer key", f"الإجابات - {title_ar}", subtitle, page_no)
    selected, meanings = matching_items(items)
    right_index = {item["id"]: chr(65 + index) for index, item in enumerate(meanings)}

    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 11.5)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 95, "Matching")
    y = PAGE_HEIGHT - 116
    for index, item in enumerate(selected, start=1):
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_REGULAR, 9.2)
        # The Latin prefix and the meaning are drawn as two separate calls,
        # and the meaning itself is shaped/bidi-processed as one unit via
        # draw_wrapped_text (which calls shape_arabic internally) instead of
        # being concatenated raw into an f-string - that raw concatenation
        # was the old bug: unshaped Arabic glyphs rendering disconnected and
        # in the wrong visual order next to Latin text.
        pdf.drawString(MARGIN + 12, y, f"{index}. {item['russian']}  ({item.get('transliterationStressed') or item.get('transliteration', '')})  ->  {right_index[item['id']]}")
        meaning_x = MARGIN + 320
        draw_wrapped_text(pdf, meaning_text(item, profile), meaning_x, y, PAGE_WIDTH - MARGIN - meaning_x, FONT_REGULAR, 9.2, 11, color=MUTED)
        y -= 20

    fill_items = choose_items(items, min(3, len(items)))
    y -= 8
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 11.5)
    pdf.drawString(MARGIN, y, "Sentence answers")
    y -= 20
    for item in fill_items:
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_REGULAR, 9.2)
        pdf.drawString(MARGIN + 12, y, item["russian"])
        pdf.setFont(FONT_REGULAR, 8.8)
        pdf.drawString(MARGIN + 12 + 90, y, item["exampleRu"])
        y -= 19

    y -= 8
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 11.5)
    pdf.drawString(MARGIN, y, "Gender and plural")
    y -= 20
    for item in choose_items(items, min(3, len(items))):
        plural = item.get("grammar", {}).get("ru", {}).get("plural", "")
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_REGULAR, 9.2)
        pdf.drawString(MARGIN + 12, y, f"{item['russian']}  -  {gender_label(item)}  -  {plural}")
        y -= 19
    draw_footer(pdf, page_no, profile)


def draw_cumulative_review_pages(pdf: canvas.Canvas, words: list[dict], plan: dict, profile: dict) -> list[list[dict]]:
    chunks = chunk_items(words, CUMULATIVE_REVIEW_SIZE)
    for index, (page_no, items) in enumerate(zip(plan["cumulative_pages"], chunks), start=1):
        draw_header(pdf, "Cumulative review", "مراجعة تراكمية", f"Mixed words - review {index} of {len(chunks)}", page_no)
        pdf.setFillColor(EXERCISE_FILL)
        pdf.setStrokeColor(CARD_BORDER)
        pdf.roundRect(MARGIN, PAGE_HEIGHT - 112, PAGE_WIDTH - 2 * MARGIN, 28, 8, fill=1, stroke=1)
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_REGULAR, 9.2)
        pdf.drawString(MARGIN + 12, PAGE_HEIGHT - 101, "Mix the rooms: recall the word, write it, then check the answer key later.")
        y = PAGE_HEIGHT - 137
        y = draw_matching_exercise(pdf, items, y, profile)
        fill_y, _ = draw_fill_exercise(pdf, items, y, profile)
        draw_grammar_exercise(pdf, items, fill_y)
        draw_footer(pdf, page_no, profile)
        pdf.showPage()
    return chunks


def draw_index_pages(pdf: canvas.Canvas, words: list[dict], plan: dict, profile: dict) -> None:
    index_langs = profile["index_langs"]
    columns = len(index_langs)
    column_width = (PAGE_WIDTH - 2 * MARGIN) / columns
    sort_key = {
        "ru": lambda item: item["russian"].casefold(),
        "ar": lambda item: item["arabic"].casefold(),
        "en": lambda item: item["english"].casefold(),
    }
    column_labels = {"ru": "Russian -> page", "ar": "Arabic -> page", "en": "English -> page"}
    entries_by_lang = {lang: sorted(words, key=sort_key[lang]) for lang in index_langs}

    for page_index, page_no in enumerate(plan["index_pages"]):
        start = page_index * INDEX_ENTRIES_PER_PAGE
        end = start + INDEX_ENTRIES_PER_PAGE
        draw_header(pdf, "Word index", "الفهرس", f"Lookup - part {page_index + 1} of {len(plan['index_pages'])}", page_no)
        for col_index, lang in enumerate(index_langs):
            col_x = MARGIN + col_index * column_width
            pdf.setFillColor(TEXT)
            pdf.setFont(FONT_BOLD, 11)
            pdf.drawString(col_x, PAGE_HEIGHT - 94, column_labels[lang])
            if col_index > 0:
                pdf.setStrokeColor(CARD_BORDER)
                pdf.line(col_x - 8, PAGE_HEIGHT - 82, col_x - 8, 35)
            row_h = 17
            for row, item in enumerate(entries_by_lang[lang][start:end]):
                y = PAGE_HEIGHT - 115 - row * row_h
                page_ref = str(plan["word_reference_page"][item["id"]])
                pdf.setFillColor(TEXT)
                pdf.setFont(FONT_REGULAR, 8.7)
                if lang == "ar":
                    pdf.drawRightString(col_x + column_width - 36, y, shape_arabic(item["arabic"]))
                    pdf.setFillColor(MUTED)
                    pdf.drawRightString(col_x + column_width - 12, y, page_ref)
                else:
                    value = item["russian"] if lang == "ru" else item["english"]
                    pdf.drawString(col_x, y, value)
                    pdf.setFillColor(MUTED)
                    pdf.drawRightString(col_x + column_width - 12, y, page_ref)
        draw_footer(pdf, page_no, profile)
        pdf.showPage()


PRONUNCIATION_POINTS = [
    (
        "Stress moves the vowel",
        "التشديد يغيّر صوت الحرف الساكن عنه",
        "An unstressed 'o' sounds like a soft 'a' (dom vs kvartíra). Always learn the stress mark, not just the letters.",
        "الحرف 'о' غير المشدّد يُنطق قريبًا من 'a' الخفيفة. تعلّم موضع التشديد دائمًا، لا الحروف فقط.",
    ),
    (
        "Soft sign (ь) softens the consonant before it",
        "علامة التليين (ь) تلطّف الحرف الساكن قبلها",
        "дверь, кровать, кухня - the consonant just before ь is pronounced with the tongue closer to the roof of the mouth, like a light 'y' blended in.",
        "في дверь و кровать و кухня، يُنطق الحرف قبل ь بشكل ألطف، وكأن صوت 'ي' خفيف يمتزج به.",
    ),
    (
        "Hard sign (ъ) keeps consonants hard",
        "العلامة الصلبة (ъ) تُبقي الحرف صلبًا",
        "Rare in this word list, but it blocks softening before a following iotated vowel (е, ё, ю, я).",
        "نادرة في كلمات هذا الكتاب، لكنها تمنع تليين الحرف قبل حروف العلة المُيوَتة (е، ё، ю، я).",
    ),
    (
        "ё is always stressed",
        "الحرف ё مشدّد دائمًا",
        "ковёр, щётка - if you see ё, that syllable is the stressed one. No extra mark is needed in this book.",
        "ковёр و щётка - إذا رأيت الحرف ё فهذا يعني أن هذه المقطع هو المشدّد، ولا حاجة لعلامة إضافية.",
    ),
    (
        "р is rolled, х is a throat sound",
        "р حرف مُرَعْرَع، و х صوت حلقي",
        "р is trilled with the tongue tip, closer to Arabic ر. х is a breathy back-of-throat sound, closer to Arabic خ than to English 'h'.",
        "р يُنطق بارتعاش طرف اللسان، قريب من الراء العربية. х صوت خلفي من الحلق، أقرب للخاء العربية منه لصوت h الإنجليزي.",
    ),
    (
        "ы is not like English 'i'",
        "الحرف ы لا يُنطق مثل 'i' الإنجليزية",
        "часы, стиральная машина (мaшина has и, but plural forms often use ы) - keep the tongue low and back; it is a distinct vowel with no exact Arabic or English equivalent.",
        "часы - يُنطق بلسان منخفض ومسحوب للخلف، وهو صوت متميز لا يوجد له مقابل دقيق في العربية أو الإنجليزية.",
    ),
]


def draw_pronunciation_page(pdf: canvas.Canvas, page_no: int, profile: dict) -> None:
    draw_header(pdf, "Russian pronunciation", "النطق الروسي", "Sounds and letters that need extra attention", page_no)
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 10)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 88, "Read this once before you start, then come back whenever a word feels hard to say.")

    y = PAGE_HEIGHT - 116
    for title_en, title_ar, body_en, body_ar in PRONUNCIATION_POINTS:
        pdf.setFillColor(colors.white)
        pdf.setStrokeColor(CARD_BORDER)
        block_height = 74
        pdf.roundRect(MARGIN, y - block_height, PAGE_WIDTH - 2 * MARGIN, block_height, 10, fill=1, stroke=1)
        pdf.setFillColor(ACCENT)
        pdf.setFont(FONT_BOLD, 11.5)
        pdf.drawString(MARGIN + 14, y - 20, title_en)
        pdf.setFont(FONT_BOLD, 10.5)
        pdf.drawRightString(PAGE_WIDTH - MARGIN - 14, y - 20, shape_arabic(title_ar))
        pdf.setFillColor(TEXT)
        draw_wrapped_text(pdf, body_en, MARGIN + 14, y - 37, (PAGE_WIDTH - 2 * MARGIN - 28) / 2 - 8, FONT_REGULAR, 8.8, 11, color=TEXT)
        draw_wrapped_text(pdf, body_ar, MARGIN + (PAGE_WIDTH - 2 * MARGIN) / 2 + 8, y - 37, (PAGE_WIDTH - 2 * MARGIN - 28) / 2, FONT_REGULAR, 8.6, 11, color=TEXT, align="right")
        y -= block_height + 10

    pdf.setFillColor(EXERCISE_FILL)
    pdf.setStrokeColor(CARD_BORDER)
    pdf.roundRect(MARGIN, 55, PAGE_WIDTH - 2 * MARGIN, 68, 10, fill=1, stroke=1)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 10.5)
    pdf.drawString(MARGIN + 14, 100, "Scan a QR code on any reference card for an external pronunciation check.")
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 8.6)
    draw_wrapped_text(
        pdf,
        "The QR codes link to a free, unofficial text-to-speech service. If a code does not load, use the speaker button on the website instead - it always works offline once the page is cached.",
        MARGIN + 14,
        82,
        PAGE_WIDTH - 2 * MARGIN - 28,
        FONT_REGULAR,
        8.6,
        11,
        color=MUTED,
    )
    draw_footer(pdf, page_no, profile)


def draw_notes_v2(pdf: canvas.Canvas, page_no: int, profile: dict) -> None:
    draw_header(pdf, "Workbook guide", "دليل استخدام الكتاب", f"{profile['edition_en']} - a practical companion for the website", page_no)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 15)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 100, "Use the book as a cycle, not a one-time read")
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 10.2)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 120, "The website supplies audio and interactive quizzes; these pages make recall and handwriting visible.")

    steps = [
        ("1. Reference", "Study the image, Russian word first, its stressed pronunciation, then the meaning."),
        ("2. Cover and recall", "Hide the meaning column and say the meaning from memory."),
        ("3. Write", "Trace the word once, then write it on all three lines without looking."),
        ("4. Test", "Complete matching, sentence gaps, gender, and plural before opening the answer key."),
        ("5. Revisit", "Use the cumulative review pages on day 1, day 3, after one week, and after one month."),
    ]
    y = PAGE_HEIGHT - 165
    for heading, body in steps:
        pdf.setFillColor(ACCENT)
        pdf.setFont(FONT_BOLD, 11)
        pdf.drawString(MARGIN, y, heading)
        pdf.setFillColor(TEXT)
        draw_wrapped_text(pdf, body, MARGIN + 140, y, PAGE_WIDTH - 2 * MARGIN - 140, FONT_REGULAR, 10, 13, color=TEXT)
        y -= 48

    callout_y = 120
    pdf.setFillColor(SUCCESS_FILL)
    pdf.setStrokeColor(CARD_BORDER)
    pdf.roundRect(MARGIN, callout_y, PAGE_WIDTH - 2 * MARGIN, 120, 12, fill=1, stroke=1)
    pdf.setFillColor(ACCENT)
    pdf.setFont(FONT_BOLD, 13)
    pdf.drawString(MARGIN + 14, callout_y + 92, "Keep the answer key closed")
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_REGULAR, 10)
    draw_wrapped_text(
        pdf,
        "A wrong answer is useful when it shows what to review. Mark the word, return to its photo card, listen on the website, and try again later.",
        MARGIN + 14,
        callout_y + 70,
        PAGE_WIDTH - 2 * MARGIN - 28,
        FONT_REGULAR,
        10,
        14,
        color=TEXT,
    )
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 9)
    pdf.drawString(MARGIN + 14, callout_y + 18, "Website features: audio - progress tracking - quizzes - dark mode - Arabic, Russian, and English")
    draw_footer(pdf, page_no, profile)


def build_pdf(output_path: Path, profile: dict) -> None:
    register_fonts()
    words = load_words()
    grouped = group_words(words)
    all_words = ordered_words(grouped)
    plan = build_page_plan(grouped)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    pdf = canvas.Canvas(str(output_path), pagesize=A4)
    pdf.setTitle(f"Russian Daily Life Workbook - {profile['edition_en']}")
    pdf.setAuthor("Russian Daily Life project")
    pdf.setSubject("Companion workbook for the Russian Daily Life vocabulary app")

    draw_cover(pdf, len(words), profile)
    pdf.showPage()

    draw_contents_v2(pdf, grouped, 2, plan, profile)
    pdf.showPage()

    draw_progress_page(pdf, grouped, 3, profile)
    pdf.showPage()

    draw_section_pages_v2(pdf, grouped, plan, profile)

    draw_pronunciation_page(pdf, plan["pronunciation_page"], profile)
    pdf.showPage()

    cumulative_chunks = draw_cumulative_review_pages(pdf, all_words, plan, profile)
    draw_index_pages(pdf, all_words, plan, profile)

    for section in SECTION_ORDER:
        draw_solution_page(
            pdf,
            SECTION_TITLES[section][0],
            SECTION_TITLES[section][1],
            grouped.get(section, []),
            plan["solution_section_pages"][section],
            "Section test answers",
            profile,
        )
        pdf.showPage()
    for index, (page_no, items) in enumerate(zip(plan["solution_cumulative_pages"], cumulative_chunks), start=1):
        draw_solution_page(pdf, "Cumulative review", "مراجعة تراكمية", items, page_no, f"Cumulative review {index} answers", profile)
        pdf.showPage()

    draw_notes_v2(pdf, plan["notes_page"], profile)
    pdf.showPage()

    pdf.save()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--language", choices=["full", "ar", "en", "ru", "all"], default="full", help="Which audience edition(s) to build. 'full' is the comprehensive teacher/review reference (default). 'all' builds the three audience editions (ar, en, ru), not 'full'.")
    parser.add_argument("--output", default=None, help="Only valid for a single edition (full/ar/en/ru); ignored with --language all.")
    args = parser.parse_args()

    if args.language == "all":
        for key in ("ar", "en", "ru"):
            profile = LANGUAGE_PROFILES[key]
            build_pdf(OUTPUT_DIR / profile["output_name"], profile)
            print(f"Built {profile['output_name']}")
        return

    profile = LANGUAGE_PROFILES[args.language]
    output_path = Path(args.output) if args.output else OUTPUT_DIR / profile["output_name"]
    build_pdf(output_path, profile)
    print(f"Built {output_path}")


if __name__ == "__main__":
    main()
