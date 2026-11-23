#!/usr/bin/env bash
set -euo pipefail

course_project_id="${1:-}"
course_service="${2:-linebot-course}"
course_region="${3:-asia-east1}"
course_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$course_root"

if [[ ! "$course_project_id" =~ ^[a-z][a-z0-9-]{4,28}[a-z0-9]$ ]]; then
  echo '用法：bash scripts/deploy.sh 你的實際ProjectID [服務名稱] [區域]' >&2
  exit 1
fi
if [[ ! "$course_service" =~ ^[a-z]([a-z0-9-]{0,47}[a-z0-9])?$ ]]; then
  echo '服務名稱請使用小寫英文、數字及連字號，最長 49 個字元。' >&2
  exit 1
fi
if [[ ! -f local.env.yaml ]]; then
  echo '請先執行 cp local.env.example.yaml local.env.yaml，填入兩個 LINE 金鑰。' >&2
  exit 1
fi
if grep -Eq 'YOUR_LINE_CHANNEL_SECRET|YOUR_LINE_CHANNEL_ACCESS_TOKEN' local.env.yaml; then
  echo '請先將 local.env.yaml 裡的佔位文字改成自己的 LINE 金鑰。' >&2
  exit 1
fi

gcloud run deploy "$course_service" \
  --source=. \
  --project="$course_project_id" \
  --region="$course_region" \
  --service-account="linebot-runtime@${course_project_id}.iam.gserviceaccount.com" \
  --env-vars-file=local.env.yaml \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=1 \
  --memory=256Mi \
  --timeout=30 \
  --quiet

course_url="$(gcloud run services describe "$course_service" \
  --project="$course_project_id" --region="$course_region" --format='value(status.url)')"
echo "健康檢查：${course_url}/health"
echo "LINE Webhook URL：${course_url}/webhook"
