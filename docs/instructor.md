# 講師課前檢查

[回課程首頁](../README.md)

本課程的完成標準是「學生建立自己的官方帳號，傳文字後收到程式回覆」。首頁是學生唯一需要依序閱讀的操作頁。

## 活動開放後先彩排

- 使用一般學員允許的帳號，實際走完活動額度及專案領取流程。
- 確認 Project ID、帳務、可部署區域，以及是否為每人獨立專案。
- 共用專案時，替每位學員安排不同服務名稱，避免同名更新。
- 確認來源建置及公開 Cloud Run 服務均符合活動權限與組織政策。
- 跑完 `setup-cloud.sh`、首次部署、LINE Verify 和手機回覆驗收，記錄實際等待時間。
- 用新開的 Cloud Shell 視窗確認變數重設與操作指引可重現。

活動環境尚未開放前，無法將本機模擬測試視為活動部署成功。90 分鐘時程以活動環境彩排通過為前提。

## 雲端準備腳本做的事

1. 啟用 `run.googleapis.com`、`cloudbuild.googleapis.com`、`artifactregistry.googleapis.com`、`iam.googleapis.com`。
2. 建立或沿用 `linebot-runtime` 執行服務帳戶；此 Bot 透過 HTTPS 呼叫 LINE，沒有讀寫 Google Cloud 資料的需求。
3. 依 Google 目前預設來源部署流程，給 Compute Engine 預設建置身分 `roles/run.builder`。

腳本明確指定 Project ID，會修改該專案的服務及 IAM 設定。若活動使用自訂建置身分，請管理員依實際設定調整建置角色；請先驗證腳本在活動專案上的可用性。

若學生沒有管理權限，請工作人員先統一完成雲端準備，學生課堂操作從金鑰設定與部署繼續。

## 管理員需確認的權限

- 準備專案者：啟用 API、建立服務帳戶，以及修改對應 IAM 政策的權限。
- 部署者：Cloud Run 來源部署、Service Usage，以及使用 `linebot-runtime` 身分的權限。
- 公開服務：允許 LINE 呼叫所需的服務公開設定權限，並符合組織政策。
- 建置身分：實際執行來源建置的帳號具有所需建置角色。

請依角色範圍設定，參考 [Cloud Run 來源部署官方文件](https://docs.cloud.google.com/run/docs/deploying-source-code)。

## 本機驗證

Node.js 24 環境執行 `npm test`。測試涵蓋 LINE 簽章、空事件 Verify、文字回覆、異常與逾時，全部使用模擬 API。

另外可用測試金鑰啟動容器或 Node.js 程序，驗證 `PORT`、`0.0.0.0` 綁定及健康檢查。實際 LINE 回覆與雲端部署仍需活動環境實測。
