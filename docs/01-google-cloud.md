# 活動專案與帳務說明

[回課程首頁](../README.md)

本頁供遇到專案問題時查閱。課堂操作請依首頁進行。

## 活動入口

**[g.dev/credits/adxtw-bdc-linebot-nov26](https://g.dev/credits/adxtw-bdc-linebot-nov26)**

活動尚未開放時，先完成 LINE 官方帳號準備。領取頁會要求登入 Google Developer Program；請使用同一個帳號領取、開啟 Console 及操作 Cloud Shell。

目前尚未確認活動實際提供的金額、期限、專案形式與權限，請以活動開放後的頁面及現場說明為準。

| 當天看到的結果 | 怎麼處理 |
| --- | --- |
| 取得現成活動專案 | 在 Console 選擇該專案，使用其 Project ID |
| 取得活動額度及帳務帳戶 | 依工作人員指示建立或選擇專案，連結活動帳務帳戶 |
| 尚未開放、資格不符或領取失敗 | 請工作人員確認活動狀態與登入帳號 |
| 要求填寫個人付款方式 | 先請工作人員確認活動的帳務安排 |

## 確認專案與帳務

Cloud Shell 中可執行：

```bash
gcloud auth list
gcloud config get-value project
gcloud billing projects describe "$COURSE_PROJECT_ID"
```

確認登入帳號、Project ID 與活動資訊一致。若能查閱帳務，預期看到 `billingEnabled: true`。查閱權限不足或帳務尚未連結時，請工作人員協助。

如果活動要求自行建立專案，可在 Console 上方專案選單選「新增專案」。Project ID 與專案顯示名稱不同，指令需要的是 Project ID。

## 課程開通哪些服務

`setup-cloud.sh` 會開通 Cloud Run、Cloud Build、Artifact Registry 與 IAM，準備程式的建置及執行身分。Bot 執行時只透過 HTTPS 回覆 LINE 訊息。

開通 API、建立服務帳戶與設定權限，需要活動專案授予對應管理權限。講師可在課前或專案開放後統一準備，學生直接進入金鑰設定與部署。
