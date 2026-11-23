# 程式位置、重新部署與課後練習

[回課程首頁](../README.md)

首頁已包含課堂必要步驟。本頁供想改程式或重新操作的同學查閱。

## repo 中的檔案

| 檔案 | 用途 |
| --- | --- |
| `src/bot.mjs` | 收到訊息後決定回覆內容，並驗證 LINE 請求 |
| `src/index.mjs` | 讀取兩個金鑰並啟動伺服器 |
| `local.env.example.yaml` | 部署設定的空白範本 |
| `local.env.yaml` | 自己的金鑰設定，建立後保留在自己的環境 |
| `scripts/setup-cloud.sh` | 準備活動專案的部署服務與權限 |
| `scripts/deploy.sh` | 建置、部署，並顯示 Webhook URL |
| `Dockerfile` | Cloud Build 用來建置 Bot 的容器設定 |

## 程式目前會做什麼

- 加好友時，送出簡短歡迎訊息。
- 收到文字時，回覆「你說：」加上收到的內容。
- 收到圖片等其他訊息時，提示先傳文字。
- `/health` 提供伺服器健康檢查，`/webhook` 接收 LINE 訊息。

回覆訊息會在 HTTP 請求結束前完成，適用於 Cloud Run 預設的 CPU 配置。程式與課程核心流程使用 Node.js 原生功能，沒有需要安裝的第三方套件。

## 更改回覆與重新部署

編輯 `src/bot.mjs` 中的 `replyText` 函式，先修改「你說：」的文字即可。

```bash
bash scripts/deploy.sh "$COURSE_PROJECT_ID" "$COURSE_SERVICE" "$COURSE_REGION"
```

新開 Cloud Shell 後，請重新進入 `line-bot-course` 資料夾，並設定首頁的三個 `COURSE_` 變數。服務名稱與專案相同時會更新該服務，請使用自己的服務名稱。

## 本機測試：課後選做

若自己的電腦已有 Node.js 24，可執行：

```bash
npm test
```

測試使用模擬的 LINE 回覆，不需要真實金鑰，也不會發送 LINE 訊息。

本機啟動時，可複製 `.env.example` 成 `.env`，填入自己的兩個 LINE 金鑰後執行 `npm start`。本機 `localhost` 無法直接作為 LINE 的 Webhook；課堂統一使用 Cloud Run 的 HTTPS 網址。

## 課後資源整理

依活動安排決定是否保留服務。不再使用自己的服務時，可執行：

```bash
gcloud run services delete "$COURSE_SERVICE" \
  --project="$COURSE_PROJECT_ID" \
  --region="$COURSE_REGION"
```

刪除服務會讓自己的 Bot 停止回覆。建置映像與其他活動資源仍需依現場安排整理；共用專案交由講師管理。
