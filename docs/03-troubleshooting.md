# 🔍 常見問題與課後整理

[回課程首頁](../README.md)

## 活動入口與帳務

| 狀況 | 處理方式 |
| --- | --- |
| 活動連結尚未開放 | 先完成 LINE 與工具準備，待工作人員宣布開放 |
| 進入連結只有登入畫面 | 使用活動允許的帳號登入 Google Developer Program，按頁面繼續 |
| 額度已領取，Console 卻沒有專案 | 確認帳號一致，依活動安排建立或選擇專案；領取額度與建立專案可能是不同步驟 |
| `billingEnabled: false` | 專案尚未連結可用帳務帳戶，或帳務帳戶已關閉 |
| `UREQ_PROJECT_BILLING_NOT_FOUND` | 先完成活動帳務連結，再重試開通 Cloud Run／Cloud Build／Artifact Registry |
| 帳務頁查不到領到的額度 | 檢查登入帳號、選到的帳務帳戶及領取是否成功；請工作人員協助 |
| `RESOURCE_EXHAUSTED` 或 `RATE_LIMIT_EXCEEDED` | 依錯誤中的時間窗等待後再試；持續發生時檢查錯誤列出的服務及配額所屬專案 |

## gcloud、ADC 與 IAM

| 狀況 | 優先檢查 |
| --- | --- |
| `gcloud: command not found` | 工具是否安裝、終端機是否重開、PATH 是否依安裝說明設定 |
| 操作到錯的專案 | 執行 `gcloud config list`，並重新設定 `COURSE_PROJECT_ID` |
| gcloud 能操作，程式卻找不到憑證 | 本機程式使用 ADC；依 Google Cloud 章節執行 ADC 登入 |
| ADC quota project 不符 | 確認帳號有 Service Usage 權限後，執行 `gcloud auth application-default set-quota-project "$COURSE_PROJECT_ID"` |
| API 啟用時 `PERMISSION_DENIED` | 需要啟用 API 的權限，例如 Service Usage Admin 所含權限 |
| `iam.serviceAccounts.actAs` 權限不足 | 請管理員授予部署者使用指定執行服務帳戶的權限 |
| 建置階段失敗 | 查看 Cloud Build 日誌，確認實際建置身分具有 Cloud Run Builder 權限 |
| Bot 讀寫 Firestore 失敗 | 檢查 Cloud Run 實際執行身分及其 `roles/datastore.user` 權限 |
| `ALREADY_EXISTS` | 專案中已存在同名資源；先檢查後沿用 |

Google 官方目前列出的來源部署者角色包括 `roles/run.sourceDeveloper`、`roles/serviceusage.serviceUsageConsumer`，以及對執行身分的 `roles/iam.serviceAccountUser`。公開服務的 IAM 設定另外需要對應管理權限。建置用身分與執行用身分各自需要不同角色，請由活動管理員依實際設定授予。

參考：[Cloud Run 來源部署與所需角色](https://docs.cloud.google.com/run/docs/deploying-source-code)。

## Cloud Run、OAuth 與 LINE

| 狀況 | 優先檢查 |
| --- | --- |
| 容器啟動失敗，提到 `GOOGLE_CLOUD_PROJECT` | 部署設定必須提供活動 Project ID |
| LINE Verify 回傳 404 | 本教材指定的範例版本使用根路徑 `/`；重新核對 `main.go` 與 Webhook URL |
| LINE Verify 簽章驗證失敗 | `ChannelSecret` 大小寫、值與 LINE Channel 是否相符 |
| Cloud Run 回傳 403 | 服務是否允許公開呼叫，或組織政策是否限制公開服務 |
| Verify 成功但 Bot 沒有正常回覆 | 檢查 `ChannelAccessToken`、後台回應設定及 Cloud Run 日誌 |
| `redirect_uri_mismatch` | OAuth 用戶端的 URI 與 `GOOGLE_REDIRECT_URL` 必須完全一致，包括 HTTPS、路徑及結尾斜線 |
| OAuth 顯示無權使用或 `access_denied` | 確認登入帳號已加入測試使用者，且符合活動與組織政策 |
| Google 授權後過一段時間失效 | 測試模式的授權及 refresh token 可能受 Google 限制，可重新連結；正式服務需另行完成發布與驗證評估 |
| 列不出 Drive 的所有既有檔案 | 範例要求 `drive.file` 範圍，主要存取透過此應用程式建立或獲授權使用的檔案 |
| 部署成功但第一次回覆較慢 | 最小執行個體為 0 時可能遇到冷啟動；先確認服務已就緒再測試 |
| 更新設定後 OAuth 又失敗 | 檢查重新部署是否把本機 `local.env.yaml` 中的舊值帶回服務 |

查詢服務與日誌：

```bash
gcloud run services describe "$COURSE_SERVICE" \
  --project="$COURSE_PROJECT_ID" \
  --region="$COURSE_REGION"

gcloud run services logs read "$COURSE_SERVICE" \
  --project="$COURSE_PROJECT_ID" \
  --region="$COURSE_REGION" \
  --limit=30
```

## 課後整理

1. 在 LINE 傳送 `/disconnect_drive`，移除範例儲存的 Drive 授權。
2. 依活動安排，決定是否保留 Cloud Run、Firestore 與建置映像。
3. 若確認不再使用 Cloud Run，可刪除自己建立的服務：

```bash
gcloud run services delete "$COURSE_SERVICE" \
  --project="$COURSE_PROJECT_ID" \
  --region="$COURSE_REGION"
```

刪除 Cloud Run 服務不會一併刪除 Firestore、Artifact Registry 映像或 Drive 中的檔案。共用活動專案的資源清理由講師安排。保留服務時請留意活動額度期限、儲存用量與帳務狀態。
