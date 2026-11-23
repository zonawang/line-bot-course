# 程式位置、重新部署與課後練習

[回課程首頁](../README.md)

首頁已包含課堂必要步驟。本頁供想改程式或重新操作的同學查閱。

## repo 中的檔案

| 檔案 | 用途 |
| --- | --- |
| `src/food.mjs` | 修改店家資料、分類與美食關鍵字的主要位置 |
| `src/bot.mjs` | 收到訊息後決定回覆內容，並驗證 LINE 請求 |
| `src/index.mjs` | 讀取兩個金鑰並啟動伺服器 |
| `local.env.example.yaml` | 部署設定的空白範本 |
| `local.env.yaml` | 自己的金鑰設定，建立後保留在自己的環境 |
| `scripts/setup-cloud.sh` | 準備活動專案的部署服務與權限 |
| `scripts/deploy.sh` | 建置、部署，並顯示 Webhook URL |
| `Dockerfile` | Cloud Build 用來建置 Bot 的容器設定 |

## 程式目前會做什麼

- 加好友時，介紹北科大美食小幫手與可以詢問的問法。
- 問「北科大附近有什麼好吃？」，列出 3 家示範店家、推薦內容、地址與 Google Maps 連結。
- 問「想吃麵」「便當」「咖啡廳」，篩選對應店家；同一句提到多種類別時合併推薦，最多 3 家。
- 沒有符合的關鍵字，或收到圖片等其他訊息時，提示可以詢問的內容。
- `/health` 提供伺服器健康檢查，`/webhook` 接收 LINE 訊息。

本版使用固定店家名單與簡單關鍵字配對，不會理解所有自然語言，也不會查詢即時營業資訊。Google Maps 使用搜尋連結，不需要地圖 API 金鑰。

回覆訊息會在 HTTP 請求結束前完成，適用於 Cloud Run 預設的 CPU 配置。程式與課程核心流程使用 Node.js 原生功能，沒有需要安裝的第三方套件。

## 修改店家資料與重新部署

開啟店家資料：

```bash
cloudshell edit src/food.mjs
```

`foodSpots` 裡的每個大括號代表一家店，例如：

```javascript
{
  category: '麵食',
  name: '三商巧福 伊通店',
  recommendation: '想吃牛肉麵等麵食，可以參考這家。',
  address: '台北市中山區伊通街41之3號',
},
```

- `category`：填「麵食」、「飯食」或「咖啡廳」，決定店家會出現在哪一類。
- `name`：自己的推薦店名，請包含分店名稱。
- `recommendation`：自己的推薦內容。
- `address`：該分店的地址，會與店名一起產生地圖搜尋連結。

先改一句推薦內容就好；換店家時，請一起核對名稱、類別與地址。保留原本的引號、大括號和逗號，儲存後重新部署：

```bash
bash scripts/deploy.sh "$COURSE_PROJECT_ID" "$COURSE_SERVICE" "$COURSE_REGION"
```

新開 Cloud Shell 後，請重新進入 `line-bot-course` 資料夾，並設定首頁的三個 `COURSE_` 變數。服務名稱與專案相同時會更新該服務，請使用自己的服務名稱。

## 示範店家資料來源

以下店名與地址於 2026-11-23 參照官方門市資訊整理，作為課堂的起始名單。課前請再確認門市狀態；程式不保證即時供應、價格或營業時間。

| 示範店家 | 官方來源 |
| --- | --- |
| 三商巧福 伊通店 | [三商巧福門市資訊](https://www.3375.com.tw/Stores/StoresInfo)，選擇北部、臺北市後查詢「伊通」 |
| 鬍鬚張 忠孝新生店 | [鬍鬚張門市資訊](https://shop.fmsc.com.tw/pages/%E9%96%80%E5%B8%82%E8%B3%87%E8%A8%8A)，查詢「忠孝新生店」 |
| 伯朗咖啡館 科大概念店 | [伯朗咖啡館概念店資訊](https://www.mrbrown.com.tw/Stores/Concept.aspx) |

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
