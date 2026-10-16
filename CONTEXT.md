# VibeCoding Job Portal

An online job portal connecting candidates with employers through job postings, search, and an application workflow.

## Language

### Accounts

**Candidate**:
A person looking for a job who searches postings and submits applications. One account has exactly one role.
_Avoid_: Job seeker, applicant (before applying), user

**Employer**:
A company account, operated by a single person, that publishes job postings and reviews applications.
_Avoid_: Recruiter, company user, HR

**Resume**:
A PDF file a candidate uploads and attaches to an application.
_Avoid_: CV file, profile document

### Job Posting

**Job Posting**:
An employer's advertised open position that candidates can find and apply to.
_Avoid_: Job, vacancy, listing, ad

**Posting Status**:
The stored lifecycle phase of a job posting: DRAFT, PUBLISHED, or CLOSED. Published immediately, no moderation.
_Avoid_: Job state, visibility

**Expired Posting**:
A PUBLISHED job posting whose application deadline has passed. Derived at query time, never stored (ADR-0001).
_Avoid_: Closed posting, inactive job

**Application Deadline**:
The moment after which a published job posting stops accepting applications and is treated as expired.
_Avoid_: Closing date, due date

### Job Search

**Search Filter**:
The criteria a candidate uses to narrow open job postings: accent-insensitive keyword, location, minimum salary, employment type.
_Avoid_: Query params, filter options

### Application

**Application**:
A candidate's single submission to a specific job posting (ADR-0002), progressing through review states.
_Avoid_: Submission, apply record, candidacy

**Application Status**:
The current review phase of an application: SUBMITTED, REVIEWING, INTERVIEWING, OFFERED, HIRED, REJECTED, or WITHDRAWN.
_Avoid_: Stage, pipeline step

**Status Change**:
An immutable record of one application status transition, with who made it and when. Candidates see it as the application's history.
_Avoid_: Audit log, event, timeline item
