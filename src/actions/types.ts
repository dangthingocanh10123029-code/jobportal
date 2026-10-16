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
