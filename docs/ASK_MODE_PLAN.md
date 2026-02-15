# Askモード計画書：社内向け「日報＋数字＋予定」管理アプリ

## 0. 結論サマリー
- **推奨は段階導入のWebアプリ（Next.js + Supabase）**。
- 理由は、
  - 「1日1回」「3:00締切」「2:30未入力者のみ通知」「🌱固定判定」など**厳密な業務ルール**を実装しやすい
  - 下書き自動保存・権限制御・折りたたみ表示・週次自動スナップショット生成が安定
  - 今後の Notion / Google カレンダー連携を段階的に拡張しやすい
- ノーコードは初速が速いが、今回の期限ロジック/集計固定/権限細分には運用負債が出やすい。

---

## 1) 実装方針（ノーコード vs Webアプリ）

### A. 比較

#### ノーコード（Glide / Bubble）
- **利点**
  - 初期立ち上げが速い
  - 画面制作が容易
- **懸念**
  - 毎日3:00締切、2:30未入力者限定通知、🌱固定（後で🌼に戻らない）等の**時刻依存ロジックが複雑**
  - 「1日1回のみ」「遅刻区分固定」「週次確定（毎週水曜3:05生成）」の信頼性担保が難しい
  - 将来のAPI連携（Notion/GCal）や監査ログを考えると制約が増える

#### Webアプリ（推奨）
- **利点**
  - ルールをコードで厳密に担保（DB制約 + サーバー側判定）
  - 下書き保存、権限、通知、週次バッチを一貫管理
  - 連携追加時の改修範囲が明確
- **懸念**
  - 初期実装コストはノーコードより高い

### B. 推奨アーキテクチャ
- **フロント**: Next.js（App Router）
- **バックエンド/DB/Auth**: Supabase（PostgreSQL + Row Level Security + Cron/Edge Functions）
- **通知**: LINE Notify代替（Messaging API）or Slack DM（運用優先で選択）
- **集計ジョブ**: Supabase Cron / GitHub Actions
- **デザイン**: シンプル・大人女性向けトーン（水彩アクセント）

### C. 開発フェーズ
- **Phase 1（2〜3週間）**: 日報入力、数字、タグ、花、月次見返し、週次スナップショット
- **Phase 2（+1〜2週間）**: 予定カレンダー強化、Notion自動連携
- **Phase 3（+1〜2週間）**: Googleカレンダー双方向連携

---

## 2) 画面一覧と主要UI（文章ワイヤー）

## 2-1. ログイン/初期設定
- ログイン（メールリンク）
- 初回のみ「表示名」「権限」「通知チャネル」設定

## 2-2. ホーム（毎日使う画面 / 3分入力導線）
- 上部: 今日ステータス
  - `未入力 / 入力済（🌼 or 🌱）`
  - 締切カウントダウン（3:00まで）
- 中央: 数字入力カード（必須項目を1画面）
  - リスト獲得 / アポ日程切り / アポ予定 / アポ済み / LINE作成 / AC予定 / AC済み
  - 数字はテンキー最適化、前日値の薄表示（入力負荷低減）
- 下部:
  - 固定タグ（ワンタップ5種）
  - カスタムタグ（候補チップ + 自由入力1件）
  - 自由記述（日報本文、任意、折りたたみ可）
- 常時: **下書き自動保存（3秒デバウンス）**
- 送信ボタン: 1回のみ有効（送信後ロック）

## 2-3. 予定カレンダー
- 月/週表示切替
- 日別に「アポ予定」「AC予定」件数バッジ
- 予定ステータス: 仮 / 確定 / 完了
- 1タップで当日件数調整（+/-）

## 2-4. My Archive（本人振り返り）
- 月次サマリーカード
  - 入力率（🌼/🌱/—）
  - 主要合計（数字）
  - KPI 3種
  - 今月のネック（タグ/本文から抽出）
- 月カレンダー（🌼/🌱/—）
- ログ一覧 + タグ検索（固定/カスタム）

## 2-5. 管理者ダッシュボード
- 週次スナップショット（木曜MTG用）
  - 全体：合計、KPI、今週ネック
  - 個人（固定順: りか→かほ→かすみ→ひなこ）
- 個票は「本文折りたたみデフォルト」
  - まずは入力有無＋ネック＋数字を優先表示

## 2-6. 月1感謝公開ページ
- 質問: 「今月いちばん心に残った感謝は？」
- 公開は月1投稿のみチーム閲覧

---

## 3) データ設計（テーブル/フィールド/キー/計算）

## 3-1. users
- id (PK, uuid)
- name (text)
- role (enum: member/admin)
- active (bool)
- timezone (text, default Asia/Tokyo)
- created_at

## 3-2. daily_reports（1日1回制約の中心）
- id (PK)
- user_id (FK users)
- report_date (date)  ※「業務日」
- submitted_at (timestamptz)
- status (enum: flower/bud)  
  - flower=3:00まで
  - bud=3:00以降（固定）
- list_count (int, required)
- appointment_set_count (int, required)
- appointment_planned_count_raw (int, required)
- appointment_done_count (int, required)
- line_created_count (int, required)
- ac_planned_count (int, required)
- ac_done_count (int, required)
- free_note (text, nullable)
- bottleneck_note (text, nullable, 1行推奨)
- created_at / updated_at
- **UNIQUE(user_id, report_date)** ← 1日1回をDBで保証

## 3-3. report_tags
- id (PK)
- report_id (FK daily_reports)
- tag_type (enum: fixed/custom)
- tag_text (text)
- is_public_monthly (bool default false)

制約:
- fixedタグは最大複数OK
- customタグは**1日1件まで**（DB制約 or トリガ）
- customタグ15文字以内、先頭#は保存時自動付与

## 3-4. report_drafts
- id (PK)
- user_id (FK)
- report_date (date)
- payload_json (jsonb)
- updated_at
- UNIQUE(user_id, report_date)

## 3-5. schedule_entries
- id (PK)
- user_id (FK)
- schedule_date (date)
- schedule_type (enum: appt/ac)
- status (enum: tentative/confirmed/done)
- count (int)
- note (text)
- created_at / updated_at

## 3-6. monthly_goals
- id (PK)
- user_id (FK)
- year_month (char(7), e.g. 2025-02)
- goal_appointment_set (int)
- goal_appointment_done (int)
- goal_line_created (int)
- goal_custom_json (jsonb)

## 3-7. weekly_snapshots
- id (PK)
- week_key (text, e.g. 2025-W07)
- fixed_at (timestamptz)  ※水曜3:05生成
- payload_json (jsonb)
- created_at

## 3-8. thank_you_monthly
- id (PK)
- user_id (FK)
- year_month (char(7))
- message (text)
- created_at
- UNIQUE(user_id, year_month)

## 3-9. kpi計算ロジック
- `appointment_planned_adjusted = appointment_planned_count_raw * 1.33`
- `アポ日程切り率 = SUM(appointment_set_count) / SUM(goal_appointment_set)`
- `アポ実施率 = SUM(appointment_done_count) / SUM(appointment_planned_adjusted)`
- `LINE作成率 = SUM(line_created_count) / SUM(appointment_done_count)`
- 0除算時は `null` 表示（—）

※補正「+0.33」は業務要件より `×1.33` として実装。

---

## 4) 通知設計（誰に、いつ、条件、文言）

## 4-1. 毎日リマインド（必須）
- 対象: メンバーのみ
- 時刻: 毎日2:30（Asia/Tokyo）
- 条件: その日のdaily_reports未提出者のみ
- 回数: 1回のみ
- 文言（指定トーン）:
  - 「🌼 今日の入力、抜けてないかな？ 3:00までに数字＋感謝ひとことだけお願い！ いつもありがとう。」

## 4-2. 締切判定
- 3:00まで送信 → 🌼
- 3:00以降送信 → 🌱（固定、後から変更不可）
- 未送信 → —

## 4-3. 週次生成
- 毎週水曜3:05にスナップショット確定
- 木曜22:00MTGで閲覧

## 4-4. 管理者通知（任意）
- 水曜3:10に「週次確定完了」通知
- エラー時のみ運用担当へアラート

---

## 5) 権限とプライバシー（共有範囲・折りたたみ）

### 基本方針
- A権限: 本人 + 管理者が閲覧可
- ただし管理者UIは**本文折りたたみデフォルト**で、
  - 先に「入力有無」「ネック」「数字」を確認
  - 必要時のみ本文展開

### 具体設計（RLS）
- member:
  - 自分のdaily_reports, drafts, schedules, goals, monthly thanksのみCRUD
- admin:
  - 全メンバーの閲覧可
  - 編集は原則不可（監査整合性のため）
- 統括:
  - 全体ダッシュボード閲覧 + スナップショット閲覧

### 月1感謝公開
- 日次感謝は非公開（本人＋管理者）
- 月1投稿のみチーム公開フラグで表示

---

## 6) Notion / Googleカレンダー連携案（段階ロードマップ）

## 6-1. Notion連携（既存運用を壊さない）

### Step 1: 一方向同期（本アプリ → Notion）
- 週次確定後に、全体数字/KPIをNotion DBへUpsert
- キー: `week_key`
- 既存Notionの集計/表示は維持

### Step 2: 目標同期（Notion ↔ 本アプリ）
- 月初にNotion目標DBから本アプリmonthly_goalsへ同期（または逆）
- 二重入力をなくす

工数目安:
- Step1: 1〜2日
- Step2: 2〜3日

## 6-2. Googleカレンダー連携（今年実装）

### Phase A（軽量）
- 本アプリ予定をGoogleカレンダーへイベント生成（書き込み）
- ステータスはイベントタイトルprefixで表現（[仮]/[確定]/[完了]）

### Phase B（本命）
- 双方向同期
  - GCal更新をWebhook/Pollで取得し、本アプリ反映
  - 衝突時は「最終更新優先 + 履歴ログ」

工数目安:
- Phase A: 3〜5日
- Phase B: 7〜10日

---

## 7) 受入条件（テスト観点）

## 7-1. 入力UX
- 数字+タグ+任意本文が**3分以内**で入力完了できる（4名中3名以上で達成）
- 途中離脱後も下書き復元される

## 7-2. ルール担保
- 1日1回投稿制約が機能する（2回目は保存不可）
- 2:30通知は未入力者のみ1回
- 3:00以降の提出は必ず🌱になり、後で🌼に戻らない
- 未入力は月次カレンダーで—表示

## 7-3. 集計/KPI
- 補正1.33適用後のKPIが仕様通り
- 0除算時に—表示
- 週次スナップショットが水曜3:05に固定化され再計算されない

## 7-4. 権限/公開
- メンバーは他人の日次本文を見られない
- 管理者は本文折りたたみで概要優先確認できる
- 月1感謝のみチーム公開される

## 7-5. MTG即利用性
- 木曜22:00時点で「全体+個人」が1画面（または1リンク）で確認できる
- 個人表示順が「りか→かほ→かすみ→ひなこ」で固定

---

## 実装順（OK後のCodeモード予定）
1. DBスキーマ + RLS + 初期データ
2. 日報入力画面（3分導線 + 下書き）
3. 締切判定/花ロジック/1日1回制約
4. 月次アーカイブ
5. 週次スナップショット生成
6. 管理者ダッシュボード
7. 通知
8. Notion連携（Step1）
9. GCal連携（Phase A）

---

## 仮定一覧（不明点を先に固定）
- 締切3:00は **毎日JST固定** とする。
- 「アポ予定 +0.33補正」は **KPI計算時のみ** 適用し、入力値自体は生値を保持する。
- 「未入力は週1回までOK」は **評価ルール** とし、入力可否制御には使わず、月次表示で可視化する。
- 管理者は本文閲覧可能だが、デフォルトUIで隠して心理負荷を下げる。
- 通知チャネルは初期は1つ（SlackまたはLINE）に絞って導入する。
