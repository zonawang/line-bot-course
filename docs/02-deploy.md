# 🚀 部署 Cloud Run、串接 Google Drive 與 LINE

[回課程首頁](../README.md) · [前一步：Google Cloud 設定](01-google-cloud.md)

本節假設活動專案帳務、必要 API、Firestore 及 IAM 權限已就緒。沿用前一節的 `COURSE_PROJECT_ID`、`COURSE_REGION`、`COURSE_SERVICE` 與 `COURSE_RUNTIME_SA`。

## 1. 取得範例程式

```bash
git clone https://github.com/kkdai/bwai2026-sample.git
cd bwai2026-sample
git switch -c course-2026 10f0bb3d35452db35c192c0ba9e2c63e89777f30
```

本教材以這個已核對的版本說明環境變數與網址。日後若改用上游新版，請重新確認 `main.go` 的讀取名稱與路由。

## 2. 建立 Google OAuth 測試應用程式

這組 OAuth 設定用來讓使用者授權 Bot 存取 Google Drive。

1. 在正確活動專案中開啟 [Google Auth Platform](https://console.cloud.google.com/auth/overview)。
2. 依「品牌資訊／Branding」或初始設定流程，填寫應用程式名稱、支援信箱及聯絡信箱。
3. 個人 Gmail 練習通常使用「外部／External」使用者類型；組織帳號依活動安排。
4. 在「目標對象／Audience」維持測試狀態，加入自己及活動需要的測試使用者。
5. 在「資料存取權／Data Access」確認本範例要求的 Drive 範圍：`https://www.googleapis.com/auth/drive.file`。
6. 到「用戶端／Clients」建立 OAuth Client，應用程式類型選「網頁應用程式／Web application」。
7. 記下 Client ID 與 Client Secret。取得 Cloud Run 網址後，再補上授權重新導向 URI。

初次練習可以使用測試狀態完成授權；正式對外提供服務時，再依 Google 的發布、驗證及資料使用要求辦理。Gemini CLI 的登入另依工具自己的授權流程完成。

## 3. 排除本機金鑰檔案

本課程使用 `local.env.yaml` 設定部署用環境變數。在範例資料夾執行下列操作，避免它進入版本控制或建置內容。

加入 Git 忽略清單：

```bash
cat >> .gitignore <<'EOF'

.env
.env.*
local.env.yaml
client_secret*.json
credentials*.json
EOF
```

建立 `.gcloudignore`：

```bash
cat > .gcloudignore <<'EOF'
.gcloudignore
.git
#!include:.gitignore
.env
.env.*
local.env.yaml
client_secret*.json
credentials*.json
EOF
```

建立 `.dockerignore`，因為範例 Dockerfile 使用 `COPY . .`：

```bash
cat > .dockerignore <<'EOF'
.git
.env
.env.*
local.env.yaml
client_secret*.json
credentials*.json
EOF
```

## 4. 準備部署設定

使用文字編輯器建立 `local.env.yaml`，替換以下佔位值。Project ID 填入活動實際使用的值：

```yaml
GOOGLE_CLOUD_PROJECT: "YOUR_PROJECT_ID"
ChannelSecret: "YOUR_LINE_CHANNEL_SECRET"
ChannelAccessToken: "YOUR_LINE_CHANNEL_ACCESS_TOKEN"
GOOGLE_CLIENT_ID: "YOUR_GOOGLE_OAUTH_CLIENT_ID"
GOOGLE_CLIENT_SECRET: "YOUR_GOOGLE_OAUTH_CLIENT_SECRET"
GOOGLE_REDIRECT_URL: ""
```

| 設定 | 用途 |
| --- | --- |
| `GOOGLE_CLOUD_PROJECT` | 範例啟動時必須提供，指定 Firestore 所屬專案 |
| `ChannelSecret` | LINE Webhook 簽章驗證，大小寫必須一致 |
| `ChannelAccessToken` | LINE 回覆及取得檔案內容 |
| `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET` | Google Drive 的 OAuth 網頁用戶端 |
| `GOOGLE_REDIRECT_URL` | 部署取得網址後填入 `/oauth/callback` |

此範例讀取的是 `ChannelSecret` 與 `ChannelAccessToken`。若只設定其他命名，例如 `LINE_CHANNEL_SECRET`，程式不會自動對應。

這堂課以 Cloud Run 環境變數示範；正式服務可改用 Secret Manager 管理秘密值。檔案只保留在自己的環境，不要提交到 GitHub 或分享畫面中的金鑰內容。

## 5. 部署至 Cloud Run

確認現在位於範例的 `bwai2026-sample` 資料夾，並檢查上傳清單：

```bash
gcloud meta list-files-for-upload
```

清單中不應包含 `local.env.yaml`、`.env` 或 OAuth 憑證檔。

部署：

```bash
gcloud run deploy "$COURSE_SERVICE" \
  --source=. \
  --project="$COURSE_PROJECT_ID" \
  --region="$COURSE_REGION" \
  --service-account="$COURSE_RUNTIME_SA" \
  --env-vars-file=local.env.yaml \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=1 \
  --memory=512Mi \
  --timeout=60
```

依提示允許建立來源部署需要的建置儲存庫。Cloud Build 會使用上游 Dockerfile 建置，不需本機安裝 Go 或 Docker。

`--allow-unauthenticated` 讓 LINE 可以呼叫公開 Webhook；應用程式仍會驗證 LINE 簽章。活動組織政策若禁止公開服務，需要工作人員協助調整允許的部署方式。

取得服務網址：

```bash
export COURSE_SERVICE_URL="$(gcloud run services describe "$COURSE_SERVICE" \
  --project="$COURSE_PROJECT_ID" \
  --region="$COURSE_REGION" \
  --format='value(status.url)')"

echo "$COURSE_SERVICE_URL"
```

### 使用 Gemini CLI 協助操作

也可以在範例資料夾啟動 `gemini`，提供以下工作描述。把專案資訊換成活動實際值：

```text
請協助把目前資料夾的 LINE Bot 範例部署至 Google Cloud Run。
專案是 YOUR_PROJECT_ID，區域 asia-east1，服務名稱 linebot-course。
先讀 main.go、Dockerfile 與忽略清單，確認必要環境變數、執行身分與實際 Webhook 路徑。
金鑰已放在本機 local.env.yaml，請直接使用此檔部署，不要在輸出中顯示內容。
請先檢查帳務、API 與權限；資訊不足時詢問我，完成後回報服務網址和驗證結果。
```

## 6. 補上 OAuth 重新導向網址

1. 回到剛才建立的 OAuth 網頁用戶端。
2. 在「已授權的重新導向 URI」加入 **Cloud Run 服務網址 + `/oauth/callback`**，例如：

```text
https://你的服務網址.run.app/oauth/callback
```

3. 儲存設定，並更新 Cloud Run：

```bash
gcloud run services update "$COURSE_SERVICE" \
  --project="$COURSE_PROJECT_ID" \
  --region="$COURSE_REGION" \
  --update-env-vars="GOOGLE_REDIRECT_URL=${COURSE_SERVICE_URL}/oauth/callback"
```

也把同一個網址填回本機 `local.env.yaml` 的 `GOOGLE_REDIRECT_URL`，避免下次使用整份檔案部署時覆蓋回空值。

## 7. 設定 LINE Webhook

| 用途 | 本教材指定版本的網址 |
| --- | --- |
| LINE Webhook | Cloud Run 服務網址加 `/` |
| Google OAuth 重新導向 | Cloud Run 服務網址加 `/oauth/callback` |

1. 開啟 [LINE Developers Console](https://developers.line.biz/console/)，進入自己的 Messaging API Channel。
2. Webhook URL 填入剛才的服務網址，結尾加 `/`。
3. 按 **Verify**，確認顯示 **Success**。
4. 開啟 **Use webhook**。
5. 確認官方帳號後台已關閉自動回應與歡迎訊息。

本版本在 `main.go` 註冊根路徑 `/`，並拒絕其他 Webhook 路徑，因此這裡應使用根路徑。直接用瀏覽器 GET 服務網址，可能出現簽章錯誤；請以 LINE Verify 和實際聊天驗收。

## 8. 實際驗收

1. 掃描 Channel 的 QR code，把官方帳號加為好友。
2. 傳送文字，確認收到指令說明。
3. 傳送 `/connect_drive`，點選 Bot 提供的 Google 授權連結。
4. 使用已加入測試使用者的 Google 帳號完成授權。
5. 傳送一張測試圖片，確認出現在自己的 Google Drive。
6. 傳送 `/recent_files`，確認可查看最近上傳的檔案。
7. 測試 `/search_files 關鍵字` 或 `/q 關鍵字`。
8. 測試結束可用 `/disconnect_drive` 解除 Drive 連結。

驗收完成後，才算 LINE、Cloud Run、Firestore 與 Google OAuth 整條流程已接通。活動尚未開放時，可先準備上述操作，完整雲端部署與實機驗收需等到有可用的活動專案。
