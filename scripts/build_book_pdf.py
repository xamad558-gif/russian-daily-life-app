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
# (English, Arabic, Russian) - English is the universal/reference label shown
# for full/ar/en editions; Russian replaces it as the native-language label
# for the "ru" (Arabic for Russian speakers) edition. Arabic is always shown
# in its own header slot regardless of edition.
SECTION_TITLES = {
    "home": ("Home Basics", "الأساسيات المنزلية", "Основы дома"),
    "living-room": ("Living Room", "غرفة المعيشة", "Гостиная"),
    "bedroom": ("Bedroom", "غرفة النوم", "Спальня"),
    "kitchen": ("Kitchen", "المطبخ", "Кухня"),
    "bathroom": ("Bathroom", "الحمام", "Ванная"),
    "door-window": ("Doors and Windows", "الأبواب والنوافذ", "Двери и окна"),
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
        "target_lang": "ru",
        "native_langs": ("ar", "en"),
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
        "target_lang": "ru",
        "native_langs": ("ar",),
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
        "target_lang": "ru",
        "native_langs": ("en",),
        "card_meanings": ("en",),
        "example_langs": ("en",),
        "index_langs": ("ru", "en"),
        "footer_label": "Russian Daily Life - English learner edition",
    },
    "ru": {
        # Mirror direction: this edition is FOR a Russian-speaking reader
        # LEARNING ARABIC, not a Russian-immersion edition of the Russian
        # course. Arabic is the target/primary word on every card, writing
        # line, and exercise (see primary_word/primary_example/primary_grammar
        # and is_arabic_target() - they read target_lang, not a hardcoded
        # "russian" field); Russian is the native/meaning language shown
        # underneath. The existing Arabic-to-Cyrillic pronunciation field is
        # used for this profile.
        "key": "ru",
        "output_name": "russian_daily_life_workbook_ru.pdf",
        "edition_en": "Arabic for Russian Speakers",
        "edition_ar": "العربية للناطقين بالروسية",
        "edition_ru": "Арабский для русскоговорящих",
        "target_lang": "ar",
        "native_langs": ("ru",),
        "card_meanings": ("ru",),
        "example_langs": ("ru",),
        "index_langs": ("ar", "ru"),
        "footer_label": "Russian Daily Life - Арабский для русскоговорящих",
    },
}

MEANING_LABELS = {"ar": "SA Arabic", "en": "US English", "ru": "RU Russian"}
MEANING_LABELS_RU = {"ar": "арабский", "en": "английский", "ru": "русский"}

# Every piece of book "chrome" (headers, column labels, instructions,
# checklists) that isn't actual vocabulary content. Only the "ru" profile
# (target_lang == "ar") swaps English for Russian here - full/ar/en keep the
# original English chrome, since English has always been the universal
# reference label alongside the native-language label in this book's header
# pattern. Each value is (english, russian); dynamic strings use {name}
# placeholders filled in by t().
UI_TEXT = {
    "contents_title": ("Contents", "Содержание"),
    "contents_subtitle": ("Reference, writing, and review map", "Справочник, письмо и повторение"),
    "chapter_overview": ("Chapter overview", "Обзор разделов"),
    "contents_intro": ("Every section is followed by writing practice and a self-test.", "После каждого раздела идёт практика письма и самопроверка."),
    "col_section": ("Section", "Раздел"),
    "col_reference": ("Reference", "Справочник"),
    "col_writing": ("Writing", "Письмо"),
    "col_test": ("Test", "Тест"),
    "book_tools": ("Book tools", "Инструменты книги"),
    "tool_pronunciation": ("Pronunciation guide: page {page}.", "Руководство по произношению: стр. {page}."),
    "tool_cumulative": ("Cumulative reviews: pages {start}-{end}.", "Накопительные повторения: стр. {start}-{end}."),
    "tool_index": ("Word index: pages {start}-{end}.", "Указатель слов: стр. {start}-{end}."),
    "tool_answers": ("Answer keys are placed at the end so you can test yourself first.", "Ответы находятся в конце книги, чтобы вы могли сначала проверить себя."),
    "how_to_use": ("How to use each word", "Как работать с каждым словом"),
    "step2": ("2. Cover the meaning column and recall it from memory.", "2. Закройте столбец со значением и вспомните его по памяти."),
    "step3": ("3. Complete the writing page and section test before checking the answer key.", "3. Заполните страницу письма и тест раздела, прежде чем смотреть ответы."),
    "step4": ("4. Scan the QR code if you want to hear an external pronunciation check.", "4. Отсканируйте QR-код, если хотите проверить произношение."),
    "my_progress": ("My progress", "Мой прогресс"),
    "progress_subtitle": ("Check each part as you complete it", "Отмечайте каждую часть по мере выполнения"),
    "start_promise": ("Start with a small promise", "Начните с небольшого обещания"),
    "start_promise_body": ("Write your name, choose a pace, and mark the work you finish on paper.", "Напишите своё имя, выберите темп и отмечайте выполненную работу на бумаге."),
    "name_label": ("Name:", "Имя:"),
    "start_date_label": ("Start date:", "Дата начала:"),
    "col_words": ("Words", "Слов"),
    "checkbox_done": ("done", "готово"),
    "four_marks": ("Four marks of a useful study session", "Четыре признака полезного занятия"),
    "mark1": ("I said the word aloud.", "Я произнёс(ла) слово вслух."),
    "mark2": ("I checked the pronunciation.", "Я проверил(а) произношение."),
    "mark3": ("I wrote it from memory.", "Я написал(а) его по памяти."),
    "mark4": ("I reviewed it again later.", "Я повторил(а) его позже."),
    "writing_practice": ("Writing practice", "Практика письма"),
    "writing_page_subtitle": ("{section} - part {part} of {total}", "{section} - часть {part} из {total}"),
    "trace_instruction": ("Trace once, then write the word three times.", "Обведите один раз, затем напишите слово три раза."),
    "trace_cover_hint": ("Cover the meaning and write from memory", "Закройте значение и напишите по памяти"),
    "col_meaning_cover": ("Meaning - cover this", "Значение - закройте"),
    "col_trace_write": ("Trace and write", "Обведите и напишите"),
    "bonus_title": ("Bonus: build your own sentence", "Бонус: составьте своё предложение"),
    "bonus_kicker": ("Bonus: build your own sentence", "Бонус: составьте своё предложение"),
    "match_title": ("1. Match the Russian word to its meaning", "1. Соедините арабское слово с его значением"),
    "fill_title": ("2. Complete the Russian sentence", "2. Допишите арабское предложение"),
    "grammar_title": ("3. Grammar check: gender and plural", "3. Проверка грамматики: род и число"),
    "grammar_subtitle": ("Determine the gender and write the plural", "Определите род и напишите множественное число"),
    "col_word": ("Word", "Слово"),
    "col_gender": ("Gender", "Род"),
    "col_plural": ("Plural", "Множественное число"),
    "section_test": ("Section test", "Тест раздела"),
    "section_test_subtitle": ("{section} - close the book before you begin", "{section} - закройте книгу перед началом"),
    "score_line": (
        "Score: ____ / ____     Date: __________     I used the website audio:  Yes / No",
        "Баллы: ____ / ____     Дата: __________     Я использовал(а) аудио сайта:  Да / Нет",
    ),
    "answer_key": ("Answer key", "Ответы"),
    "answer_key_section_subtitle": ("Section test answers", "Ответы к тесту раздела"),
    "matching_label": ("Matching", "Соответствие"),
    "sentence_answers": ("Sentence answers", "Ответы к предложениям"),
    "gender_plural_label": ("Gender and plural", "Род и число"),
    "cumulative_review": ("Cumulative review", "Накопительное повторение"),
    "cumulative_subtitle": ("Mixed words - review {n} of {total}", "Смешанные слова - повторение {n} из {total}"),
    "cumulative_answer_subtitle": ("Cumulative review {n} answers", "Ответы к накопительному повторению {n}"),
    "mix_rooms": (
        "Mix the rooms: recall the word, write it, then check the answer key later.",
        "Смешайте комнаты: вспомните слово, напишите его, затем проверьте ответы позже.",
    ),
    "word_index": ("Word index", "Указатель слов"),
    "index_subtitle": ("Lookup - part {n} of {total}", "Поиск - часть {n} из {total}"),
    "qr_scan_note": (
        "Scan a QR code on any reference card for an external pronunciation check.",
        "Отсканируйте QR-код на любой карточке, чтобы проверить произношение.",
    ),
    "qr_scan_body": (
        "The QR codes link to a free, unofficial text-to-speech service. If a code does not load, use the speaker button on the website instead - it always works offline once the page is cached.",
        "QR-коды ведут на бесплатный неофициальный сервис синтеза речи. Если код не загружается, используйте кнопку звука на сайте - она всегда работает офлайн после кэширования страницы.",
    ),
    "workbook_guide": ("Workbook guide", "Руководство по рабочей тетради"),
    "workbook_guide_subtitle": ("{edition} - a practical companion for the website", "{edition} - практическое дополнение к сайту"),
    "use_as_cycle": ("Use the book as a cycle, not a one-time read", "Используйте книгу циклично, а не как разовое чтение"),
    "notes_intro": (
        "The website supplies audio and interactive quizzes; these pages make recall and handwriting visible.",
        "Сайт даёт аудио и интерактивные тесты; эти страницы делают видимыми запоминание и письмо от руки.",
    ),
    "step_reference_label": ("1. Reference", "1. Справочник"),
    "step_cover_recall_label": ("2. Cover and recall", "2. Закрыть и вспомнить"),
    "step_cover_recall_body": ("Hide the meaning column and say the meaning from memory.", "Закройте столбец со значением и назовите его по памяти."),
    "step_write_label": ("3. Write", "3. Написать"),
    "step_write_body": ("Trace the word once, then write it on all three lines without looking.", "Обведите слово один раз, затем напишите его на всех трёх строках, не глядя."),
    "step_test_label": ("4. Test", "4. Тест"),
    "step_test_body": (
        "Complete matching, sentence gaps, gender, and plural before opening the answer key.",
        "Выполните соответствие, пропуски в предложениях, род и число, прежде чем открыть ответы.",
    ),
    "step_revisit_label": ("5. Revisit", "5. Повторить"),
    "step_revisit_body": (
        "Use the cumulative review pages on day 1, day 3, after one week, and after one month.",
        "Используйте страницы накопительного повторения на 1-й день, 3-й день, через неделю и через месяц.",
    ),
    "keep_closed": ("Keep the answer key closed", "Не открывайте ответы заранее"),
    "wrong_answer_note": (
        "A wrong answer is useful when it shows what to review. Mark the word, return to its photo card, listen on the website, and try again later.",
        "Неправильный ответ полезен, если показывает, что нужно повторить. Отметьте слово, вернитесь к его карточке, послушайте на сайте и попробуйте снова позже.",
    ),
    "website_features": (
        "Website features: audio - progress tracking - quizzes - dark mode - Arabic, Russian, and English",
        "Возможности сайта: аудио - отслеживание прогресса - тесты - тёмная тема - арабский, русский и английский",
    ),
    "reference_page_subtitle": ("{count} photo cards - pronunciation + examples", "{count} карточек с фото - произношение и примеры"),
    "page_label": ("Page {n}", "Стр. {n}"),
    "pronunciation_subtitle": ("Sounds and letters that need extra attention", "Звуки и буквы, требующие особого внимания"),
    "level_tag": ("Lv {level} | Freq {freq}", "Ур {level} | Част {freq}"),
    "workbook_edition": ("Workbook - {edition}", "Рабочая тетрадь - {edition}"),
    "cover_word_count": (
        "{count} words - 6 sections - photo cards + writing + review pages",
        "{count} слов - 6 разделов - карточки с фото + письмо + повторение",
    ),
    "cover_offline_note": (
        "Use this book offline while the website handles audio, progress, and quizzes.",
        "Используйте эту книгу офлайн, пока сайт обеспечивает аудио, прогресс и тесты.",
    ),
    "what_is_inside": ("What is inside", "Что внутри"),
    "meaning_shown_in": ("Meaning shown in: {meaning}.", "Значение показано на: {meaning}."),
    "bullet_example": ("Example sentence to support reading and speaking.", "Пример предложения для чтения и разговорной практики."),
    "bullet_pages": (
        "Writing, recall, matching, and spaced-review pages.",
        "Страницы для письма, запоминания, сопоставления и интервального повторения.",
    ),
    "bullet_qr": ("QR code per word for a quick external pronunciation check.", "QR-код для каждого слова - быстрая проверка произношения."),
}


def t(profile: dict, key: str, **kwargs) -> str:
    en, ru = UI_TEXT[key]
    text = ru if is_arabic_target(profile) else en
    return text.format(**kwargs) if kwargs else text


def section_title_left(profile: dict, section: str) -> str:
    title_en, _title_ar, title_ru = SECTION_TITLES[section]
    return title_ru if is_arabic_target(profile) else title_en


def section_title_ar(section: str) -> str:
    return SECTION_TITLES[section][1]


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


def load_words(unit_id: str = "home") -> list[dict]:
    data_path = ROOT / "data" / "units" / f"{unit_id}.json"
    with data_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)["words"]


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


def gender_label(item: dict, profile: dict) -> str:
    lang = profile.get("target_lang", "ru")
    gender = item.get("grammar", {}).get(lang, {}).get("gender", "")
    if lang != "ru":
        # Arabic grammar values are already human-readable Arabic text
        # (e.g. "مذكر"/"مؤنث"), unlike the English enum keys Russian uses.
        return gender or "unknown"
    labels = {
        "masculine": "M mужской",
        "feminine": "F женский",
        "neuter": "N средний",
    }
    return labels.get(gender, "unknown")


def is_arabic_target(profile: dict) -> bool:
    return profile.get("target_lang") == "ar"


def primary_word(item: dict, profile: dict) -> str:
    return item["arabic"] if is_arabic_target(profile) else item["russian"]


def primary_pronunciation(item: dict, profile: dict) -> str:
    if is_arabic_target(profile):
        return item.get("arabicTransliterationRu", "")
    if profile.get("key") == "ar":
        return item.get("transliterationAr") or item.get("transliteration", "")
    return item.get("transliterationStressed") or item.get("transliteration", "")


def primary_example(item: dict, profile: dict) -> str:
    return item.get("exampleAr", "") if is_arabic_target(profile) else item.get("exampleRu", "")


def primary_example_pronunciation(item: dict, profile: dict) -> str:
    if is_arabic_target(profile):
        return item.get("exampleArTransliterationRu", "")
    if profile.get("key") == "ar":
        return item.get("exampleTransliterationAr", "")
    if profile.get("key") == "en":
        return item.get("exampleTransliterationEn", "")
    return ""


def primary_grammar(item: dict, profile: dict) -> dict:
    lang = profile.get("target_lang", "ru")
    return item.get("grammar", {}).get(lang, {})


def choose_items(items: list[dict], limit: int) -> list[dict]:
    if len(items) <= limit:
        return items
    positions = [round(index * (len(items) - 1) / (limit - 1)) for index in range(limit)]
    return [items[position] for position in positions]


def make_blank_sentence(item: dict, profile: dict) -> str:
    target_word = primary_word(item, profile)
    sentence = primary_example(item, profile)
    arabic_target = is_arabic_target(profile)
    char_class = r"[ء-ي]" if arabic_target else r"[\wёЁ]"
    parts = []
    for token in target_word.split():
        clean_token = re.sub(r"[^ء-ي]" if arabic_target else r"[^\wёЁ]", "", token)
        if not clean_token:
            continue
        # Arabic nouns commonly carry an attached prefix (ال، و، ب...) in a
        # sentence, so lean on a slightly shorter stem than the Russian
        # case-ending heuristic uses; either way this only trims the tail,
        # a substring search still finds the stem after a leading prefix.
        trim = 2 if arabic_target else 3
        stem_length = max(2, len(clean_token) - trim)
        parts.append(re.escape(clean_token[:stem_length]) + char_class + "*")
    pattern = r"\s+".join(parts) if parts else re.escape(target_word)
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
    # Crop-to-fill (like the website's CSS object-fit:cover), not pad-to-fit.
    # 27 of the 75 photos are portrait or square, not the card's landscape
    # ratio; padding them left visible white bars next to edge-to-edge
    # neighbors on the same page, which read as inconsistent formatting.
    image = Image.open(path).convert("RGB")
    fitted = ImageOps.fit(image, (int(max_width * 2), int(max_height * 2)), Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    return ImageReader(fitted)


_QR_CACHE: dict[str, ImageReader] = {}


def pronunciation_qr(word: str, tts_lang: str = "ru") -> ImageReader:
    """QR code linking to an external, unofficial Google Translate TTS URL.

    There is no real audio in this project (see docs/WORD_SCHEMA.md Audio
    policy) and no public URL for the app itself, so this points at a free
    external TTS endpoint instead. It is unofficial and can rate-limit or
    change without notice - treat it as a bonus, not a guarantee.
    """
    cache_key = f"{tts_lang}:{word}"
    if cache_key in _QR_CACHE:
        return _QR_CACHE[cache_key]
    query = urllib.parse.quote(word)
    url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={tts_lang}&client=tw-ob&q={query}"
    qr = qrcode.make(url, border=1, box_size=4)
    reader = ImageReader(qr.get_image())
    _QR_CACHE[cache_key] = reader
    return reader


def draw_header(pdf: canvas.Canvas, title_left: str, title_ar: str, subtitle: str, page_no: int, profile: dict) -> None:
    pdf.setFillColor(ACCENT)
    pdf.rect(0, PAGE_HEIGHT - 16, PAGE_WIDTH, 16, fill=1, stroke=0)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 20)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 44, title_left)
    pdf.setFont(FONT_BOLD, 15)
    pdf.drawRightString(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 44, shape_arabic(title_ar))
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 9.5)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 58, subtitle)
    pdf.drawRightString(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 58, t(profile, "page_label", n=page_no))
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
    arabic_target_cover = is_arabic_target(profile)
    edition_label_cover = profile.get("edition_ru", profile["edition_en"]) if arabic_target_cover else profile["edition_en"]
    pdf.drawString(MARGIN, PAGE_HEIGHT - 98, t(profile, "workbook_edition", edition=edition_label_cover))
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 10.5)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 118, t(profile, "cover_word_count", count=total_words))
    pdf.drawString(MARGIN, PAGE_HEIGHT - 136, t(profile, "cover_offline_note"))

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

    callout_x = PAGE_WIDTH - MARGIN - 240
    callout_y = 152

    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 13)
    pdf.drawString(MARGIN, 268, t(profile, "what_is_inside"))
    pdf.setFont(FONT_REGULAR, 11)
    labels_source = MEANING_LABELS_RU if arabic_target_cover else MEANING_LABELS
    joiner = ", " if arabic_target_cover else " and "
    meaning_note = joiner.join(labels_source[lang] for lang in profile["card_meanings"])
    word_intro = "Карточки с фото для каждого слова - сначала арабское слово." if arabic_target_cover else "Photo cards for every word in the app - Russian first, with stressed pronunciation."
    bullets = [
        word_intro,
        t(profile, "meaning_shown_in", meaning=meaning_note),
        t(profile, "bullet_example"),
        t(profile, "bullet_pages"),
        t(profile, "bullet_qr"),
    ]
    # Bullets share the row with the edition callout box on the right;
    # wrap well before callout_x so long lines never run under the box.
    bullet_width = callout_x - (MARGIN + 12) - 14
    bullet_y = 245
    for bullet in bullets:
        pdf.circle(MARGIN + 4, bullet_y + 3, 1.6, fill=1, stroke=0)
        used = draw_wrapped_text(pdf, bullet, MARGIN + 12, bullet_y, bullet_width, FONT_REGULAR, 11, 14, color=TEXT)
        bullet_y -= max(used, 14) + 5
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
    draw_header(pdf, t(profile, "contents_title"), "الفهرس", t(profile, "contents_subtitle"), page_no, profile)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 16)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 100, t(profile, "chapter_overview"))
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 10.5)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 118, t(profile, "contents_intro"))

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
    pdf.drawString(table_x + 10, table_y + 9, t(profile, "col_section"))
    pdf.drawString(table_x + col_w1 + 10, table_y + 9, t(profile, "col_reference"))
    pdf.drawString(table_x + col_w1 + col_w2 + 10, table_y + 9, t(profile, "col_writing"))
    pdf.drawString(table_x + col_w1 + col_w2 + col_w3 + 10, table_y + 9, t(profile, "col_test"))
    for index, section in enumerate(SECTION_ORDER, start=1):
        row_y = table_y - index * row_h
        pdf.setStrokeColor(CARD_BORDER)
        pdf.line(table_x, row_y, table_x + table_width, row_y)
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_BOLD, 9.5)
        pdf.drawString(table_x + 10, row_y + 9, f"{index}. {section_title_left(profile, section)}")
        pdf.setFont(FONT_REGULAR, 8.6)
        pdf.drawRightString(table_x + col_w1 - 10, row_y + 9, shape_arabic(section_title_ar(section)))
        pdf.setFont(FONT_BOLD, 9.5)
        pdf.drawString(table_x + col_w1 + 10, row_y + 9, str(plan["reference_pages"][section][0]))
        pdf.drawString(table_x + col_w1 + col_w2 + 10, row_y + 9, str(plan["writing_pages"][section][0]))
        pdf.drawString(table_x + col_w1 + col_w2 + col_w3 + 10, row_y + 9, str(plan["test_pages"][section]))

    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 13)
    pdf.drawString(MARGIN, 425, t(profile, "book_tools"))
    pdf.setFont(FONT_REGULAR, 10.2)
    tools = [
        t(profile, "tool_pronunciation", page=plan["pronunciation_page"]),
        t(profile, "tool_cumulative", start=plan["cumulative_pages"][0], end=plan["cumulative_pages"][-1]),
        t(profile, "tool_index", start=plan["index_pages"][0], end=plan["index_pages"][-1]),
        t(profile, "tool_answers"),
    ]
    tool_y = 403
    for tool in tools:
        pdf.circle(MARGIN + 4, tool_y + 3, 1.6, fill=1, stroke=0)
        pdf.drawString(MARGIN + 12, tool_y, tool)
        tool_y -= 17

    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 13)
    pdf.drawString(MARGIN, 313, t(profile, "how_to_use"))
    first_step = (
        "1. Взгляните на фото, произнесите арабское слово, затем проверьте столбец со значением."
        if is_arabic_target(profile)
        else "1. Look at the photo, say the Russian word, then check the stressed pronunciation line."
    )
    steps = [
        first_step,
        t(profile, "step2"),
        t(profile, "step3"),
        t(profile, "step4"),
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
    pdf.drawRightString(x + CARD_WIDTH - 12, tag_y, t(profile, "level_tag", level=item.get("level", ""), freq=item.get("frequency", "")))

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
    pdf.drawImage(pronunciation_qr(primary_word(item, profile), profile.get("target_lang", "ru")), qr_x, qr_y, QR_SIZE, QR_SIZE)

    text_x = x + CARD_TEXT_X
    cursor = image_top - CARD_IMAGE_HEIGHT - 14
    arabic_target = is_arabic_target(profile)
    word_align = "right" if arabic_target else "left"

    pdf.setFillColor(TEXT)
    used = draw_wrapped_text(pdf, primary_word(item, profile), text_x, cursor, CARD_TEXT_WIDTH, FONT_BOLD, 19, 21, color=TEXT, align=word_align)
    cursor -= max(used, 16)

    pronunciation = primary_pronunciation(item, profile)
    if pronunciation:
        pdf.setFillColor(ACCENT)
        pdf.setFont(FONT_REGULAR, 10.5)
        pdf.drawString(text_x, cursor, pronunciation)
        cursor -= 16

    meaning_font_size = 10.6 if len(profile["card_meanings"]) == 1 else 9.2
    meaning_leading = 13 if len(profile["card_meanings"]) == 1 else 11.2
    meaning_color = TEXT if len(profile["card_meanings"]) == 1 else MUTED
    meaning_values = {"ar": item.get("arabic"), "en": item.get("english"), "ru": item.get("russian")}
    for lang in profile["card_meanings"]:
        value = meaning_values[lang]
        align = "right" if lang == "ar" else "left"
        used = draw_wrapped_text(pdf, value, text_x, cursor, CARD_TEXT_WIDTH, FONT_BOLD, meaning_font_size, meaning_leading, color=meaning_color, align=align)
        cursor -= max(used, meaning_leading)

    cursor -= 6
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_BOLD, 9)
    pdf.drawString(text_x, cursor, "Пример на арабском" if arabic_target else "Russian example")
    cursor -= 12
    pdf.setFillColor(TEXT)
    used = draw_wrapped_text(pdf, primary_example(item, profile), text_x, cursor, CARD_TEXT_WIDTH, FONT_REGULAR, 8.7, 10.5, color=TEXT, align=word_align)
    cursor -= max(used, 10.5)
    example_pronunciation = primary_example_pronunciation(item, profile)
    if example_pronunciation:
        pdf.setFillColor(ACCENT)
        pronunciation_align = "right" if profile.get("key") == "ar" else "left"
        used = draw_wrapped_text(pdf, example_pronunciation, text_x, cursor, CARD_TEXT_WIDTH, FONT_REGULAR, 7.8, 9.2, color=ACCENT, align=pronunciation_align)
        cursor -= max(used, 9.2)
    example_values = {"ar": item.get("exampleAr"), "en": item.get("exampleEn"), "ru": item.get("exampleRu")}
    for lang in profile["example_langs"]:
        value = example_values[lang]
        align = "right" if lang == "ar" else "left"
        used = draw_wrapped_text(pdf, value, text_x, cursor, CARD_TEXT_WIDTH, FONT_REGULAR, 8.3, 9.8, color=MUTED, align=align)
        cursor -= max(used, 9.8)


def draw_section_pages_v2(pdf: canvas.Canvas, grouped: dict[str, list[dict]], plan: dict, profile: dict) -> None:
    for section in SECTION_ORDER:
        items = grouped.get(section, [])
        if not items:
            continue
        title_left = section_title_left(profile, section)
        title_ar = section_title_ar(section)
        for page_index, page_no in enumerate(plan["reference_pages"][section]):
            draw_header(pdf, title_left, title_ar, t(profile, "reference_page_subtitle", count=len(items)), page_no, profile)
            page_items = items[page_index * 4 : (page_index + 1) * 4]
            positions = [
                (MARGIN, PAGE_HEIGHT - 66 - HEADER_HEIGHT - CARD_HEIGHT),
                (MARGIN + CARD_WIDTH + GAP, PAGE_HEIGHT - 66 - HEADER_HEIGHT - CARD_HEIGHT),
                (MARGIN, MARGIN + FOOTER_HEIGHT + GAP),
                (MARGIN + CARD_WIDTH + GAP, MARGIN + FOOTER_HEIGHT + GAP),
            ]
            for item, (x, y) in zip(page_items, positions):
                draw_card_v3(pdf, item, x, y, title_left, profile)
            draw_footer(pdf, page_no, profile)
            pdf.showPage()

        writing_chunks = chunk_items(items, WORDS_PER_WRITING_PAGE)
        for part_index, (page_no, page_items) in enumerate(zip(plan["writing_pages"][section], writing_chunks), start=1):
            draw_writing_page(pdf, section, page_items, page_no, part_index, len(writing_chunks), profile, bonus=len(items) <= SHORT_SECTION_THRESHOLD)
            pdf.showPage()

        draw_section_test_page(pdf, section, items, plan["test_pages"][section], profile)
        pdf.showPage()


def draw_progress_page(pdf: canvas.Canvas, grouped: dict[str, list[dict]], page_no: int, profile: dict) -> None:
    draw_header(pdf, t(profile, "my_progress"), "متابعة تقدمي", t(profile, "progress_subtitle"), page_no, profile)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 16)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 100, t(profile, "start_promise"))
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 10.3)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 118, t(profile, "start_promise_body"))

    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 10.5)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 155, t(profile, "name_label"))
    draw_rule(pdf, MARGIN + 42, PAGE_HEIGHT - 153, 180)
    pdf.drawString(MARGIN + 250, PAGE_HEIGHT - 155, t(profile, "start_date_label"))
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
    pdf.drawString(table_x + 10, table_y + 18, t(profile, "col_section"))
    pdf.drawString(table_x + 210, table_y + 18, t(profile, "col_words"))
    pdf.drawString(table_x + 270, table_y + 18, t(profile, "col_reference"))
    pdf.drawString(table_x + 360, table_y + 18, t(profile, "col_writing"))
    pdf.drawString(table_x + 450, table_y + 18, t(profile, "col_test"))
    for index, section in enumerate(SECTION_ORDER, start=1):
        row_y = table_y - index * row_h
        pdf.setStrokeColor(CARD_BORDER)
        pdf.line(table_x, row_y, table_x + table_width, row_y)
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_BOLD, 9.3)
        pdf.drawString(table_x + 10, row_y + 28, section_title_left(profile, section))
        pdf.setFont(FONT_REGULAR, 8.7)
        pdf.drawRightString(table_x + 195, row_y + 14, shape_arabic(section_title_ar(section)))
        pdf.setFont(FONT_BOLD, 10)
        pdf.drawString(table_x + 210, row_y + 22, str(len(grouped.get(section, []))))
        done_label = t(profile, "checkbox_done")
        draw_checkbox(pdf, table_x + 270, row_y + 25, done_label)
        draw_checkbox(pdf, table_x + 360, row_y + 25, done_label)
        draw_checkbox(pdf, table_x + 450, row_y + 25, done_label)

    callout_y = 112
    pdf.setFillColor(SUCCESS_FILL)
    pdf.setStrokeColor(CARD_BORDER)
    pdf.roundRect(MARGIN, callout_y, PAGE_WIDTH - 2 * MARGIN, 82, 12, fill=1, stroke=1)
    pdf.setFillColor(ACCENT)
    pdf.setFont(FONT_BOLD, 12)
    pdf.drawString(MARGIN + 14, callout_y + 57, t(profile, "four_marks"))
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_REGULAR, 9.5)
    for index, text in enumerate([t(profile, "mark1"), t(profile, "mark2"), t(profile, "mark3"), t(profile, "mark4")]):
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
    title_left = section_title_left(profile, section)
    title_ar = section_title_ar(section)
    draw_header(pdf, t(profile, "writing_practice"), f"{title_ar} - الكتابة", t(profile, "writing_page_subtitle", section=title_left, part=part_index, total=total_parts), page_no, profile)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 13)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 91, t(profile, "trace_instruction"))
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
    arabic_target = is_arabic_target(profile)
    word_column_width = (meaning_x - 14) - word_x
    pdf.drawString(table_x + 8, table_top - 16, "#")
    pdf.drawString(word_x, table_top - 16, "Арабское слово" if arabic_target else "Russian word")
    pdf.drawString(meaning_x, table_top - 16, t(profile, "col_meaning_cover"))
    pdf.drawString(writing_x, table_top - 16, t(profile, "col_trace_write"))
    for column_x in (meaning_x - 14, writing_x - 14):
        pdf.setStrokeColor(CARD_BORDER)
        pdf.line(column_x, table_top - table_height, column_x, table_top)

    meaning_langs = profile["card_meanings"]
    meaning_values_all = {"ar": lambda i: i["arabic"], "en": lambda i: i["english"], "ru": lambda i: i["russian"]}
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
        draw_wrapped_text(pdf, primary_word(item, profile), word_x, row_top - 20, word_column_width, FONT_BOLD, 11.5, 15, color=TEXT, align="right" if arabic_target else "left")
        pronunciation = primary_pronunciation(item, profile)
        if pronunciation:
            pdf.setFillColor(ACCENT)
            pdf.setFont(FONT_REGULAR, 8.7)
            pdf.drawString(word_x, row_top - 35, pronunciation)
        meaning_cursor = row_top - 18
        for lang in meaning_langs:
            value = meaning_values_all[lang](item)
            align = "right" if lang == "ar" else "left"
            pdf.setFillColor(TEXT if lang == meaning_langs[0] else MUTED)
            used = draw_wrapped_text(pdf, value, meaning_x, meaning_cursor, 155, FONT_BOLD if lang == meaning_langs[0] else FONT_REGULAR, 9.3 if lang == meaning_langs[0] else 8.3, 11, color=TEXT if lang == meaning_langs[0] else MUTED, align=align)
            meaning_cursor -= max(used, 11)
        pdf.setFillColor(TRACE_TEXT)
        pdf.setFont(FONT_REGULAR, 9.5)
        trace_word = primary_word(item, profile)
        if arabic_target:
            pdf.drawRightString(writing_x + writing_width, row_top - 17, shape_arabic(f"{trace_word} :تتبّع"))
        else:
            pdf.drawString(writing_x, row_top - 17, f"Trace: {trace_word}")
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
        pdf.drawString(table_x + 14, bonus_top - 20, t(profile, "bonus_title"))
        pdf.setFillColor(MUTED)
        pdf.setFont(FONT_REGULAR, 8.8)
        pdf.drawRightString(table_x + table_width - 14, bonus_top - 20, shape_arabic("مكافأة: كوّن جملتك الخاصة"))
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_REGULAR, 9.2)
        bonus_body = "Составьте одно арабское предложение, используя два слова с этой страницы." if arabic_target else "Pick two words from this page and write one Russian sentence using both of them."
        pdf.drawString(table_x + 14, bonus_top - 38, bonus_body)
        for line_y in range(int(bonus_top) - 58, 75, -22):
            draw_rule(pdf, table_x + 14, line_y, table_width - 28)

    draw_footer(pdf, page_no, profile)


def matching_items(items: list[dict]) -> tuple[list[dict], list[dict]]:
    selected = choose_items(items, min(8, len(items)))
    if len(selected) < 2:
        return selected, selected
    rotation = 2 if len(selected) > 3 else 1
    return selected, selected[rotation:] + selected[:rotation]


def meaning_value(item: dict, lang: str) -> str:
    return {"ar": item["arabic"], "en": item["english"], "ru": item["russian"]}[lang]


def meaning_text(item: dict, profile: dict) -> str:
    parts = [meaning_value(item, lang) for lang in profile["card_meanings"]]
    return " / ".join(parts)


def draw_matching_exercise(pdf: canvas.Canvas, items: list[dict], y_top: float, profile: dict) -> float:
    arabic_target = is_arabic_target(profile)
    selected, meanings = matching_items(items)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 11.5)
    pdf.drawString(MARGIN, y_top, t(profile, "match_title"))
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
        draw_wrapped_text(pdf, f"{index + 1}. {primary_word(item, profile)}", left_x, row_y, 140, FONT_BOLD, 9.5, 11, color=TEXT, align="right" if arabic_target else "left")
        pronunciation = primary_pronunciation(item, profile)
        if pronunciation:
            pdf.setFillColor(ACCENT)
            pdf.setFont(FONT_REGULAR, 7.8)
            pdf.drawString(left_x + 3, row_y - 11, pronunciation)
        pdf.setStrokeColor(WRITING_LINE)
        pdf.setDash(2, 2)
        pdf.line(left_x + 150, row_y - 2, right_x - 16, row_y - 2)
        pdf.setDash()
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_BOLD, 9)
        pdf.drawString(right_x, row_y, f"{chr(65 + index)}.")
        primary_lang = profile["card_meanings"][0]
        primary_value = meaning_value(meanings[index], primary_lang)
        draw_wrapped_text(pdf, primary_value, right_x + 18, row_y, 212, FONT_BOLD, 8.7, 9.5, color=TEXT, align="right" if primary_lang == "ar" else "left")
        if len(profile["card_meanings"]) > 1:
            secondary_lang = profile["card_meanings"][1]
            secondary_value = meaning_value(meanings[index], secondary_lang)
            pdf.setFillColor(MUTED)
            pdf.setFont(FONT_REGULAR, 7.8)
            pdf.drawString(right_x + 18, row_y - 11, secondary_value)
    return y_top - len(selected) * row_h - 8


def example_value(item: dict, lang: str) -> str:
    return {"ar": item["exampleAr"], "en": item["exampleEn"], "ru": item["exampleRu"]}[lang]


def draw_fill_exercise(pdf: canvas.Canvas, items: list[dict], y_top: float, profile: dict) -> tuple[float, list[dict]]:
    arabic_target = is_arabic_target(profile)
    selected = choose_items(items, min(3, len(items)))
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 11.5)
    pdf.drawString(MARGIN, y_top, t(profile, "fill_title"))
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 8.7)
    subtitle = "اكتب الكلمة العربية الناقصة" if arabic_target else "اكتب الكلمة الروسية الناقصة"
    pdf.drawRightString(PAGE_WIDTH - MARGIN, y_top, shape_arabic(subtitle))
    y_top -= 19
    row_height = 39 if profile["example_langs"] else 26
    for index, item in enumerate(selected, start=1):
        sentence_y = y_top - (index - 1) * row_height
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_REGULAR, 9.2)
        blanked = make_blank_sentence(item, profile)
        if arabic_target:
            draw_wrapped_text(pdf, f"{blanked}  .{index}", MARGIN + 10, sentence_y, PAGE_WIDTH - 2 * MARGIN - 20, FONT_REGULAR, 9.2, 11, color=TEXT, align="right")
        else:
            pdf.drawString(MARGIN + 10, sentence_y, f"{index}. {blanked}")
        hint_y = sentence_y - 13
        for lang in profile["example_langs"]:
            value = example_value(item, lang)
            pdf.setFillColor(MUTED)
            used = draw_wrapped_text(pdf, value, MARGIN + 10, hint_y, PAGE_WIDTH - 2 * MARGIN - 20, FONT_REGULAR, 8.2, 9.5, color=MUTED, align="right" if lang == "ar" else "left")
            hint_y -= max(used, 9.5)
    return y_top - len(selected) * row_height - 9, selected


def draw_grammar_exercise(pdf: canvas.Canvas, items: list[dict], y_top: float, profile: dict) -> None:
    arabic_target = is_arabic_target(profile)
    selected = choose_items(items, min(3, len(items)))
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 11.5)
    pdf.drawString(MARGIN, y_top, t(profile, "grammar_title"))
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 8.7)
    pdf.drawRightString(PAGE_WIDTH - MARGIN, y_top, shape_arabic("حدّد الجنس واكتب الجمع"))
    y_top -= 21
    columns = [(MARGIN + 10, t(profile, "col_word")), (MARGIN + 190, t(profile, "col_gender")), (MARGIN + 310, t(profile, "col_plural"))]
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_BOLD, 8.4)
    for x, label in columns:
        pdf.drawString(x, y_top, label)
    for index, item in enumerate(selected, start=1):
        row_y = y_top - index * 29
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_REGULAR, 9.2)
        draw_wrapped_text(pdf, f"{index}. {primary_word(item, profile)}", MARGIN + 10, row_y, 170, FONT_REGULAR, 9.2, 11, color=TEXT, align="right" if arabic_target else "left")
        pdf.setFont(FONT_REGULAR, 8.8)
        pdf.drawString(MARGIN + 190, row_y, "М   Ж" if arabic_target else "M   F   N")
        draw_rule(pdf, MARGIN + 310, row_y - 1, 190)


def draw_section_test_page(pdf: canvas.Canvas, section: str, items: list[dict], page_no: int, profile: dict) -> None:
    title_left = section_title_left(profile, section)
    title_ar = section_title_ar(section)
    draw_header(pdf, t(profile, "section_test"), f"اختبار - {title_ar}", t(profile, "section_test_subtitle", section=title_left), page_no, profile)
    pdf.setFillColor(EXERCISE_FILL)
    pdf.setStrokeColor(CARD_BORDER)
    pdf.roundRect(MARGIN, PAGE_HEIGHT - 112, PAGE_WIDTH - 2 * MARGIN, 28, 8, fill=1, stroke=1)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_REGULAR, 9.2)
    pdf.drawString(MARGIN + 12, PAGE_HEIGHT - 101, t(profile, "score_line"))
    y = PAGE_HEIGHT - 137
    y = draw_matching_exercise(pdf, items, y, profile)
    fill_y, fill_items = draw_fill_exercise(pdf, items, y, profile)
    draw_grammar_exercise(pdf, items, fill_y, profile)
    draw_footer(pdf, page_no, profile)


def draw_solution_page(pdf: canvas.Canvas, title_en: str, title_ar: str, items: list[dict], page_no: int, subtitle: str, profile: dict) -> None:
    arabic_target = is_arabic_target(profile)
    draw_header(pdf, t(profile, "answer_key"), f"الإجابات - {title_ar}", subtitle, page_no, profile)
    selected, meanings = matching_items(items)
    right_index = {item["id"]: chr(65 + index) for index, item in enumerate(meanings)}

    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 11.5)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 95, t(profile, "matching_label"))
    y = PAGE_HEIGHT - 116
    for index, item in enumerate(selected, start=1):
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_REGULAR, 9.2)
        # Every piece that might contain Arabic is shaped on its own via
        # shape_arabic()/draw_wrapped_text BEFORE it is drawn, and Latin
        # structural bits (index, arrow, letter) are drawn as separate,
        # unshaped calls positioned by measuring the already-shaped text's
        # width - never concatenate raw Arabic into an f-string and draw it
        # as one unshaped block; that was the old bug (disconnected glyphs,
        # wrong visual order next to Latin text).
        prefix = f"{index}. "
        pdf.drawString(MARGIN + 12, y, prefix)
        cursor_x = MARGIN + 12 + pdfmetrics.stringWidth(prefix, FONT_REGULAR, 9.2)
        word = primary_word(item, profile)
        if arabic_target:
            word_display = shape_arabic(word)
        else:
            pronunciation = primary_pronunciation(item, profile)
            word_display = f"{word}  ({pronunciation})" if pronunciation else word
        pdf.drawString(cursor_x, y, word_display)
        cursor_x += pdfmetrics.stringWidth(word_display, FONT_REGULAR, 9.2)
        pdf.drawString(cursor_x, y, f"  ->  {right_index[item['id']]}")
        meaning_x = MARGIN + 320
        draw_wrapped_text(pdf, meaning_text(item, profile), meaning_x, y, PAGE_WIDTH - MARGIN - meaning_x, FONT_REGULAR, 9.2, 11, color=MUTED)
        y -= 20

    fill_items = choose_items(items, min(3, len(items)))
    y -= 8
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 11.5)
    pdf.drawString(MARGIN, y, t(profile, "sentence_answers"))
    y -= 20
    for item in fill_items:
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_REGULAR, 9.2)
        draw_wrapped_text(pdf, primary_word(item, profile), MARGIN + 12, y, 75, FONT_REGULAR, 9.2, 11, color=TEXT, align="right" if arabic_target else "left")
        pdf.setFont(FONT_REGULAR, 8.8)
        draw_wrapped_text(pdf, primary_example(item, profile), MARGIN + 12 + 90, y, PAGE_WIDTH - MARGIN - (MARGIN + 12 + 90), FONT_REGULAR, 8.8, 10.5, color=TEXT, align="right" if arabic_target else "left")
        y -= 19

    y -= 8
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 11.5)
    pdf.drawString(MARGIN, y, t(profile, "gender_plural_label"))
    y -= 20
    for item in choose_items(items, min(3, len(items))):
        plural = primary_grammar(item, profile).get("plural", "")
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_REGULAR, 9.2)
        word = primary_word(item, profile)
        gender = gender_label(item, profile)
        if arabic_target:
            draw_wrapped_text(pdf, f"{word}  -  {gender}  -  {plural}", MARGIN + 12, y, PAGE_WIDTH - 2 * MARGIN - 24, FONT_REGULAR, 9.2, 11, color=TEXT, align="right")
        else:
            pdf.drawString(MARGIN + 12, y, f"{word}  -  {gender}  -  {plural}")
        y -= 19
    draw_footer(pdf, page_no, profile)


def draw_cumulative_review_pages(pdf: canvas.Canvas, words: list[dict], plan: dict, profile: dict) -> list[list[dict]]:
    chunks = chunk_items(words, CUMULATIVE_REVIEW_SIZE)
    for index, (page_no, items) in enumerate(zip(plan["cumulative_pages"], chunks), start=1):
        draw_header(pdf, t(profile, "cumulative_review"), "مراجعة تراكمية", t(profile, "cumulative_subtitle", n=index, total=len(chunks)), page_no, profile)
        pdf.setFillColor(EXERCISE_FILL)
        pdf.setStrokeColor(CARD_BORDER)
        pdf.roundRect(MARGIN, PAGE_HEIGHT - 112, PAGE_WIDTH - 2 * MARGIN, 28, 8, fill=1, stroke=1)
        pdf.setFillColor(TEXT)
        pdf.setFont(FONT_REGULAR, 9.2)
        pdf.drawString(MARGIN + 12, PAGE_HEIGHT - 101, t(profile, "mix_rooms"))
        y = PAGE_HEIGHT - 137
        y = draw_matching_exercise(pdf, items, y, profile)
        fill_y, _ = draw_fill_exercise(pdf, items, y, profile)
        draw_grammar_exercise(pdf, items, fill_y, profile)
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
    column_labels_en = {"ru": "Russian -> page", "ar": "Arabic -> page", "en": "English -> page"}
    column_labels_ru = {"ru": "Русский -> страница", "ar": "Арабский -> страница", "en": "Английский -> страница"}
    column_labels = column_labels_ru if is_arabic_target(profile) else column_labels_en
    entries_by_lang = {lang: sorted(words, key=sort_key[lang]) for lang in index_langs}

    for page_index, page_no in enumerate(plan["index_pages"]):
        start = page_index * INDEX_ENTRIES_PER_PAGE
        end = start + INDEX_ENTRIES_PER_PAGE
        draw_header(pdf, t(profile, "word_index"), "الفهرس", t(profile, "index_subtitle", n=page_index + 1, total=len(plan["index_pages"])), page_no, profile)
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

# For the "ru" profile (Arabic for Russian speakers): the native/explaining
# language is Russian, not English, so this is a separate content set about
# ARABIC sounds that are hard for a Russian speaker specifically - emphatic
# consonants, pharyngeal ع/ح, uvular ق/غ, and sun/moon letter assimilation -
# not a translation of PRONUNCIATION_POINTS (which is about Russian sounds).
ARABIC_PRONUNCIATION_POINTS = [
    (
        "Глубокий гортанный звук ع",
        "حرف العين (ع) صوت حلقي عميق",
        "ع (айн) - звонкий гортанный звук, которого нет в русском. Он образуется сжатием глотки, а не горла - глубже и напряжённее, чем при русском 'а'.",
        "لا يوجد له مقابل في الروسية. يُنطق بضغط عميق في الحلق، ويجب تمييزه عن الهمزة (ء) التي هي مجرد وقفة صوتية خفيفة.",
    ),
    (
        "ح - не путать с х",
        "حرف الحاء (ح) مختلف عن الخاء (خ)",
        "خ ближе к русскому 'х' (как в 'хлеб'). ح - более глубокий гортанный выдох без трения, почти беззвучный шёпот из глубины горла.",
        "الحاء صوت حلقي مهموس عميق، بينما الخاء صوت احتكاكي من الحلق أقرب لصوت 'х' الروسي.",
    ),
    (
        "Эмфатические согласные ص ض ط ظ",
        "الحروف المفخّمة ص ض ط ظ",
        "Эти буквы произносятся с оттягиванием языка назад и утяжелением звука - в отличие от их лёгких пар س د ت ذ. Точного аналога нет ни в русском, ни в английском.",
        "تُنطق بتفخيم ورفع مؤخرة اللسان، بعكس نظيراتها المرقّقة س د ت ذ. الفرق في النطق يغيّر معنى الكلمة أحيانًا.",
    ),
    (
        "ق - не путать с к",
        "حرف القاف (ق) صوت لهوي عميق",
        "ق произносится глубоко в горле, у язычка (увулы), а не у нёба, как русское 'к'. قلب (сердце) и كلب (собака) различаются только этим звуком.",
        "يُنطق من أقصى الحلق قرب اللهاة، وهو أعمق من نطق الكاف الروسية. كلمتا قلب وكلب تفترقان بهذا الصوت فقط.",
    ),
    (
        "غ - не русское 'г'",
        "حرف الغين (غ) صوت مجهور من اللهاة",
        "غ - звонкий увулярный звук, похожий на грассированное французское 'r', а не на русское 'г'. Встречается в غرفة (комната).",
        "أقرب لصوت الراء الفرنسية المجهورة، وليس لصوت الغين كما قد يتخيله متعلم روسي.",
    ),
    (
        "Солнечные буквы: ال иногда «исчезает»",
        "الحروف الشمسية والقمرية",
        "Перед 'солнечными' буквами (ت ث د ذ ر ز س ش ص ض ط ظ ل ن) буква л в артикле ال не произносится - вместо неё удваивается следующая согласная: الشمس звучит 'аш-шамс', не 'аль-шамс'.",
        "أمام الحروف الشمسية تُدغم لام «ال» ولا تُنطق، ويُشدَّد الحرف بعدها: الشمس تُنطق «الشّمس» بتشديد الشين لا بنطق اللام.",
    ),
]


def draw_pronunciation_page(pdf: canvas.Canvas, page_no: int, profile: dict) -> None:
    arabic_target = is_arabic_target(profile)
    if arabic_target:
        header_title, header_subtitle = "Произношение арабского", "النطق العربي"
        intro = "Прочитайте один раз перед началом, а потом возвращайтесь, когда слово трудно произнести."
        points = ARABIC_PRONUNCIATION_POINTS
    else:
        header_title, header_subtitle = "Russian pronunciation", "النطق الروسي"
        intro = "Read this once before you start, then come back whenever a word feels hard to say."
        points = PRONUNCIATION_POINTS
    draw_header(pdf, header_title, header_subtitle, t(profile, "pronunciation_subtitle"), page_no, profile)
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 10)
    # Reader-facing prose follows the reader's native reading direction, not
    # the target word's script - the "ru" profile's reader is Russian-native
    # (LTR), even though the vocabulary being taught is Arabic.
    draw_wrapped_text(pdf, intro, MARGIN, PAGE_HEIGHT - 88, PAGE_WIDTH - 2 * MARGIN, FONT_REGULAR, 10, 13, color=MUTED, align="left")

    y = PAGE_HEIGHT - 116
    for title_left, title_ar, body_left, body_ar in points:
        pdf.setFillColor(colors.white)
        pdf.setStrokeColor(CARD_BORDER)
        block_height = 74
        pdf.roundRect(MARGIN, y - block_height, PAGE_WIDTH - 2 * MARGIN, block_height, 10, fill=1, stroke=1)
        pdf.setFillColor(ACCENT)
        pdf.setFont(FONT_BOLD, 11.5)
        pdf.drawString(MARGIN + 14, y - 20, title_left)
        pdf.setFont(FONT_BOLD, 10.5)
        pdf.drawRightString(PAGE_WIDTH - MARGIN - 14, y - 20, shape_arabic(title_ar))
        pdf.setFillColor(TEXT)
        draw_wrapped_text(pdf, body_left, MARGIN + 14, y - 37, (PAGE_WIDTH - 2 * MARGIN - 28) / 2 - 8, FONT_REGULAR, 8.8, 11, color=TEXT)
        draw_wrapped_text(pdf, body_ar, MARGIN + (PAGE_WIDTH - 2 * MARGIN) / 2 + 8, y - 37, (PAGE_WIDTH - 2 * MARGIN - 28) / 2, FONT_REGULAR, 8.6, 11, color=TEXT, align="right")
        y -= block_height + 10

    pdf.setFillColor(EXERCISE_FILL)
    pdf.setStrokeColor(CARD_BORDER)
    pdf.roundRect(MARGIN, 55, PAGE_WIDTH - 2 * MARGIN, 68, 10, fill=1, stroke=1)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 10.5)
    pdf.drawString(MARGIN + 14, 100, t(profile, "qr_scan_note"))
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 8.6)
    draw_wrapped_text(
        pdf,
        t(profile, "qr_scan_body"),
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
    arabic_target = is_arabic_target(profile)
    edition_label = profile.get("edition_ru", profile["edition_en"]) if arabic_target else profile["edition_en"]
    draw_header(pdf, t(profile, "workbook_guide"), "دليل استخدام الكتاب", t(profile, "workbook_guide_subtitle", edition=edition_label), page_no, profile)
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, 15)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 100, t(profile, "use_as_cycle"))
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_REGULAR, 10.2)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 120, t(profile, "notes_intro"))

    reference_step = (
        "Изучите картинку, сначала арабское слово, затем значение."
        if arabic_target
        else "Study the image, Russian word first, its stressed pronunciation, then the meaning."
    )
    steps = [
        (t(profile, "step_reference_label"), reference_step),
        (t(profile, "step_cover_recall_label"), t(profile, "step_cover_recall_body")),
        (t(profile, "step_write_label"), t(profile, "step_write_body")),
        (t(profile, "step_test_label"), t(profile, "step_test_body")),
        (t(profile, "step_revisit_label"), t(profile, "step_revisit_body")),
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
    pdf.drawString(MARGIN + 14, callout_y + 92, t(profile, "keep_closed"))
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_REGULAR, 10)
    draw_wrapped_text(
        pdf,
        t(profile, "wrong_answer_note"),
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
    pdf.drawString(MARGIN + 14, callout_y + 18, t(profile, "website_features"))
    draw_footer(pdf, page_no, profile)


def build_pdf(output_path: Path, profile: dict, unit_id: str = "home") -> None:
    register_fonts()
    words = load_words(unit_id)
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
            section_title_left(profile, section),
            section_title_ar(section),
            grouped.get(section, []),
            plan["solution_section_pages"][section],
            t(profile, "answer_key_section_subtitle"),
            profile,
        )
        pdf.showPage()
    for index, (page_no, items) in enumerate(zip(plan["solution_cumulative_pages"], cumulative_chunks), start=1):
        draw_solution_page(pdf, t(profile, "cumulative_review"), "مراجعة تراكمية", items, page_no, t(profile, "cumulative_answer_subtitle", n=index), profile)
        pdf.showPage()

    draw_notes_v2(pdf, plan["notes_page"], profile)
    pdf.showPage()

    pdf.save()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--language", choices=["full", "ar", "en", "ru", "all"], default="full", help="Which audience edition(s) to build. 'full' is the comprehensive teacher/review reference (default). 'all' builds the three audience editions (ar, en, ru), not 'full'.")
    parser.add_argument("--output", default=None, help="Only valid for a single edition (full/ar/en/ru); ignored with --language all.")
    parser.add_argument("--unit", default="home", help="Unit id under data/units/ to build the workbook from (default: home).")
    args = parser.parse_args()

    if args.language == "all":
        for key in ("ar", "en", "ru"):
            profile = LANGUAGE_PROFILES[key]
            build_pdf(OUTPUT_DIR / profile["output_name"], profile, unit_id=args.unit)
            print(f"Built {profile['output_name']}")
        return

    profile = LANGUAGE_PROFILES[args.language]
    output_path = Path(args.output) if args.output else OUTPUT_DIR / profile["output_name"]
    build_pdf(output_path, profile, unit_id=args.unit)
    print(f"Built {output_path}")


if __name__ == "__main__":
    main()
