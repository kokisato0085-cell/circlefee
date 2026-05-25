#!/usr/bin/env python3
"""サークル費用管理アプリ 方針ファイル PDF生成スクリプト"""

import os

from fpdf import FPDF

FONT_PATH = "/mnt/c/Windows/Fonts/NotoSansJP-VF.ttf"
OUTPUT = os.path.join(os.path.dirname(__file__), "circle_fee_app_policy.pdf")


class PolicyPDF(FPDF):
    def header(self):
        self.set_font("NotoSansJP", size=8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 5, "サークル費用管理アプリ 方針ファイル", align="R", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def footer(self):
        self.set_y(-15)
        self.set_font("NotoSansJP", size=8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"- {self.page_no()} -", align="C")

    def section_title(self, text):
        self.set_font("NotoSansJP", size=14)
        self.set_text_color(0, 0, 0)
        self.cell(0, 10, text, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(60, 60, 60)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def sub_title(self, text):
        self.set_font("NotoSansJP", size=11)
        self.set_text_color(40, 40, 40)
        self.cell(0, 8, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def body_text(self, text):
        self.set_font("NotoSansJP", size=9)
        self.set_text_color(0, 0, 0)
        self.multi_cell(0, 6, text)
        self.ln(2)

    def bullet(self, text):
        self.set_font("NotoSansJP", size=9)
        self.set_text_color(0, 0, 0)
        x = self.get_x()
        self.cell(6, 6, "・")
        self.multi_cell(0, 6, text)
        self.ln(1)

    def numbered(self, num, text):
        self.set_font("NotoSansJP", size=9)
        self.set_text_color(0, 0, 0)
        self.cell(8, 6, f"{num}.")
        self.multi_cell(0, 6, text)
        self.ln(1)

    def table(self, headers, rows, col_widths=None):
        if col_widths is None:
            available = self.w - self.l_margin - self.r_margin
            col_widths = [available / len(headers)] * len(headers)

        # Header
        self.set_font("NotoSansJP", size=8)
        self.set_fill_color(60, 60, 60)
        self.set_text_color(255, 255, 255)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 7, h, border=1, fill=True, align="C")
        self.ln()

        # Rows
        self.set_text_color(0, 0, 0)
        self.set_font("NotoSansJP", size=8)
        for row_idx, row in enumerate(rows):
            if row_idx % 2 == 0:
                self.set_fill_color(245, 245, 245)
            else:
                self.set_fill_color(255, 255, 255)

            max_lines = 1
            cell_texts = []
            for i, cell in enumerate(row):
                lines = self.multi_cell(col_widths[i], 6, cell, dry_run=True, output="LINES")
                cell_texts.append(lines)
                max_lines = max(max_lines, len(lines))

            row_h = max_lines * 6
            y_start = self.get_y()
            x_start = self.get_x()

            if y_start + row_h > self.h - self.b_margin:
                self.add_page()
                y_start = self.get_y()

            for i, lines in enumerate(cell_texts):
                x = x_start + sum(col_widths[:i])
                self.set_xy(x, y_start)
                self.cell(col_widths[i], row_h, "", border=1, fill=True)
                for li, line in enumerate(lines):
                    self.set_xy(x + 1, y_start + li * 6)
                    self.cell(col_widths[i] - 2, 6, line)

            self.set_xy(x_start, y_start + row_h)

        self.ln(4)


def build_pdf():
    pdf = PolicyPDF()
    pdf.add_font("NotoSansJP", "", FONT_PATH)
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Title
    pdf.set_font("NotoSansJP", size=20)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 15, "サークル費用管理アプリ", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("NotoSansJP", size=14)
    pdf.cell(0, 10, "方針ファイル", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    pdf.set_font("NotoSansJP", size=10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 8, "確定日: 2026-05-19", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)

    # --- 大方針一覧 ---
    pdf.section_title("大方針一覧")
    pdf.table(
        ["#", "大方針", "概要"],
        [
            ["A", "3階層ロール制", "部長(1人・委譲制) > 権限者(複数) > 一般員。発足人=初代部長"],
            ["B", "マルチユーザー同時アクセス", "複数人が同一サーバーで同時操作"],
            ["C", "催促通知（簡易SNS）", "支払い遅れの員にスマホPush通知で催促。Web Push主、メール補助"],
            ["D", "イベント（集金項目）管理", "権限者以上がイベント作成・掲示"],
            ["E", "支払いステータス管理", "申告→承認→済。月単位リセット"],
            ["F", "サブステータス（権限者専用）", "権限者のみ閲覧・付与の補足ステータス"],
            ["G", "未払い者への支払額調整", "2ヶ月未払いに対し権限者が増減"],
            ["H", "会計ダッシュボード", "権限者以上は詳細、一般員はX/Y人済の簡易表示"],
            ["I", "PWAで提供", "ブラウザベース、Android/iOS両対応、ストア配布不要"],
            ["J", "グループ（サークル単位）管理", "発足人=初代部長、データはサークル別に完全分離"],
            ["K", "特別イベント集計フォーム", "部長のみ作成・削除。フォーム内限定権限者を設定可能"],
            ["L", "データ永続化（サーバー保管）", "全データをサーバー上に保存、再アクセス時も消えない"],
            ["M", "ユーザー認証・グループ参加制御", "アカウント登録で一意性確保、限定リンク+パスワード+部長承認"],
        ],
        [10, 45, 130],
    )

    # --- 大方針A詳細 ---
    pdf.section_title("大方針A詳細: 3階層ロール制")

    pdf.sub_title("ロール定義")
    pdf.table(
        ["ロール", "人数", "就任方法"],
        [
            ["部長", "グループに1人", "発足時に自動就任 / 委譲のみ（委譲したら失う）"],
            ["権限者", "複数可", "部長が追加・削除"],
            ["一般サークル員", "複数可", "権限者以上が追加・削除"],
        ],
        [30, 30, 125],
    )

    pdf.sub_title("権限マトリクス")
    pdf.table(
        ["操作", "対応方針", "部長", "権限者", "一般員"],
        [
            ["部長を委譲", "A", "o", "-", "-"],
            ["権限者の追加・削除", "A", "o", "-", "-"],
            ["メンバーの追加・削除", "J", "o", "-", "-"],
            ["グループ名変更", "J", "o", "-", "-"],
            ["イベント作成・掲示", "D", "o", "o", "-"],
            ["催促通知の送信", "C", "o", "o", "-"],
            ["支払い承認（済にする）", "E", "o", "o", "-"],
            ["サブステータス閲覧・付与", "F", "o", "o", "-"],
            ["未払い者の支払額調整", "G", "o", "o", "-"],
            ["会計ダッシュボード（詳細）", "H", "o", "o", "-"],
            ["特別イベントフォーム作成・削除", "K", "o", "-", "-"],
            ["特別イベント フォーム内権限者付与", "K", "o", "-", "-"],
            ["イベント・掲示の閲覧", "D", "o", "o", "o"],
            ["「支払った」申告", "E", "o", "o", "o"],
            ["自分のステータス確認", "E", "o", "o", "o"],
            ["集金状況（簡易: X/Y人済）", "H", "o", "o", "o"],
            ["メンバー一覧の閲覧", "J", "o", "o", "o"],
            ["招待リンク生成", "M", "o", "-", "-"],
            ["グループパスワード変更", "M", "o", "-", "-"],
            ["参加リクエスト承認", "M", "o", "-", "-"],
        ],
        [60, 20, 20, 20, 20],
    )

    # --- 大方針K詳細 ---
    pdf.section_title("大方針K詳細: 特別イベント集計フォーム")
    pdf.bullet("部長のみがフォームを作成・削除できる")
    pdf.bullet("部長が任意のメンバー（一般員含む）にフォーム内限定の権限者を付与可能")
    pdf.bullet("フォーム内権限者はそのフォーム内で支払い承認・催促通知等を行える")
    pdf.bullet("フォーム内権限はそのイベント限り、グループ全体の権限には影響しない")
    pdf.bullet("月次リセットとは独立し、イベント単位で完結する")
    pdf.ln(2)

    # --- 大方針M詳細 ---
    pdf.section_title("大方針M詳細: ユーザー認証・グループ参加制御")

    pdf.sub_title("アカウント登録")
    pdf.bullet("メールアドレス等で個人が新規登録（1人1アカウント）")
    pdf.bullet("認証済みユーザーのみアプリ利用可")
    pdf.ln(2)

    pdf.sub_title("グループ参加フロー")
    pdf.numbered(1, "部長がアプリ内で「招待リンク生成」（グループパスワード設定済み）")
    pdf.numbered(2, "部長が招待リンクをコピーし、LINE等で対象者に共有")
    pdf.numbered(3, "受け取った人がリンクを開く → パスワード入力画面")
    pdf.numbered(4, "パスワード正解 → 部長に参加リクエストが届く")
    pdf.numbered(5, "部長が承認 → グループに一般員として追加")
    pdf.ln(2)

    pdf.sub_title("招待リンク仕様")
    pdf.table(
        ["項目", "内容"],
        [
            ["有効期限", "7日間"],
            ["パスワード変更", "部長がいつでも変更可能"],
        ],
        [40, 145],
    )

    # --- 決定理由 ---
    pdf.section_title("決定理由")
    pdf.bullet("PWA採用: ストア審査不要で他サークルへの展開が容易")
    pdf.bullet("グループ概念: マルチサークル対応でデータ混同を防止")
    pdf.bullet("3階層ロール: 部長のみ委譲制で情報管理の一貫性を担保")
    pdf.bullet("特別イベントフォーム内権限: 合宿等の一時的な業務委任を柔軟に実現")
    pdf.bullet("限定リンク+パスワード二段階: リンク漏洩・パスワード漏洩の単独では参加不可、安全性向上")

    pdf.output(OUTPUT)
    print(f"PDF generated: {OUTPUT}")


if __name__ == "__main__":
    build_pdf()
