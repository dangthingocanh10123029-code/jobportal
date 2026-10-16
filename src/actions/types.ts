// Shared types of the API contract (docs/api-contract.md). Later tickets extend this file.

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export type Role = 'CANDIDATE' | 'EMPLOYER';
export type Actor = { userId: string; role: Role };
export type PostingStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type DisplayPostingStatus = PostingStatus | 'EXPIRED';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'INTERNSHIP' | 'CONTRACT';
export type ApplicationStatus =
  | 'SUBMITTED' | 'REVIEWING' | 'INTERVIEWING' | 'OFFERED'
  | 'HIRED' | 'REJECTED' | 'WITHDRAWN';

export type Profile = {
  userId: string;
  role: Role;
  fullName: string | null;
  phone: string | null;
  companyName: string | null;
};

export type PostingInput = {
  title: string;
  description: string;
  location: string;
  employmentType: EmploymentType;
  salaryMin: number | null;
  salaryMax: number | null;
  applicationDeadline: string;
};

export type JobPosting = PostingInput & {
  id: string;
  employerId: string;
  companyName: string;
  status: PostingStatus;
  displayStatus: DisplayPostingStatus;
  createdAt: string;
  updatedAt: string;
};

export type SearchFilter = {
  q?: string;
  location?: string;
  employmentType?: EmploymentType;
  minSalary?: number;
  page?: number;
};

export type PostingSummary = Pick<
  JobPosting,
  'id' | 'title' | 'companyName' | 'location' | 'employmentType' | 'salaryMin' | 'salaryMax' | 'applicationDeadline' | 'createdAt'
>;

/** isOpen = PUBLISHED and not past the deadline (ADR-0001). */
export type PostingDetail = JobPosting & { isOpen: boolean };

export type OpenPostingsPage = { items: PostingSummary[]; total: number; page: number; pageSize: 20 };

export type Application = {
  id: string;
  jobPostingId: string;
  candidateId: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
};

export type CandidateApplicationSummary = Application & { postingTitle: string; companyName: string };

export type StatusChange = {
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedByRole: Role;
  changedAt: string;
};
