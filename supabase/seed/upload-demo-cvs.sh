#!/usr/bin/env bash
# Ticket 20: upload sample-cv.pdf to resumes/<candidate_id>/demo-cv.pdf for every demo candidate that lacks it.
# Each upload uses that candidate's own session (password grant with the anon key), so no service role key is needed.
# Run once per project after the first seed (README.md); the files survive later wipes and seeds.
#   DATABASE_URL=... NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... supabase/seed/upload-demo-cvs.sh
set -euo pipefail

: "${DATABASE_URL:?}" "${NEXT_PUBLIC_SUPABASE_URL:?}" "${NEXT_PUBLIC_SUPABASE_ANON_KEY:?}"
url=$NEXT_PUBLIC_SUPABASE_URL
key=$NEXT_PUBLIC_SUPABASE_ANON_KEY
cv="$(dirname "$0")/sample-cv.pdf"
password='DemoJob!2026' # seed-demo.sql

missing=$(psql "$DATABASE_URL" -Atq -F ' ' -c "
  select p.id, u.email from public.profiles p join auth.users u on u.id = p.id
  where p.role = 'CANDIDATE' and u.email like '%@demo.jobportal.test'
    and not exists (select 1 from storage.objects o where o.bucket_id = 'resumes' and o.name = p.id || '/demo-cv.pdf')
  order by u.email")

if [ -z "$missing" ]; then
  echo "Mọi ứng viên demo đã có CV. (Chưa seed? Chạy seed-demo.sql trước.)"
  exit 0
fi

failed=0
while read -r id email; do
  object="$id/demo-cv.pdf"
  token=$(curl -sS -X POST "$url/auth/v1/token?grant_type=password" -H "apikey: $key" -H 'Content-Type: application/json' \
    -d "$(jq -n --arg email "$email" --arg password "$password" '{email: $email, password: $password}')" | jq -r '.access_token // empty') || token=''
  if [ -z "$token" ]; then
    echo "LỖI đăng nhập $email" >&2; failed=$((failed + 1)); continue
  fi
  status=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$url/storage/v1/object/resumes/$object" \
    -H "apikey: $key" -H "Authorization: Bearer $token" -H 'Content-Type: application/pdf' --data-binary "@$cv") || status=000
  if [ "$status" = 200 ]; then echo "ok $object ($email)"; else echo "LỖI $status $object ($email)" >&2; failed=$((failed + 1)); fi
done <<< "$missing"

[ "$failed" -eq 0 ] || { echo "$failed CV chưa upload được; chạy lại script để thử tiếp." >&2; exit 1; }
