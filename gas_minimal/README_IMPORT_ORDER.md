# Apps Script 最小構成（これだけ貼り付け）

このフォルダのファイル**だけ**を Apps Script プロジェクトに作成してください。

## 作成するファイル（名前を一致）
- Code.gs
- Config.gs
- SheetsRepository.gs
- AuthPolicy.gs
- KpiService.gs
- SnapshotService.gs
- NotificationService.gs
- CalendarService.gs
- index.html
- js.html
- css.html
- appsscript.json

## 入れないもの
- README.md / docs/*.md / web/*
- git diff（`diff --git`, `@@`, 行頭`+`）

## 実行順
1. runInitialSetup('rika')
2. seedUsersSampleIfEmpty()（Usersが空の時）
3. diagnoseEnvironment('rika')
4. Webアプリ再デプロイ
