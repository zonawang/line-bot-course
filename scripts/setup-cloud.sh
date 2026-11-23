#!/usr/bin/env bash
set -euo pipefail

course_project_id="${1:-}"
if [[ ! "$course_project_id" =~ ^[a-z][a-z0-9-]{4,28}[a-z0-9]$ ]]; then
  echo '用法：bash scripts/setup-cloud.sh 你的實際ProjectID' >&2
  exit 1
fi

echo '1/3 開通部署需要的服務…'
gcloud services enable \
  run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com iam.googleapis.com \
  --project="$course_project_id" --quiet

echo '2/3 準備 Bot 執行身分…'
course_runtime_sa="linebot-runtime@${course_project_id}.iam.gserviceaccount.com"
course_existing_sa="$(gcloud iam service-accounts list --project="$course_project_id" \
  --filter="email=${course_runtime_sa}" --format='value(email)')"
if [[ -z "$course_existing_sa" ]]; then
  gcloud iam service-accounts create linebot-runtime --display-name='LINE Bot runtime' \
    --project="$course_project_id" --quiet
fi

echo '3/3 準備來源建置權限…'
course_project_number="$(gcloud projects describe "$course_project_id" --format='value(projectNumber)')"
gcloud projects add-iam-policy-binding "$course_project_id" \
  --member="serviceAccount:${course_project_number}-compute@developer.gserviceaccount.com" \
  --role=roles/run.builder --condition=None --quiet >/dev/null

echo '雲端準備完成，接著填寫 local.env.yaml，再執行部署腳本。'
