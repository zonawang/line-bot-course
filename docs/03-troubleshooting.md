# 常見問題排查

[回課程首頁](../README.md)

| 狀況 | 優先檢查 |
| --- | --- |
| 活動入口未開放或領取失敗 | 先完成 LINE 準備，請工作人員確認活動資格與帳號 |
| `YOUR_PROJECT_ID` 沒有替換 | 改成 Console 顯示的實際 Project ID，再執行設定指令 |
| 專案或帳務找不到 | 確認領取、Console 和 Cloud Shell 使用同一個 Google 帳號 |
| `UREQ_PROJECT_BILLING_NOT_FOUND` | 專案沒有連結可用帳務，請工作人員協助 |
| `PERMISSION_DENIED`、`iam.serviceAccounts.actAs` | 活動專案缺少操作權限，請講師處理 |
| 建置服務帳戶或建置權限錯誤 | 請講師確認實際建置身分，以及專案是否已完成準備 |
| 找不到 `local.env.yaml` | 先複製範本、填入金鑰並儲存，且確認位於 repo 資料夾 |
| 部署時提示尚未替換佔位值 | 在 Cloud Shell 編輯器中填入兩個真正的 LINE 金鑰 |
| 容器啟動失敗 | 兩個必要環境變數是否空白；開啟 Cloud Run 日誌看錯誤名稱 |
| 健康檢查正常，Verify 卻是 404 | Webhook URL 必須是服務網址加 `/webhook` |
| Verify 是 401 | `LINE_CHANNEL_SECRET` 是否來自同一個 Channel，修改後是否重新部署 |
| Cloud Run 回傳 403 | 是否允許公開呼叫，或活動組織政策限制了公開服務 |
| Verify 成功，傳訊卻沒有回覆 | Use webhook 是否開啟、金鑰是否正確、是否收到後台自動回覆 |
| 日誌出現 LINE 回覆失敗 401 | `LINE_CHANNEL_ACCESS_TOKEN` 是否有效、有沒有重新發行 |
| 收到兩段歡迎或回覆 | 關閉官方帳號後台的歡迎訊息與自動回應訊息 |
| 一直收到「還沒找到符合的推薦」 | 試問「北科大附近有什麼好吃？」「想吃麵」「便當」「咖啡廳」；本版使用關鍵字配對 |
| 改過店家，手機還是看到舊內容 | 確認已儲存 `src/food.mjs` 並重新部署到同一個服務 |
| 自己新增的店家沒有出現 | `category` 必須是「麵食」、「飯食」或「咖啡廳」；每次最多回覆前 3 家符合的店家 |
| 第一次測試較慢或 Verify timeout | 先開啟健康檢查讓服務啟動，再重試；最小執行個體為 0 時可能冷啟動 |
| 重新開啟終端機後指令失敗 | 重新進入 repo 資料夾，設定三個 `COURSE_` 變數 |

## 看日誌

在 Cloud Shell 執行：

```bash
gcloud run services logs read "$COURSE_SERVICE" \
  --project="$COURSE_PROJECT_ID" \
  --region="$COURSE_REGION" \
  --limit=20
```

本程式的日誌只記錄錯誤類型與狀態碼。向講師求助時提供錯誤文字，金鑰留在自己的設定檔中。
