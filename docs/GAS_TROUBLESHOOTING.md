# GASトラブルシューティング（保存できない時）

## 1. まず最初に実行すること
1. `initializeSpreadsheet()` を実行（シート作成）
2. `setupTriggers()` を実行（通知/週次トリガ）
3. `diagnoseEnvironment('rika')` を実行

`diagnoseEnvironment` の戻り値で次を確認:
- `missingSheets` が空か
- `resolvedUserId` が期待ユーザーか
- `userExistsInUsersSheet` が true か

## 2. 保存できない主な原因

### 原因A: Usersシートの user_id / email 不一致
- `Session.getActiveUser().getEmail()` で解決したユーザーがUsersにいない
- 対策:
  - Usersシートに `user_id`, `name`, `role`, `email`, `notify_email` を作る
  - `email` 列にログインメールを正確に入れる

### 原因B: Webアプリの公開設定
- 組織外アクセス不可や実行ユーザー不一致
- 対策:
  - デプロイ > 新しいデプロイ > Webアプリ
  - 実行ユーザー: 自分
  - アクセス: 組織内ユーザー

### 原因C: user_id が取れない
- 組織ポリシーで `getActiveUser().getEmail()` が空になるケース
- 対策:
  - URLに `?user_id=rika` を付けてアクセス
  - 例: `https://script.google.com/.../exec?user_id=rika`

### 原因D: 必須入力不足
- 感謝文、固定タグ、日付未入力
- 対策:
  - `gratitude_text` 入力
  - 固定タグを1つ以上選択
  - 日付を指定

## 3. Usersシートのサンプル
| user_id | name   | role  | email              | notify_email        |
|--------|--------|-------|--------------------|---------------------|
| rika   | りか   | member| rika@yourcorp.com  | rika@yourcorp.com   |
| kaho   | かほ   | member| kaho@yourcorp.com  | kaho@yourcorp.com   |
| kasumi | かすみ | member| kasumi@yourcorp.com| kasumi@yourcorp.com |
| hinako | ひなこ | member| hinako@yourcorp.com| hinako@yourcorp.com |
| rinne  | りんね | admin | rinne@yourcorp.com | rinne@yourcorp.com  |
| manager| 統括   | admin | manager@yourcorp.com| manager@yourcorp.com|

## 4. 保存確認手順
1. Webアプリを `?user_id=rika` 付きで開く
2. 日付・数字・感謝文・固定タグを入力
3. 送信
4. `DailyLogs` に行追加されることを確認

