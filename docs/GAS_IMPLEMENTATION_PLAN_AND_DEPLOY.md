# GAS実装計画・デプロイ手順・テスト

## 1. 実装構成
- `gas/Code.gs`: Web Appエントリ、日報・予定・アーカイブAPI、トリガー設定
- `gas/Config.gs`: 設定値、タイムゾーン、共通関数
- `gas/SheetsRepository.gs`: スプレッドシートCRUD
- `gas/AuthPolicy.gs`: 権限判定（本人/管理者）
- `gas/KpiService.gs`: KPI計算
- `gas/SnapshotService.gs`: 週次スナップショット作成（水曜3:05）
- `gas/NotificationService.gs`: 未入力者通知（2:30）
- `gas/CalendarService.gs`: 確定予定のGoogleカレンダー同期
- `gas/index.html`, `gas/js.html`, `gas/css.html`: UI
- `gas/appsscript.json`: GASマニフェスト

## 2. Askモード要約
- 3分入力を最優先にした単画面フォーム
- 日報は1日1回（重複時は編集導線）
- 3:00締切ロジックで🌼/🌱判定
- 水曜3:05で週次スナップショット確定
- 2:30に未入力者のみに通知
- 管理者のみWeekly Snapshotの全体閲覧

## 3. デプロイ手順
1. Google Apps Script プロジェクト作成
2. `gas/` 配下のファイルを同名で作成して貼り付け
3. スクリプトプロパティ設定
   - `SPREADSHEET_ID`: 対象スプレッドシートID
   - `CALENDAR_ID`: （任意）同期先カレンダーID
4. `initializeSpreadsheet()` を1回実行（シート/ヘッダ作成）
5. `setupTriggers()` を1回実行（2:30通知、水曜3:05集計）
6. 「デプロイ > 新しいデプロイ > ウェブアプリ」
   - 実行ユーザー: 自分
   - アクセス: 組織内ユーザー
7. URLをメンバーに共有
8. もし保存できない場合は `docs/GAS_TROUBLESHOOTING.md` を参照

## 4. テストケース

### 4.1 日報入力
- [正常] 必須項目＋感謝文＋固定タグで保存できる
- [制約] 同日2回目は `needsEdit=true` が返る
- [編集] `allow_edit=true` で更新保存される

### 4.2 3:00ロジック
- [正常] report_date翌日2:59送信 -> `🌼`
- [正常] report_date翌日3:01送信 -> `🌱`

### 4.3 予定入力
- [正常] 月内日付の予定を一括保存できる
- [連携] status=確定でCalendarイベントIDが保存される

### 4.4 Archive/KPI
- [正常] 月カレンダーに `🌼/🌱/—` が表示される
- [計算] KPI式
  - 日程切り率 = appt_cut_count / appt_cut_goal
  - アポ実施率 = appt_done_count / (appt_plan_count + 0.33)
  - LINE作成率 = line_count / appt_done_count
- [境界] 分母0は `—`

### 4.5 週次スナップショット
- [正常] `generateWeeklySnapshot()` で1件作成
- [冪等] 同じ週の再生成は既存扱い
- [順序] 個人表示順が りか→かほ→かすみ→ひなこ

### 4.6 通知
- [正常] `sendReminderNotifications()` が未入力者のみ送信
- [文言] 指定文言で送信される

## 5. エラー処理方針
- APIは例外throwでフロントへ明示
- 入力値不正（必須欠け/タグ未選択/権限違反）を明確化
- トリガー処理失敗時はExecution logを確認
