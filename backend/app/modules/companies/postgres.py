from typing import Any

from app.db import user_tx
from app.modules.companies.domain import Company, CompanySummary

COLS = "id,name,logo_url,about,size,address,website,verified_at is not null"


def company(row):
    return Company(*row[:8])


def summary(row):
    return CompanySummary(company(row[:8]), *row[8:11])


def camel_posting(r):
    return {
        "id": str(r[0]),
        "employerId": str(r[1]),
        "title": r[2],
        "companyName": r[3],
        "companyLogoUrl": r[4],
        "location": r[5],
        "employmentType": r[6],
        "salaryMin": r[7],
        "salaryMax": r[8],
        "applicationDeadline": r[9].isoformat(),
        "createdAt": r[10].isoformat(),
        "industry": r[11],
        "level": r[12],
        "experienceYears": r[13],
        "skills": r[14],
        "companyVerified": r[15],
    }


class PostgresCompanyRepository:
    def __init__(self, claims):
        self.claims = claims

    def get(self, company_id):
        with user_tx(self.claims) as conn:
            row = conn.execute(
                f"select {COLS} from public.companies where id=%s", (company_id,)
            ).fetchone()
        return company(row) if row else None

    def update(self, company_id, changes: dict[str, Any]):
        if not changes:
            return self.get(company_id)
        columns = {"logoUrl": "logo_url"}
        keys = list(changes)
        with user_tx(self.claims) as conn:
            row = conn.execute(
                f"update public.companies set {','.join(columns.get(k, k) + '=%s' for k in keys)} where id=%s returning {COLS}",
                (*[changes[k] for k in keys], company_id),
            ).fetchone()
        return company(row) if row else None

    def list(self, q, offset, limit):
        with user_tx(self.claims) as conn:
            where = " where strpos(search_name, public.f_unaccent(%s)) > 0" if q else ""
            params = (q,) if q else ()
            total = conn.execute(
                "select count(*) from public.company_summaries" + where, params
            ).fetchone()[0]
            rows = conn.execute(
                f"select {COLS},open_postings,rating,review_count from public.company_summaries{where} order by open_postings desc,name,id offset %s limit %s",
                (*params, offset, limit),
            ).fetchall()
        return [summary(r) for r in rows], total

    def open_postings(self, company_id):
        with user_tx(self.claims) as conn:
            rows = conn.execute(
                """select id,employer_id,title,company_name,company_logo_url,location,employment_type,salary_min,salary_max,
                application_deadline,created_at,industry,level,experience_years,skills,company_verified from public.open_job_postings
                where employer_id=%s order by created_at desc""",
                (company_id,),
            ).fetchall()
        return [camel_posting(r) for r in rows]
