# Spec: VibeCoding Job Portal v1

**Status:** ready-for-agent

## Problem Statement

Candidates have no single place to find open positions, apply with their Resume, and follow what happens to their Application. Employers have no simple way to publish Job Postings and move incoming Applications through a review process.

## Solution

A web app with two roles. An Employer creates Job Postings, publishes them immediately, and reviews Applications through a fixed Application Status flow. A Candidate searches open postings with accent-insensitive keywords and filters, applies once per posting with a PDF Resume, and sees the current status and Status Change history of every Application.

## User Stories

### Accounts
1. As a visitor, I want to sign up with email and password and choose Candidate or Employer, so that I get the right features.
2. As a user, I want to sign in and sign out, so that my data stays private.
2a. As a visitor, I want to confirm my email by entering the OTP code sent to me after sign-up (and request a new code), so that only real email owners get accounts.
3. As an Employer, I want to set my company name, so that Candidates know who is hiring.
4. As a Candidate, I want to set my full name and phone number, so that Employers can contact me.
5. As a user, I want pages for the other role to be blocked for me, so that I cannot reach actions I am not allowed to do.

### Job Posting
6. As an Employer, I want to create a Job Posting as DRAFT with title, description, location, employment type, optional salary range, and Application Deadline, so that I can prepare it before publishing.
7. As an Employer, I want to edit a DRAFT or PUBLISHED posting, so that I can fix mistakes or extend the deadline.
8. As an Employer, I want to publish a DRAFT posting, so that Candidates can see it right away.
9. As an Employer, I want to close a PUBLISHED posting, so that it stops accepting Applications before the deadline.
10. As an Employer, I want to see all my postings with their status (including Expired), so that I can manage them.
11. As an Employer, I want my DRAFT postings hidden from everyone else, so that unfinished work is not public.
12. As an Employer, I want a deadline in the past rejected when publishing, so that I do not publish an already Expired Posting.

### Job Search
13. As a Candidate or visitor, I want to see open postings (PUBLISHED and not expired), newest first, so that I only see jobs I can apply to.
14. As a Candidate, I want to search by keyword without typing Vietnamese accents ("ke toan" finds "Kế toán"), so that search is forgiving.
15. As a Candidate, I want to filter by location, employment type, and minimum salary, so that I see relevant jobs.
16. As a Candidate, I want results paginated, so that pages load fast.
17. As a Candidate, I want to open a posting detail page with company name and full description, so that I can decide to apply.
18. As a visitor, I want an Expired or CLOSED posting's detail page to say it no longer accepts Applications, so that old links are not confusing.

### Application
19. As a Candidate, I want to apply to an open posting by uploading a PDF Resume (max 5 MB), so that the Employer can review me.
20. As a Candidate, I want a clear error when I apply twice to the same posting, so that I know I already applied.
21. As a Candidate, I want applying to an Expired, CLOSED, or DRAFT posting to be refused, so that rules are enforced.
22. As a Candidate, I want to see all my Applications with posting title, company, and current Application Status, so that I can follow progress.
23. As a Candidate, I want to see the Status Change history of an Application, so that I know when each step happened.
24. As a Candidate, I want to withdraw an Application that is not yet HIRED, REJECTED, or WITHDRAWN, so that I can drop out.
25. As an Employer, I want to see Applications for each of my postings, so that I can review them.
26. As an Employer, I want to download a Candidate's Resume, so that I can evaluate them.
27. As an Employer, I want to move an Application forward one step (SUBMITTED → REVIEWING → INTERVIEWING → OFFERED → HIRED), so that I track the hiring process.
28. As an Employer, I want to reject an Application at any non-final step, so that I can close it.
29. As an Employer, I want invalid transitions refused, so that the history stays consistent.
30. As an Employer, I want never to see Applications or Resumes for other Employers' postings, so that candidate data stays private.

## Implementation Decisions

### Modules (Deep Modules, one seam each)
- **Job Posting module** — `JobPostingService` behind `IJobPostingRepository`. Owns posting lifecycle and search. Public surface: create draft, update, publish, close, list mine, search open postings, get detail.
- **Application module** — `ApplicationService` behind `IApplicationRepository`. Owns the Application Status state machine. Public surface: submit, withdraw, change status (Employer), list for candidate, list for posting, get history.
- Each repository has an InMemory adapter (tests) and a Supabase adapter (production).
- Accounts use Supabase Auth directly plus a `profiles` table; no domain module needed.
- Server Actions validate input with Zod, build services server-side from the signed-in session, and return `{ success, data | error }`. The actor (user id + role) always comes from the session, never from client input.

### Posting Status (stored) and Expired (derived, ADR-0001)
```
DRAFT --publish--> PUBLISHED --close--> CLOSED
Expired = PUBLISHED AND application_deadline < now()
Editable: DRAFT, PUBLISHED.  CLOSED is final.
```

### Application Status state machine
```
SUBMITTED    -> REVIEWING | REJECTED | WITHDRAWN
REVIEWING    -> INTERVIEWING | REJECTED | WITHDRAWN
INTERVIEWING -> OFFERED | REJECTED | WITHDRAWN
OFFERED      -> HIRED | REJECTED | WITHDRAWN
HIRED, REJECTED, WITHDRAWN: final
Employer may make every transition except WITHDRAWN. Candidate may only make WITHDRAWN.
```
The transition table lives in the domain and is mirrored by a database function so the rule holds even outside the app.

### Schema (Supabase Postgres)
- `profiles`: id (= auth user id), role CANDIDATE|EMPLOYER, full_name, phone, company_name.
- `job_postings`: employer_id, title, description, location, employment_type FULL_TIME|PART_TIME|INTERNSHIP|CONTRACT, salary_min, salary_max (nullable = negotiable, `salary_min <= salary_max`), application_deadline timestamptz, status DRAFT|PUBLISHED|CLOSED, timestamps.
- `applications`: job_posting_id, candidate_id, resume_path, status, timestamps, `UNIQUE (job_posting_id, candidate_id)` (ADR-0002).
- `application_status_changes`: application_id, from_status (null for first), to_status, changed_by, changed_at. Append-only (no UPDATE/DELETE policy).
- Extension `unaccent`; an immutable unaccent wrapper used for search on title and description.
- Submit and every status change are single RPC calls that write `applications` and `application_status_changes` in one transaction, lock the application row (`SELECT ... FOR UPDATE`) for status changes, and check posting openness with `now()` on the database.

### Row Level Security
- `profiles`: owner reads/updates own row; company_name readable publicly for posting display.
- `job_postings`: public reads PUBLISHED; Employer reads/writes own rows of any status.
- `applications`, `application_status_changes`: Candidate reads own; Employer reads those on own postings. Writes only via RPC (security definer with explicit actor checks).
- Storage bucket `resumes` is private. Candidate uploads under a folder named by their user id. Employer downloads through a short-lived signed URL created server-side after checking the Application belongs to one of their postings.

### Search
- Accent-insensitive `ILIKE` on unaccented title and description; accent-insensitive contains match on location (`ILIKE %…%`); employment type match; minimum salary matches postings whose `salary_max` is null or ≥ requested amount; only open postings; newest first; page size 20.

## Testing Decisions
- Test external behaviour through the service interfaces only (`JobPostingService`, `ApplicationService`), never adapter internals.
- Unit tests run against InMemory adapters with Vitest; use `fromPartial` from `@total-typescript/shoehorn` for fixtures.
- Inject the clock into services so Expired behaviour is tested deterministically.
- Must-have cases: every allowed and refused Application Status transition per actor; duplicate application refused; applying to DRAFT/CLOSED/Expired refused; DRAFT hidden from search; accent-insensitive keyword; salary filter with negotiable salary; publish with past deadline refused.
- Server Actions: test Zod rejection and the `{ success, error }` shape (prior art: `src/lib/supabase.test.ts` style, env stubbing with `vi.stubEnv`).
- Supabase adapters and RLS are verified manually against a real Supabase project in each ticket's acceptance criteria; no network in the unit suite.

## Out of Scope
- Admin role and posting moderation.
- Payments, VIP postings.
- Email or push notifications.
- Saved Jobs, AI recommendations, chat.
- Multi-member Employer accounts, one account with both roles.
- Re-applying to the same posting, replacing a submitted Resume.

## Further Notes
- Decisions are recorded in `.scratch/job-portal/map.md`, `docs/adr/0001-*`, `docs/adr/0002-*`.
- Vocabulary follows `CONTEXT.md`.
- Backend/frontend contract and route map: `docs/api-contract.md`. Agent ownership: `AGENTS.md`.
