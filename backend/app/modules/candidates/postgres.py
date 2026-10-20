from datetime import UTC

from app.db import user_tx
from app.modules.candidates.domain import CandidateProfile

PROFILE_COLS = "id,full_name,phone,headline,skills,experience,education,open_to_work,location,experience_years"


def profile(row):
    return CandidateProfile(
        str(row[0]), row[1], row[2], row[3], row[4] or [], *row[5:]
    )


def posting(row):
    return {
        "id": str(row[0]),
        "employerId": str(row[1]),
        "title": row[2],
        "companyName": row[3],
        "companyLogoUrl": row[4],
        "location": row[5],
        "employmentType": row[6],
        "salaryMin": row[7],
        "salaryMax": row[8],
        "applicationDeadline": row[9].isoformat(),
        "createdAt": row[10].isoformat(),
        "industry": row[11],
        "level": row[12],
        "experienceYears": row[13],
        "skills": row[14] or [],
        "companyVerified": row[15],
    }


class PostgresCandidateRepository:
    def __init__(self, claims):
        self.claims = claims

    def profile(self, user_id):
        with user_tx(self.claims) as conn:
            row = conn.execute(
                f"select {PROFILE_COLS} from public.profiles where id=%s and role='CANDIDATE'",
                (user_id,),
            ).fetchone()
        return profile(row) if row else None

    def update_profile(self, user_id, values):
        if not values:
            return self.profile(user_id)
        keys = list(values)
        with user_tx(self.claims) as conn:
            row = conn.execute(
                f"update public.profiles set {','.join(k + '=%s' for k in keys)} where id=%s and role='CANDIDATE' returning {PROFILE_COLS}",
                (*[values[k] for k in keys], user_id),
            ).fetchone()
        return profile(row) if row else None

    def applicant_profile(self, application_id):
        with user_tx(self.claims) as conn:
            row = conn.execute(
                "select candidate_id,candidate_name,candidate_phone,candidate_headline,candidate_skills,candidate_experience,candidate_education,candidate_open_to_work,candidate_location,candidate_experience_years from public.employer_application_summaries where id=%s",
                (application_id,),
            ).fetchone()
        return profile(row) if row else None

    def toggle_saved(self, user_id, posting_id):
        with user_tx(self.claims) as conn:
            deleted = conn.execute(
                "delete from public.saved_postings where candidate_id=%s and posting_id=%s returning posting_id",
                (user_id, posting_id),
            ).fetchone()
            if deleted:
                return False
            row = conn.execute(
                """insert into public.saved_postings(candidate_id,posting_id)
                   select %s,%s where exists(select 1 from public.job_postings where id=%s and status in ('PUBLISHED','CLOSED'))
                   on conflict do nothing returning posting_id""",
                (user_id, posting_id, posting_id),
            ).fetchone()
            if row:
                return True
            exists = conn.execute(
                "select 1 from public.saved_postings where candidate_id=%s and posting_id=%s",
                (user_id, posting_id),
            ).fetchone()
            return True if exists else None

    def saved(self, user_id):
        with user_tx(self.claims) as conn:
            rows = conn.execute(
                """select s.candidate_id,s.saved_at,s.id,s.employer_id,s.title,s.company_name,s.company_logo_url,
                          s.location,s.employment_type,s.salary_min,s.salary_max,s.application_deadline,s.created_at,
                          s.industry,s.level,s.experience_years,s.skills,s.status,s.company_verified
                   from public.saved_posting_summaries s
                   where s.candidate_id=%s order by s.saved_at desc""",
                (user_id,),
            ).fetchall()
        from datetime import datetime

        now = datetime.now(UTC)
        result = []
        for r in rows:
            item = posting((*r[2:17], r[18]))
            item["savedAt"] = r[1].isoformat()
            item["isOpen"] = r[17] == "PUBLISHED" and r[11] >= now
            result.append(item)
        return result

    def saved_ids(self, user_id):
        with user_tx(self.claims) as conn:
            rows = conn.execute(
                "select posting_id from public.saved_postings where candidate_id=%s order by created_at desc",
                (user_id,),
            ).fetchall()
        return [str(r[0]) for r in rows]
