# VibeCoding Job Portal

An online job portal connecting candidates with employers through job postings, search, and an application workflow.

> **Bản nháp** — các thuật ngữ và trạng thái dưới đây chưa chốt. Chạy `/grill-me` theo `.scratch/job-portal/map.md` để xác nhận, rồi cập nhật file này qua `/domain-modeling`.

## Language

### Accounts

**Candidate**:
A person looking for a job who searches postings and submits applications.
_Avoid_: Job seeker, applicant (before applying), user

**Employer**:
A company account that publishes job postings and reviews applications.
_Avoid_: Recruiter, company user, HR

**Resume**:
The document a candidate attaches to an application to describe their experience.
_Avoid_: CV file, profile document

### Job Posting

**Job Posting**:
An employer's advertised open position that candidates can find and apply to.
_Avoid_: Job, vacancy, listing, ad

**Posting Status**:
The lifecycle phase of a job posting, restricted to DRAFT, PUBLISHED, CLOSED, or EXPIRED.
_Avoid_: Job state, visibility

**Application Deadline**:
The date after which a published job posting no longer accepts applications and becomes EXPIRED.
_Avoid_: Closing date, due date

### Job Search

**Search Filter**:
The set of criteria (keyword, location, salary range, employment type) a candidate uses to narrow job postings.
_Avoid_: Query params, filter options

**Saved Job**:
A job posting a candidate bookmarks to revisit later.
_Avoid_: Favorite, wishlist

### Application

**Application**:
A candidate's submission to a specific job posting, progressing through discrete review states.
_Avoid_: Submission, apply record, candidacy

**Application Status**:
The current review phase of an application, restricted to SUBMITTED, REVIEWING, INTERVIEWING, OFFERED, HIRED, REJECTED, or WITHDRAWN.
_Avoid_: Stage, pipeline step
