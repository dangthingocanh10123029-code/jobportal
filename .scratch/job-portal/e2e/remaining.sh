#!/bin/zsh
# Remaining manual checks: concurrent status change, orphan resume cleanup via Storage API, security advisor.
# Needs: seed.sql applied (e2e users). Cleans up via cleanup.sql afterwards.
set -u
E=${0:a:h}
PG="$1"
# Project URL + publishable key from the repo's .env.local (works for whichever Supabase project is configured).
ENVF="${ENV_FILE:-/Users/ccm/Documents/Đồ án của Ánh/jobportal/.env.local}"
U=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$ENVF" | cut -d= -f2-)
K=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$ENVF" | cut -d= -f2-)
REF=${U#https://}; REF=${REF%%.*}
C=e2e00000-0000-4000-8000-0000000000c1
EMP=e2e00000-0000-4000-8000-0000000000e1
P=e2e00000-0000-4000-8000-0000000000a1
APP=e2e00000-0000-4000-8000-0000000000b1
q() { PGCONNECT_TIMEOUT=15 psql "$PG" -q -At -v ON_ERROR_STOP=1 -c "$1"; }

echo "== 1. Hai request đổi trạng thái đồng thời"
q "insert into job_postings (id, employer_id, title, description, location, employment_type, application_deadline, status)
   values ('$P', '$EMP', 'Tin E2E đồng thời', 'Mô tả đủ dài cho tin kiểm tra đồng thời', 'Hà Nội', 'FULL_TIME', now() + interval '7 days', 'PUBLISHED');
   insert into applications (id, job_posting_id, candidate_id, resume_path) values ('$APP', '$P', '$C', '$C/none.pdf');
   insert into application_status_changes (application_id, from_status, to_status, changed_by, changed_by_role) values ('$APP', null, 'SUBMITTED', '$C', 'CANDIDATE');"
as() { echo "select set_config('request.jwt.claims', json_build_object('sub','$1','role','authenticated')::text, true); set local role authenticated;"; }
# A holds the row lock for 3s; B starts 1s later and must wait, then see A's result.
(PGCONNECT_TIMEOUT=15 psql "$PG" -q -At -c "begin; $(as $C) select 'A rút đơn: ' || (change_application_status('$APP','WITHDRAWN')).status; select pg_sleep(3); commit;" 2>&1 | sed 's/^/   /') &
sleep 1
(PGCONNECT_TIMEOUT=15 psql "$PG" -q -At -c "begin; $(as $EMP) select 'B từ chối: ' || (change_application_status('$APP','REJECTED')).status; commit;" 2>&1 | sed 's/^psql:.*ERROR: */   B từ chối bị chặn: /' | sed 's/^B/   B/') &
wait
q "select '   Kết quả: status=' || status || ', số Status Change=' || (select count(*) from application_status_changes where application_id='$APP') from applications where id='$APP';"

echo "== 2. Dọn file CV thừa qua Storage API"
TOKEN=$(curl -s "$U/auth/v1/token?grant_type=password" -H "apikey: $K" -H "Content-Type: application/json" \
  -d '{"email":"e2e.candidate@jobportal.test","password":"E2eTest!2026"}' | python3 -c 'import json,sys;print(json.load(sys.stdin)["access_token"])')
printf '%%PDF-1.4\n%%EOF\n' > $E/orphan.pdf
up() { curl -s -o /dev/null -w "%{http_code}" -X POST "$U/storage/v1/object/resumes/$1" -H "apikey: $K" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/pdf" --data-binary @$E/orphan.pdf; }
del() { curl -s -X DELETE "$U/storage/v1/object/resumes" -H "apikey: $K" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"prefixes\":[\"$1\"]}"; }
echo "   upload file mồ côi: HTTP $(up $C/orphan.pdf)"
echo "   xóa file mồ côi: $(del $C/orphan.pdf | python3 -c 'import json,sys;d=json.load(sys.stdin);print(f"{len(d)} file bị xóa" if isinstance(d,list) else d)')"
q "select '   còn trong bucket: ' || count(*) from storage.objects where name = '$C/orphan.pdf';"
echo "   upload CV rồi gắn vào đơn: HTTP $(up $C/attached.pdf)"
q "insert into job_postings (id, employer_id, title, description, location, employment_type, application_deadline, status)
   values ('e2e00000-0000-4000-8000-0000000000a2', '$EMP', 'Tin E2E CV gắn đơn', 'Mô tả đủ dài cho tin kiểm tra CV gắn đơn', 'Hà Nội', 'FULL_TIME', now() + interval '7 days', 'PUBLISHED');
   insert into applications (job_posting_id, candidate_id, resume_path) values ('e2e00000-0000-4000-8000-0000000000a2', '$C', '$C/attached.pdf');"
echo "   xóa CV đã gắn đơn: $(del $C/attached.pdf | python3 -c 'import json,sys;d=json.load(sys.stdin);print(f"{len(d)} file bị xóa" if isinstance(d,list) else d)')"
q "select '   còn trong bucket: ' || count(*) from storage.objects where name = '$C/attached.pdf';"

echo "== 3. Supabase security advisor"
AT=$(security find-generic-password -s "Supabase CLI" -w 2>/dev/null); case "$AT" in go-keyring-base64:*) AT=$(echo "${AT#go-keyring-base64:}" | base64 -d);; esac
curl -s "https://api.supabase.com/v1/projects/$REF/advisors/security" -H "Authorization: Bearer $AT" | python3 -c '
import json,sys
d=json.load(sys.stdin); lints=d.get("lints",d if isinstance(d,list) else [])
if not lints: print("   ", str(d)[:300])
for l in lints: print(f"   [{l.get(\"level\")}] {l.get(\"name\")}: {l.get(\"detail\",\"\")[:160]}")'
