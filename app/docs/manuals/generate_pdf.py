#!/usr/bin/env python3
"""Markdown → PDF (日本語フォント埋め込み) 変換スクリプト"""

import re
from fpdf import FPDF

FONT_DIR = "/mnt/e/ESS3.1/app/docs/manuals/"
FONT_REGULAR = FONT_DIR + "NotoSansCJKjp-Regular.otf"
FONT_BOLD = FONT_DIR + "NotoSansCJKjp-Bold.otf"


class JaPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.add_font("noto", "", FONT_REGULAR, uni=True)
        self.add_font("noto", "B", FONT_BOLD, uni=True)
        self.set_auto_page_break(auto=True, margin=20)
        self.set_margins(18, 18, 18)

    def header(self):
        pass

    def footer(self):
        self.set_y(-15)
        self.set_font("noto", "", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"- {self.page_no()} -", align="C")


def parse_md_to_pdf(md_path, pdf_path):
    pdf = JaPDF()
    pdf.add_page()

    with open(md_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    in_table = False
    table_rows = []
    in_blockquote = False
    bq_lines = []
    in_ol = False
    ol_counter = 0

    def flush_table():
        nonlocal in_table, table_rows
        if not table_rows:
            return
        # Filter out separator rows
        data_rows = [r for r in table_rows if not all(set(c.strip()) <= set("-:|") for c in r)]
        if not data_rows:
            in_table = False
            table_rows = []
            return

        num_cols = len(data_rows[0])
        col_w = (pdf.w - pdf.l_margin - pdf.r_margin) / num_cols

        for i, row in enumerate(data_rows):
            if i == 0:
                pdf.set_font("noto", "B", 9)
                pdf.set_fill_color(240, 240, 240)
            else:
                pdf.set_font("noto", "", 9)
                pdf.set_fill_color(255, 255, 255)

            row_h = 7
            for j, cell in enumerate(row):
                cell = cell.strip()
                w = col_w
                pdf.cell(w, row_h, cell, border=1, fill=(i == 0), align="C" if j > 0 and len(cell) <= 3 else "L")
            pdf.ln()

        pdf.ln(2)
        in_table = False
        table_rows = []

    def flush_blockquote():
        nonlocal in_blockquote, bq_lines
        if not bq_lines:
            return
        text = " ".join(bq_lines)
        x = pdf.get_x()
        y = pdf.get_y()
        # Blue left bar
        pdf.set_fill_color(37, 99, 235)
        pdf.rect(pdf.l_margin, y, 3, 10, "F")
        pdf.set_fill_color(239, 246, 255)
        w = pdf.w - pdf.l_margin - pdf.r_margin
        pdf.set_x(pdf.l_margin + 6)
        pdf.set_font("noto", "", 9)
        pdf.set_text_color(30, 64, 175)
        pdf.multi_cell(w - 6, 5, text)
        pdf.set_text_color(0, 0, 0)
        pdf.ln(3)
        in_blockquote = False
        bq_lines = []

    i = 0
    while i < len(lines):
        line = lines[i].rstrip("\n")
        stripped = line.strip()

        # Skip --- (horizontal rule)
        if stripped == "---":
            flush_table()
            flush_blockquote()
            pdf.ln(3)
            y = pdf.get_y()
            pdf.set_draw_color(200, 200, 200)
            pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
            pdf.ln(3)
            i += 1
            continue

        # Empty line
        if not stripped:
            flush_table()
            flush_blockquote()
            pdf.ln(2)
            i += 1
            in_ol = False
            ol_counter = 0
            continue

        # Table
        if "|" in stripped and stripped.startswith("|"):
            if not in_table:
                flush_blockquote()
                in_table = True
                table_rows = []
            cells = [c.strip() for c in stripped.split("|")[1:-1]]
            table_rows.append(cells)
            i += 1
            continue
        else:
            flush_table()

        # Blockquote
        if stripped.startswith("> "):
            if not in_blockquote:
                in_blockquote = True
                bq_lines = []
            bq_lines.append(stripped[2:].strip())
            i += 1
            continue
        else:
            flush_blockquote()

        # Headers
        if stripped.startswith("# ") and not stripped.startswith("## "):
            text = stripped[2:].strip()
            pdf.set_font("noto", "B", 18)
            pdf.set_text_color(0, 0, 0)
            pdf.cell(0, 12, text, ln=True)
            y = pdf.get_y()
            pdf.set_draw_color(37, 99, 235)
            pdf.set_line_width(0.8)
            pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
            pdf.set_line_width(0.2)
            pdf.ln(4)
            i += 1
            continue

        if stripped.startswith("## "):
            text = stripped[3:].strip()
            pdf.set_font("noto", "B", 14)
            pdf.set_text_color(30, 64, 175)
            pdf.ln(4)
            pdf.cell(0, 10, text, ln=True)
            y = pdf.get_y()
            pdf.set_draw_color(220, 220, 220)
            pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(2)
            i += 1
            continue

        if stripped.startswith("### "):
            text = stripped[4:].strip()
            pdf.set_font("noto", "B", 11)
            pdf.set_text_color(55, 65, 81)
            pdf.ln(2)
            pdf.cell(0, 8, text, ln=True)
            pdf.set_text_color(0, 0, 0)
            i += 1
            continue

        # Ordered list
        ol_match = re.match(r"^(\d+)\.\s+(.*)", stripped)
        if ol_match:
            num = ol_match.group(1)
            text = clean_inline(ol_match.group(2))
            pdf.set_font("noto", "", 10)
            pdf.set_x(pdf.l_margin + 4)
            w = pdf.w - pdf.l_margin - pdf.r_margin - 8
            pdf.multi_cell(w, 5.5, f"{num}. {text}")
            i += 1
            continue

        # Unordered list
        if stripped.startswith("- "):
            text = clean_inline(stripped[2:].strip())
            pdf.set_font("noto", "", 10)
            pdf.set_x(pdf.l_margin + 4)
            w = pdf.w - pdf.l_margin - pdf.r_margin - 8
            pdf.multi_cell(w, 5.5, f"・{text}")
            i += 1
            continue

        # Normal paragraph
        text = clean_inline(stripped)
        pdf.set_font("noto", "", 10)
        pdf.set_text_color(0, 0, 0)
        w = pdf.w - pdf.l_margin - pdf.r_margin
        pdf.multi_cell(w, 5.5, text)
        i += 1

    flush_table()
    flush_blockquote()
    pdf.output(pdf_path)
    print(f"Generated: {pdf_path}")


def clean_inline(text):
    """Remove markdown inline formatting"""
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    text = re.sub(r"`(.+?)`", r"\1", text)
    text = re.sub(r"\[(.+?)\]\(.+?\)", r"\1", text)
    return text


if __name__ == "__main__":
    base = "/mnt/e/ESS3.1/app/docs/manuals/"
    files = [
        ("guide_leader.md", "CircleFee_利用ガイド_部長向け.pdf"),
        ("guide_moderator.md", "CircleFee_利用ガイド_権限者向け.pdf"),
        ("guide_member.md", "CircleFee_利用ガイド_一般会員向け.pdf"),
    ]
    for md_file, pdf_file in files:
        parse_md_to_pdf(base + md_file, base + pdf_file)
