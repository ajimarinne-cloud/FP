# GAS クイックスタート（エラー時の最短復旧）

Apps Script にコードを入れた後、まず以下の順で実行してください。

## 0) 先に確認
- スクリプトエディタ右上の「実行する関数」を選べること
- `appsscript.json` の timezone が `Asia/Tokyo` であること

## 1) 実行順（この順番が重要）
1. `runInitialSetup('rika')`
2. `seedUsersSampleIfEmpty()`（Usersが空なら）
3. `diagnoseEnvironment('rika')`

## 2) 期待値
- `diagnoseEnvironment` で:
  - `missingSheets: []`
  - `resolvedUserId` が期待値（例: `rika`）
  - `userExistsInUsersSheet: true`

## 3) Webアプリ再デプロイ
- デプロイ > 新しいデプロイ > Webアプリ
  - 実行ユーザー: 自分
  - アクセス: 組織内ユーザー
- URLに `?user_id=rika` をつけて初回アクセス

例:
`https://script.google.com/.../exec?user_id=rika`

## 4) まだ保存エラーなら
- Usersシートの `email` 列を実ログインアカウントに合わせる
- 日報入力で必須項目（日付・感謝文・固定タグ）を確認
- 2回目送信は仕様で `編集保存` が必要

## 5) よくあるエラー
- 「認証ユーザーIDが取得できません」
  - `?user_id=...` 付きURLでアクセス
- 「Usersシートに user_id=xxx が存在しません」
  - Usersシートに行追加 or emailマッピング修正
- 「この日は既に入力済みです」
  - 仕様通り。編集保存を使う
