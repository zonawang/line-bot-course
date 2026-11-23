# ☁️ Google Cloud：活動領取、專案與服務開通

[回課程首頁](../README.md) · [下一步：部署與測試](02-deploy.md)

## 1. 從活動入口開始

活動當天開啟：

**[g.dev/credits/adxtw-bdc-linebot-nov26](https://g.dev/credits/adxtw-bdc-linebot-nov26)**

1. 依現場通知的開放時間進入，以活動指定的 Google 帳號登入。
2. 完成畫面上的資格、條款與領取流程。
3. 依領取結果，記下活動提供的 Project ID，或額度所屬的帳務帳戶。
4. 開啟 [Google Cloud Console](https://console.cloud.google.com/)，確認右上角帳號相同。

截至教材核對時，公開連結會導向 Google Developer Program 的登入領取頁；尚未確認活動實際提供的金額、期限、專案形式與服務限制。本教材不預設連結一定會自動建立專案。

| 當天領取結果 | 接下來怎麼做 |
| --- | --- |
| 取得現成活動專案 | 使用該專案，依現場提供的權限操作 |
| 取得可用的活動額度與帳務帳戶 | 依現場安排建立或選擇專案，連結領到額度的帳務帳戶 |
| 顯示尚未開放、資格不符或領取失敗 | 請現場工作人員確認活動及登入帳號 |
| 要求設定個人付款方式 | 先請工作人員確認本活動的帳務流程，再決定如何操作 |

若活動要求自行建立專案，在 Console 上方專案選單選「新增專案」，輸入名稱，並確認使用活動指定的帳務帳戶。Project ID 是指令需要的值，和顯示名稱不同。

## 2. 初始化 gcloud

在自己的終端機執行：

```bash
gcloud init
```

依畫面選擇登入帳號及活動專案。已有其他設定時，可以建立新的 configuration 來管理這堂課的專案。

接著設定本課程共用變數。將 `YOUR_PROJECT_ID` 改為活動實際使用的 Project ID：

```bash
export COURSE_PROJECT_ID="YOUR_PROJECT_ID"
export COURSE_REGION="asia-east1"
export COURSE_SERVICE="linebot-course"

gcloud config set project "$COURSE_PROJECT_ID"
gcloud config set run/region "$COURSE_REGION"
gcloud auth list
gcloud config list
```

以下指令使用 Bash 語法，適用於 macOS、Linux、Cloud Shell 或 Windows 的 Bash／WSL。PowerShell 使用者可切換到 Cloud Shell，或自行換成對應的環境變數語法。新開終端機後需要重新設定這三個變數。

`asia-east1` 是台灣區域；若活動指定其他可用區域，請統一修改 `COURSE_REGION`。不要使用講義以外同學或講師的個人測試專案。

## 3. 確認帳務已可用

```bash
gcloud billing projects describe "$COURSE_PROJECT_ID"
```

預期看到：

```yaml
billingEnabled: true
```

若是 `false`，開啟 Console →「帳單」，確認專案已連結可用的活動帳務帳戶。若帳務帳戶是關閉狀態，請活動管理員協助。

有權限查看帳務、且現場明確指定帳務帳戶時，可用下列方式連結；將佔位值換成活動實際提供的 ID：

```bash
gcloud billing projects link "$COURSE_PROJECT_ID" \
  --billing-account="YOUR_EVENT_BILLING_ACCOUNT_ID"
```

需要具備專案與帳務帳戶的對應連結權限。額度的服務範圍、餘額與有效期限依活動條件計算；有設定預算提醒也不代表有費用硬上限。

## 4. 本機程式的 ADC 授權

在本機執行 Google Cloud 用戶端程式時，依教材完成 Application Default Credentials（ADC）：

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project "$COURSE_PROJECT_ID"
```

gcloud CLI 使用自己的登入憑證；ADC 提供給本機用戶端程式，兩者用途不同。Cloud Shell 通常已有環境提供的認證；若活動採 Cloud Shell，依現場指示確認是否還需要本機 ADC 登入。

部署到 Cloud Run 後，程式改用執行服務帳戶取得權限，無須上傳自己的 ADC 檔案。

## 5. 開通 API

確認帳號、Project ID 與帳務正確後執行：

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  artifactregistry.googleapis.com \
  drive.googleapis.com \
  iam.googleapis.com \
  --project="$COURSE_PROJECT_ID"
```

| API | 本課程用途 |
| --- | --- |
| Cloud Run | 執行 Bot HTTP 服務 |
| Cloud Build | 從原始碼建置容器 |
| Firestore | 儲存 Drive OAuth 權杖及授權狀態 |
| Artifact Registry | 儲存建置產生的容器映像 |
| Google Drive | 存取使用者授權給 Bot 管理的檔案 |
| IAM | 建立及管理執行服務帳戶 |

檢查已啟用服務：

```bash
gcloud services list --enabled --project="$COURSE_PROJECT_ID"
```

若出現 `UREQ_PROJECT_BILLING_NOT_FOUND`，先回到帳務步驟。若是 `PERMISSION_DENIED`，請講師檢查活動專案的 Service Usage 權限。

## 6. 檢查與建立 Firestore

先檢查活動專案是否已經有資料庫：

```bash
gcloud firestore databases list --project="$COURSE_PROJECT_ID"
```

若沒有 `(default)` 資料庫，且活動允許自行建立，再執行：

```bash
gcloud firestore databases create \
  --project="$COURSE_PROJECT_ID" \
  --location="$COURSE_REGION" \
  --type=firestore-native
```

若已有 `(default)`，確認模式後沿用即可。資料庫建立後無法直接變更位置；此範例使用 Native 模式及預設資料庫。

## 7. 設定執行與建置權限

以下 IAM 設定需要活動專案授予相應管理權限。若已由講師預先設定，直接使用指定的服務帳戶；遇到權限不足時，交由管理員操作。

### Bot 的執行服務帳戶

```bash
export COURSE_RUNTIME_SA="linebot-runtime@${COURSE_PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create linebot-runtime \
  --display-name="LINE Bot runtime" \
  --project="$COURSE_PROJECT_ID"

gcloud projects add-iam-policy-binding "$COURSE_PROJECT_ID" \
  --member="serviceAccount:${COURSE_RUNTIME_SA}" \
  --role="roles/datastore.user"
```

服務帳戶已存在時，沿用即可。`roles/datastore.user` 提供範例讀寫 Firestore 所需權限。

### 從原始碼建置的服務帳戶

Google 目前的預設來源部署流程使用 Compute Engine 預設服務帳戶建置；若活動改用其他建置身分，請依現場安排調整。

```bash
export COURSE_PROJECT_NUMBER="$(gcloud projects describe "$COURSE_PROJECT_ID" --format='value(projectNumber)')"
export COURSE_BUILD_SA="${COURSE_PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding "$COURSE_PROJECT_ID" \
  --member="serviceAccount:${COURSE_BUILD_SA}" \
  --role="roles/run.builder"
```

部署者也需要 Cloud Run 來源部署、Service Usage，以及使用執行服務帳戶的權限；設定公開服務還需要對應的 IAM 政策權限。角色名稱與差異見[問題排查](03-troubleshooting.md)。

完成後繼續：[部署與測試](02-deploy.md)。
