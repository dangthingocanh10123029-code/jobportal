// Types of the API contract (docs/api-contract.md); FastAPI (backend/) owns the domain.

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

/** ADMIN is granted only by supabase/seed/make-admin.sql; sign-up offers CANDIDATE or EMPLOYER. */
export type Role = 'CANDIDATE' | 'EMPLOYER' | 'ADMIN';
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
  /** Verified badge (✓) set by an Admin. */
  companyVerified: boolean;
  status: PostingStatus;
  displayStatus: DisplayPostingStatus;
  createdAt: string;
  updatedAt: string;
  /** Set when an Admin hid the posting (only its Employer and Admins see it then). */
  hiddenAt: string | null;
  hiddenReason: string | null;
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
  | 'industry' | 'level' | 'experienceYears' | 'skills' | 'companyLogoUrl' | 'employerId' | 'companyVerified'
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

export type EmployerApplicationSummary = Application & {
  candidateName: string;
  candidatePhone: string | null;
  candidateHeadline: string | null;
  candidateSkills: string[];
};

export type StatusChange = {
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedByRole: Role;
  changedAt: string;
};

export type Company = {
  /** = the Employer's user id. */
  id: string;
  name: string;
  logoUrl: string | null;
  about: string | null;
  size: CompanySize | null;
  address: string | null;
  website: string | null;
  companyVerified: boolean;
};

export type CompanySummary = Company & { openPostings: number };

export type CompanyInput = {
  name?: string;
  about?: string;
  size?: CompanySize | null;
  address?: string;
  website?: string;
};

export type CompaniesPage = { items: CompanySummary[]; total: number; page: number; pageSize: 20 };

export type CandidateProfile = {
  userId: string;
  fullName: string;
  phone: string | null;
  headline: string | null;
  skills: string[];
  experience: string | null;
  education: string | null;
};

export type CandidateProfileInput = { headline?: string; skills?: string[]; experience?: string; education?: string };

export type SavedPostingSummary = PostingSummary & { isOpen: boolean; savedAt: string };

export type NotificationType =
  | 'APPLICATION_RECEIVED' | 'APPLICATION_STATUS_CHANGED' | 'APPLICATION_WITHDRAWN'
  /** To the Employer when an Admin hides their posting; the body carries the reason. */
  | 'POSTING_HIDDEN'
  | 'INTERVIEW_SCHEDULED' | 'INTERVIEW_RESPONDED' | 'INTERVIEW_CANCELLED'
  | 'TALENT_INVITED' | 'JOB_ALERT' | 'REVIEW_MODERATED' | 'ORDER_PAID';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Internal path, e.g. '/candidate/applications/<id>'. */
  link: string;
  readAt: string | null;
  createdAt: string;
};

export type EmployerDashboard = {
  totals: { postings: number; open: number; applications: number; views: number };
  byStatus: Record<ApplicationStatus, number>;
  postings: { id: string; title: string; displayStatus: DisplayPostingStatus; views: number; applications: number }[];
};

export type AdminStats = {
  users: { CANDIDATE: number; EMPLOYER: number; ADMIN: number; locked: number };
  postings: { DRAFT: number; PUBLISHED: number; CLOSED: number; EXPIRED: number; hidden: number };
  applications: Record<ApplicationStatus, number>;
  /** Last 30 days (Asia/Ho_Chi_Minh), oldest first, always 30 entries; date = 'YYYY-MM-DD'. */
  daily: { date: string; signups: number; applications: number; postings: number }[];
  topCompanies: { id: string; name: string; openPostings: number; applications: number }[];
  topIndustries: { industry: Industry; openPostings: number }[];
};

export type AdminUser = {
  userId: string;
  email: string;
  role: Role;
  /** fullName or companyName. */
  displayName: string;
  createdAt: string;
  lastSignInAt: string | null;
  lockedAt: string | null;
  lockedReason: string | null;
};

export type AdminUserDetail = AdminUser & { phone: string | null; postings: number; applications: number };

export type AdminPosting = PostingSummary & {
  status: PostingStatus;
  displayStatus: DisplayPostingStatus;
  applications: number;
  hiddenAt: string | null;
  hiddenReason: string | null;
};

export type AdminCompany = CompanySummary & { verifiedAt: string | null; employerEmail: string };

export type AuditAction =
  | 'USER_LOCKED' | 'USER_UNLOCKED' | 'POSTING_HIDDEN' | 'POSTING_UNHIDDEN' | 'COMPANY_VERIFIED' | 'COMPANY_UNVERIFIED'
  | 'ARTICLE_PUBLISHED' | 'ARTICLE_UNPUBLISHED';

export type AuditEntry = {
  id: string;
  actorId: string;
  actorEmail: string;
  action: AuditAction;
  targetType: 'USER' | 'POSTING' | 'COMPANY' | 'ARTICLE';
  targetId: string;
  targetLabel: string;
  details: Record<string, string>;
  createdAt: string;
};

export type InterviewMode = 'ONLINE' | 'ONSITE';
export type InterviewStatus = 'PROPOSED' | 'CONFIRMED' | 'DECLINED' | 'RESCHEDULE_REQUESTED' | 'CANCELLED' | 'DONE';
export type Interview = {
  id: string;
  applicationId: string;
  postingId: string;
  postingTitle: string;
  companyName: string;
  candidateName: string;
  scheduledAt: string;
  /** 15–240 */
  durationMinutes: number;
  mode: InterviewMode;
  /** ONLINE: http(s) URL; ONSITE: address, 5–300 characters. */
  location: string;
  /** The Employer's, ≤ 1000. */
  note: string | null;
  status: InterviewStatus;
  /** ≤ 500; always set when RESCHEDULE_REQUESTED. */
  candidateNote: string | null;
  createdAt: string;
  updatedAt: string;
};
export type Page<T, Size extends number = 20> = { items: T[]; total: number; page: number; pageSize: Size };

// v5 §46 — career guide.
export type ArticleCategory = 'CV' | 'INTERVIEW' | 'SALARY' | 'CAREER' | 'WORKPLACE';
export type ArticleStatus = 'DRAFT' | 'PUBLISHED';
export type ArticleSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: ArticleCategory;
  coverImage: string; // '/images/articles/<category lowercase>.svg'
  readingMinutes: number;
  publishedAt: string; // null only on an Admin's draft
  views: number;
};
export type Article = ArticleSummary & { content: string };
export type AdminArticleSummary = ArticleSummary & { status: ArticleStatus };
export type AdminArticle = Article & { status: ArticleStatus };

export type Message = {
  id: string;
  applicationId: string;
  senderId: string;
  /** Sent by the caller. */
  mine: boolean;
  /** 1–2000, trimmed. */
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type Conversation = {
  applicationId: string;
  postingTitle: string;
  /** Candidate sees the company, Employer sees the Candidate. */
  otherPartyName: string;
  /** The company logo for the Candidate; null for the Employer. */
  otherPartyLogoUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
  /** false once the Application is WITHDRAWN, REJECTED or HIRED. */
  canSend: boolean;
};
