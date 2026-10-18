#!/bin/zsh
# Remove every E2E fixture without orphaning files: detach CVs (delete applications), delete the files through
# the Storage API as the e2e candidate (so the bucket object goes too), then delete the users.
# usage: cleanup.sh "<session pooler URL>"
set -u
PG="$1"
# Project URL + publishable key from the repo's .env.local (works for whichever Supabase project is configured).
ENVF="${ENV_FILE:-/Users/ccm/Documents/Đồ án của Ánh/jobportal/.env.local}"
U=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$ENVF" | cut -d= -f2-)
K=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$ENVF" | cut -d= -f2-)
REF=${U#https://}; REF=${REF%%.*}
C=e2e00000-0000-4000-8000-0000000000c1
q() { PGCONNECT_TIMEOUT=15 psql "$PG" -q -At -c "$1"; }

q "delete from public.applications where candidate_id = '$C'
   or job_posting_id in (select id from public.job_postings where employer_id = 'e2e00000-0000-4000-8000-0000000000e1');" >/dev/null

files=$(q "select coalesce(json_agg(name), '[]') from storage.objects where bucket_id = 'resumes' and name like '$C/%';")
if [ "$files" != "[]" ]; then
  token=$(curl -s "$U/auth/v1/token?grant_type=password" -H "apikey: $K" -H "Content-Type: application/json" \
    -d '{"email":"e2e.candidate@jobportal.test","password":"E2eTest!2026"}' | python3 -c 'import json,sys;print(json.load(sys.stdin).get("access_token",""))')
  curl -s -o /dev/null -X DELETE "$U/storage/v1/object/resumes" -H "apikey: $K" -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" -d "{\"prefixes\":$files}"
fi

logos=$(q "select coalesce(json_agg(name), '[]') from storage.objects where bucket_id = 'company-logos' and name like 'e2e00000-0000-4000-8000-0000000000e1/%';")
if [ "$logos" != "[]" ]; then
  etoken=$(curl -s "$U/auth/v1/token?grant_type=password" -H "apikey: $K" -H "Content-Type: application/json" \
    -d '{"email":"e2e.employer@jobportal.test","password":"E2eTest!2026"}' | python3 -c 'import json,sys;print(json.load(sys.stdin).get("access_token",""))')
  curl -s -o /dev/null -X DELETE "$U/storage/v1/object/company-logos" -H "apikey: $K" -H "Authorization: Bearer $etoken" \
    -H "Content-Type: application/json" -d "{\"prefixes\":$logos}"
fi

q "delete from auth.users where email like 'e2e.%@jobportal.test';" >/dev/null
q "select 'left: users=' || (select count(*) from auth.users where email like 'e2e.%')
  || ' postings=' || (select count(*) from public.job_postings where employer_id = 'e2e00000-0000-4000-8000-0000000000e1')
  || ' resumes=' || (select count(*) from storage.objects where bucket_id = 'resumes' and name like 'e2e00000-%')
  || ' logos=' || (select count(*) from storage.objects where bucket_id = 'company-logos' and name like 'e2e00000-%');"
