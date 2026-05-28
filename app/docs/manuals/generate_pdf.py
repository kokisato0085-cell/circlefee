import markdown
from weasyprint import HTML

CSS = """
@page {
  size: A4;
  margin: 20mm 18mm;
}
body {
  font-family: "Noto Sans CJK JP", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif;
  font-size: 11pt;
  line-height: 1.7;
  color: #1a1a1a;
}
h1 {
  font-size: 20pt;
  border-bottom: 3px solid #2563eb;
  padding-bottom: 8px;
  margin-top: 0;
}
h2 {
  font-size: 15pt;
  color: #1e40af;
  border-bottom: 1px solid #ddd;
  padding-bottom: 4px;
  margin-top: 28px;
}
h3 {
  font-size: 12pt;
  color: #374151;
  margin-top: 18px;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin: 12px 0;
  font-size: 10pt;
}
th, td {
  border: 1px solid #d1d5db;
  padding: 6px 10px;
  text-align: left;
}
th {
  background: #f3f4f6;
  font-weight: bold;
}
blockquote {
  border-left: 4px solid #2563eb;
  margin: 12px 0;
  padding: 8px 16px;
  background: #eff6ff;
  font-size: 10pt;
}
code {
  background: #f3f4f6;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10pt;
}
hr {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 20px 0;
}
ol, ul {
  padding-left: 24px;
}
li {
  margin-bottom: 4px;
}
"""

files = [
    ("guide_leader.md", "CircleFee_利用ガイド_部長向け.pdf"),
    ("guide_moderator.md", "CircleFee_利用ガイド_権限者向け.pdf"),
    ("guide_member.md", "CircleFee_利用ガイド_一般会員向け.pdf"),
]

for md_file, pdf_file in files:
    with open(md_file, "r", encoding="utf-8") as f:
        md_text = f.read()

    html_body = markdown.markdown(md_text, extensions=["tables"])
    full_html = f"""<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><style>{CSS}</style></head>
<body>{html_body}</body>
</html>"""

    HTML(string=full_html).write_pdf(pdf_file)
    print(f"Generated: {pdf_file}")
