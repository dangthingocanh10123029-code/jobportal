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
export type Industry =
  | 'IT_SOFTWARE' | 'SALES' | 'MARKETING' | 'ACCOUNTING_FINANCE' | 'HR' | 'ADMIN'
  | 'CUSTOMER_SERVICE' | 'EDUCATION' | 'HEALTHCARE' | 'CONSTRUCTION' | 'MANUFACTURING'
  | 'LOGISTICS' | 'HOSPITALITY' | 'DESIGN' | 'LEGAL' | 'OTHER';
export type JobLevel = 'INTERN' | 'FRESHER' | 'JUNIOR' | 'MIDDLE' | 'SENIOR' | 'LEAD' | 'MANAGER';
export type CompanySize = 'S1_10' | 'S11_50' | 'S51_200' | 'S201_500' | 'S500_PLUS';
export type PostingSort = 'newest' | 'salary_desc' | 'deadline_asc';

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
  industry: Industry;
  level: JobLevel;
  /** 0 = no experience required. */
  experienceYears: number;
  headcount: number;
  skills: string[];
  requirements: string;
  benefits: string;
};

export type JobPosting = PostingInput & {
  id: string;
  employerId: string;
  companyName: string;
  companyLogoUrl: string | null;
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
  industry?: Industry;
  level?: JobLevel;
  /** Postings requiring at most this many years. */
  maxExperience?: number;
  /** Accent- and case-insensitive equality with one of the posting's skills. */
  skill?: string;
  /** Default 'newest'; 'salary_desc' puts negotiable (salary_max null) last. */
  sort?: PostingSort;
  page?: number;
};

export type PostingSummary = Pick<
  JobPosting,
  | 'id' | 'title' | 'companyName' | 'location' | 'employmentType' | 'salaryMin' | 'salaryMax' | 'applicationDeadline' | 'createdAt'
  | 'industry' | 'level' | 'experienceYears' | 'skills' | 'companyLogoUrl'
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

export type EmployerApplicationSummary = Application & { candidateName: string; candidatePhone: string | null };

export type StatusChange = {
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedByRole: Role;
  changedAt: string;
};
