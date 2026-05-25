# CircleFee - サークル費用管理アプリ

サークルやグループの会費・集金を一元管理するWebアプリケーション（PWA）です。

**https://club-expense-management-app-9ddi.vercel.app**

## なぜ作ったか

サークル活動で毎月の会費を集めるとき、メンバー一人ひとりにLINEで連絡し、支払い状況をExcelで手動管理するのは非常に手間がかかります。この作業を効率化し、集金状況をリアルタイムで把握できるようにするために開発しました。

## 主な機能

| 機能 | 説明 |
|------|------|
| グループ管理 | グループ作成・招待リンクによるメンバー参加 |
| イベント・集金管理 | 月次会費や単発イベントの集金を作成・管理 |
| 支払いフロー | メンバーが支払い申告 → 権限者が承認する2段階フロー |
| 3階層ロール | 部長・副部長（moderator）・一般メンバーの権限管理 |
| ダッシュボード | 集金状況の一覧・進捗を可視化 |
| 通知 | アプリ内通知・Web Pushで支払い催促や承認結果を通知 |
| 特別イベント | 通常の月次会費とは別に、単発の集金フォームを作成 |
| イベント投票 | イベントに紐づく投票機能（日程調整等） |
| アカウント設定 | 表示名変更・アカウント削除 |
| PWA対応 | スマホのホーム画面に追加してネイティブアプリのように利用可能 |

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フロントエンド | Next.js 16, React 19, TypeScript |
| スタイリング | Tailwind CSS 4, shadcn/ui |
| バックエンド | Supabase（認証・DB・Realtime・RLS） |
| メール送信 | Resend（カスタムSMTP） |
| ホスティング | Vercel |
| ドメイン・DNS | Cloudflare |
| フォーム | React Hook Form + Zod |
| プッシュ通知 | Web Push API |

## セットアップ

### 前提条件

- Node.js 20 以上
- npm
- Supabaseアカウント
- Resendアカウント（メール送信用）

### 1. リポジトリをクローン

```bash
git clone https://github.com/kokisato0085-cell/Club-Expense-Management-App.git
cd Club-Expense-Management-App/app
```

### 2. 依存パッケージをインストール

```bash
npm install
```

### 3. 環境変数を設定

`.env.local.example` をコピーして `.env.local` を作成し、値を設定します。

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Supabaseのデータベースをセットアップ

Supabase SQL Editorで、`supabase/migrations/` 配下のSQLファイルを番号順に実行します。

```
001_initial_schema.sql
002_fix_rls_recursion.sql
003_events_payments.sql
004_phase3_functions.sql
005_phase4_notifications.sql
006_phase5_special_events.sql
007_event_polls.sql
008_fix_profile_email_security.sql
009_get_invite_group_info.sql
010_code_review_fixes.sql
```

### 5. Supabase Authentication の設定

- **Providers > Email**: Confirm email を ON
- **URL Configuration**: Site URL に `http://localhost:3000` を設定
- **SMTP Settings**: Resend の SMTP 情報を入力（Host: `smtp.resend.com`, Port: `587`, Username: `resend`, Password: ResendのAPIキー）

### 6. 開発サーバーを起動

```bash
npm run dev
```

http://localhost:3000 でアプリが起動します。

## デプロイ

Vercelを使用してデプロイできます。

1. Vercelにプロジェクトをインポート（Root Directory: `app`）
2. 環境変数を設定（`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`）
3. Supabaseの URL Configuration と Redirect URLs をデプロイ先URLに更新

## ディレクトリ構成

```
app/
├── src/
│   ├── app/
│   │   ├── (auth)/          # 認証ページ（login, signup等）
│   │   ├── actions/         # Server Actions
│   │   ├── api/             # APIルート
│   │   ├── g/[groupId]/     # グループ関連ページ
│   │   ├── groups/          # グループ一覧
│   │   ├── invite/          # 招待リンク処理
│   │   └── settings/        # アカウント設定
│   ├── components/          # 共通UIコンポーネント
│   └── lib/                 # ユーティリティ・Supabaseクライアント
├── supabase/
│   └── migrations/          # DBマイグレーション（SQL）
└── public/                  # 静的ファイル・PWAアセット
```

## ライセンス

MIT
