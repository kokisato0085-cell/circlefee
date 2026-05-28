# CircleFee - サークル費用管理アプリ

大学サークルの会費・集金を一元管理する PWA（Progressive Web App）です。  
メンバーの支払い申告 → 権限者の承認という 2 段階フローで集金状況をリアルタイムに把握できます。

> **デモサイト:** https://club-expense-management-app.vercel.app

---

## 背景・課題

サークル活動で毎月の会費を集めるとき、LINE で個別連絡し Excel で手動管理するのは手間がかかります。  
「誰が払ったか」「いくら集まったか」をリアルタイムで全員が確認でき、催促通知もワンタップで送れる仕組みを作りました。

---

## 主な機能

### 集金管理
- **イベント（集金項目）の作成** — 月次会費や単発の集金を作成・掲示
- **2 段階支払いフロー** — メンバーが「支払った」申告 → 権限者が承認 / 差戻し
- **支払い申告メモ** — 申告時に日付・場所・受取人・メッセージを記録
- **個別金額調整** — 2 ヶ月連続未払い者に対して金額を増減
- **会計ダッシュボード** — 月別の集金進捗・金額を可視化、CSV エクスポート対応
- **会計帳簿** — 入出金記録・残高管理・カテゴリ別支出円グラフ・月別収支レポート

### グループ・メンバー管理
- **3 階層ロール制** — 部長 > 権限者 > 一般員の権限管理
- **招待リンク** — パスワード付きリンクを共有してメンバーを招待
- **メンバーバッジ** — 学年バッジ（1〜4 年）と係バッジ（自由作成）を部長が付与
- **部長委譲** — 部長権限を別メンバーに移譲

### 通知
- **Web Push 通知** — 新規イベント・支払い申告・承認結果・催促をスマホに通知
- **アプリ内通知** — 通知履歴を一覧表示、未読バッジ付き

### その他
- **特別イベント** — 合宿費など月次会費とは別枠の集金フォーム（参加メンバーを個別選択）
- **イベント投票** — 日程調整などの投票機能をイベントに紐付け
- **PWA 対応** — Android / iOS のホーム画面に追加してネイティブアプリのように使用可能
- **アカウント管理** — 表示名変更・パスワード変更・アカウント削除（データ匿名化）

---

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js 15 (App Router), React 19, TypeScript |
| スタイリング | Tailwind CSS, shadcn/ui |
| データベース | Supabase (PostgreSQL + RLS + Realtime) |
| 認証 | Supabase Auth (メール + パスワード) |
| メール送信 | Resend (カスタム SMTP) |
| プッシュ通知 | Web Push API (VAPID) |
| ホスティング | Vercel (フロント) + Supabase (バックエンド) |
| バリデーション | Zod |

---

## アーキテクチャ

```
[ブラウザ / PWA]
    ├── Server Components (RSC) でページ描画
    ├── Server Actions で DB 操作（認証 + RLS で保護）
    ├── Supabase Realtime で支払い状況をリアルタイム反映
    └── Service Worker で Web Push 受信

[Supabase]
    ├── PostgreSQL + Row Level Security（全テーブル）
    ├── Auth（メール認証 + セッション管理）
    └── Realtime（WebSocket 配信）
```

### セキュリティ設計
- 全テーブルに RLS ポリシー適用（グループ単位のデータ分離）
- Server Actions でロール検証 + 楽観的ロック（version カラム）
- メールアドレスは auth 経由のみ取得可能（DB に保存しない）
- IDOR 防止のためリソースのグループ所属を検証
- 入力バリデーション: クライアント (UX) + サーバー (Zod) + DB (CHECK 制約) の多層防御

---

## セットアップ

### 前提条件

- Node.js 20+
- npm
- Supabase プロジェクト
- Resend アカウント（メール送信用）

### 手順

```bash
# 1. クローン
git clone https://github.com/kokisato0085-cell/Club-Expense-Management-App.git
cd Club-Expense-Management-App/app

# 2. 依存パッケージをインストール
npm install

# 3. 環境変数を設定
cp .env.local.example .env.local
# .env.local を編集して以下を設定:
#   NEXT_PUBLIC_SUPABASE_URL      — Supabase プロジェクトの URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase の anon key
#   NEXT_PUBLIC_SITE_URL          — デプロイ先 URL（ローカルなら http://localhost:3000）
#   SUPABASE_SERVICE_ROLE_KEY     — Supabase の service_role key（Push通知送信用）
#   NEXT_PUBLIC_VAPID_PUBLIC_KEY  — Web Push 用公開鍵
#   VAPID_PRIVATE_KEY             — Web Push 用秘密鍵

# 4. Supabase DB セットアップ
#    SQL Editor で supabase/migrations/ 配下のファイルを 001〜014 の順に実行

# 5. 開発サーバー起動
npm run dev
```

### Supabase 設定

| 設定項目 | 値 |
|---------|-----|
| Authentication > Providers > Email | Confirm email: ON |
| Authentication > URL Configuration | Site URL: デプロイ先 URL |
| Project Settings > SMTP | Host: `smtp.resend.com`, Port: `587`, Username: `resend`, Password: Resend API キー |

### VAPID キーの生成（Web Push 用）

```bash
npx web-push generate-vapid-keys
```

生成された公開鍵・秘密鍵を `.env.local` と Vercel 環境変数に設定します。

---

## デプロイ

1. Vercel にプロジェクトをインポート（**Root Directory: `app`**）
2. 環境変数を設定（上記 6 つ）
3. Supabase の URL Configuration と Redirect URLs をデプロイ先 URL に更新
4. main ブランチへのプッシュで自動デプロイ

---

## ディレクトリ構成

```
app/
├── src/
│   ├── app/
│   │   ├── (auth)/            # 認証ページ（login, signup, reset-password）
│   │   ├── actions/           # Server Actions（全 DB 操作）
│   │   ├── api/               # API ルート（auth callback, icon 生成）
│   │   ├── g/[groupId]/       # グループ内ページ
│   │   │   ├── admin/         #   管理画面（メンバー管理, ロール管理）
│   │   │   ├── approve/       #   支払い承認
│   │   │   ├── dashboard/     #   会計ダッシュボード
│   │   │   ├── events/        #   イベント詳細・作成
│   │   │   ├── members/       #   メンバー一覧
│   │   │   ├── notifications/ #   通知一覧
│   │   │   ├── settings/      #   グループ設定
│   │   │   └── special/       #   特別イベント
│   │   ├── groups/            # グループ選択・作成
│   │   ├── invite/            # 招待リンク参加
│   │   └── settings/          # アカウント設定
│   ├── components/ui/         # shadcn/ui コンポーネント
│   └── lib/                   # Supabase クライアント, バリデーション, Web Push
├── supabase/
│   └── migrations/            # DB マイグレーション SQL（001〜014）
├── public/                    # PWA アセット（manifest, icons, sw.js）
└── docs/                      # 設計書（方針書, 基本設計書）
```

---

## DB マイグレーション一覧

| # | ファイル | 内容 |
|---|---------|------|
| 001 | initial_schema | profiles, groups, memberships, invite_links, join_requests |
| 002 | fix_rls_recursion | RLS 再帰参照の修正 |
| 003 | events_payments | events, payment_statuses テーブル |
| 004 | phase3_functions | 部長委譲・連続未払い判定の RPC 関数 |
| 005 | phase4_notifications | notifications, push_subscriptions テーブル |
| 006 | phase5_special_events | special_events, special_payment_statuses テーブル |
| 007 | event_polls | event_polls, event_poll_options, event_poll_votes テーブル |
| 008 | fix_profile_email_security | プロフィールのメールアドレス非公開化 |
| 009 | get_invite_group_info | 招待リンク情報取得 RPC |
| 010 | code_review_fixes | RLS ポリシー・関数の修正 |
| 011 | payment_claim_memo | 支払い申告メモ（日付・場所・受取人） |
| 012 | payment_claim_message | 支払い申告メッセージ |
| 013 | member_badges | 学年バッジ・係バッジ（group_roles, member_roles） |
| 014 | special_event_member_management | 特別イベントメンバー選択制・DELETE/INSERT ポリシー追加 |
| 015 | accounting_ledger | account_entries, expense_categories テーブル（会計帳簿） |

---

## 利用ガイド

ロール別の操作マニュアル（PDF / Markdown）を `app/docs/manuals/` に用意しています。

| 対象 | PDF | Markdown |
|------|-----|----------|
| 部長 | [CircleFee_利用ガイド_部長向け.pdf](app/docs/manuals/CircleFee_利用ガイド_部長向け.pdf) | [guide_leader.md](app/docs/manuals/guide_leader.md) |
| 権限者 | [CircleFee_利用ガイド_権限者向け.pdf](app/docs/manuals/CircleFee_利用ガイド_権限者向け.pdf) | [guide_moderator.md](app/docs/manuals/guide_moderator.md) |
| 一般会員 | [CircleFee_利用ガイド_一般会員向け.pdf](app/docs/manuals/CircleFee_利用ガイド_一般会員向け.pdf) | [guide_member.md](app/docs/manuals/guide_member.md) |

### 部長向け（全機能）

グループ作成・メンバー招待・権限者管理・部長委譲・バッジ管理・イベント作成/編集/削除・支払い承認・催促通知・特別イベント（作成/削除/メンバー管理/フォーム内権限者付与）・会計帳簿（入出金/カテゴリ/レポート）・入金確定・ダッシュボード・通知・PWA設定・アカウント管理

### 権限者向け

イベント作成/編集/削除・支払い承認・催促通知・金額調整・特別イベント（作成/メンバー管理）・会計帳簿（入出金/カテゴリ/レポート）・入金確定・投票作成・ダッシュボード・通知・支払い申告

### 一般会員向け

イベント閲覧・支払い申告（日付/場所/受取人/メッセージ記録）・ステータス確認・投票・会計帳簿（残高サマリーのみ）・集金状況確認・メンバー一覧・通知・PWA設定・アカウント設定

---

## ライセンス

MIT
