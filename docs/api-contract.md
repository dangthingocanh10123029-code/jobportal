# API Contract — VibeCoding Job Portal v1

Hợp đồng giữa **Claude — logic (`agent-claude-logic`)** và **Codex — giao diện (`agent-codex`)**. Frontend chỉ gọi những hàm có trong file này, backend phải cung cấp đúng chữ ký này. Muốn đổi contract → hỏi Claude Coordinator, Claude sửa file này trước rồi mới dispatch.

## Quy ước chung

- Mọi hàm nằm trong `src/actions/<domain>.ts`, có `'use server'`, import qua alias `@/actions/<domain>`.
- Hàm **ghi** (tên kết thúc `Action`) trả về:
  ```ts
  type ActionResult<T> = { success: true; data: T } | { success: false; error: string };
  ```
  `error` là câu tiếng Việt hiển thị thẳng cho người dùng.
- Hàm **đọc** (dùng trong Server Component) trả dữ liệu trực tiếp, trả `null` khi không tìm thấy hoặc không có quyền, chỉ throw khi lỗi hệ thống.
- Actor (user id + role) luôn lấy từ session phía server, **không bao giờ** nhận từ input.
- Ngày giờ truyền dưới dạng chuỗi ISO 8601.
- Kiểu dùng chung export từ `src/actions/types.ts` (Claude logic tạo ở ticket 01, các ticket sau bổ sung).

```ts
type Role = 'CANDIDATE' | 'EMPLOYER';
type Actor = { userId: string; role: Role };
type PostingStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
type DisplayPostingStatus = PostingStatus | 'EXPIRED';
type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'INTERNSHIP' | 'CONTRACT';
type ApplicationStatus =
  | 'SUBMITTED' | 'REVIEWING' | 'INTERVIEWING' | 'OFFERED'
  | 'HIRED' | 'REJECTED' | 'WITHDRAWN';
```

## Routes (Codex — giao diện)

| Route | Ai vào được | Ticket |
|---|---|---|
| `/login`, `/signup` | chưa đăng nhập | 01 |
| `/account` | đã đăng nhập | 01 |
| `/` | mọi người — danh sách tin đang mở + tìm kiếm (`?q=&location=&type=&minSalary=&page=`) | 03, 04 |
| `/jobs/[id]` | mọi người — chi tiết tin, form nộp đơn nếu là Candidate | 03, 05 |
| `/employer/postings` | Employer | 02 |
| `/employer/postings/new`, `/employer/postings/[id]/edit` | Employer | 02 |
| `/employer/postings/[id]/applications` | Employer chủ tin | 07 |
| `/candidate/applications`, `/candidate/applications/[id]` | Candidate | 06 |

Middleware chặn `/employer/*` và `/candidate/*` theo role (Claude logic, ticket 01).

## 01 — Accounts (`@/actions/auth`)

```ts
type Profile = { userId: string; role: Role; fullName: string | null; phone: string | null; companyName: string | null };

signUpAction(input: { email: string; password: string; role: Role; fullName?: string; companyName?: string }): Promise<ActionResult<Profile>>
  // EMPLOYER bắt buộc companyName, CANDIDATE bắt buộc fullName; password ≥ 8 ký tự
signInAction(input: { email: string; password: string }): Promise<ActionResult<Profile>>
signOutAction(): Promise<ActionResult<null>>
updateProfileAction(input: { fullName?: string; phone?: string; companyName?: string }): Promise<ActionResult<Profile>>
getCurrentProfile(): Promise<Profile | null>
```

## 02 — Employer quản lý tin (`@/actions/postings`)

```ts
type PostingInput = {
  title: string;            // 5–150 ký tự
  description: string;      // ≥ 20 ký tự
  location: string;         // ví dụ "Hà Nội", "TP. Hồ Chí Minh", "Remote"
  employmentType: EmploymentType;
  salaryMin: number | null; // VND/tháng, null = thỏa thuận
  salaryMax: number | null; // salaryMin <= salaryMax khi cả hai có giá trị
  applicationDeadline: string;
};
type JobPosting = PostingInput & {
  id: string; employerId: string; companyName: string;
  status: PostingStatus; displayStatus: DisplayPostingStatus;
  createdAt: string; updatedAt: string;
};

createPostingDraftAction(input: PostingInput): Promise<ActionResult<JobPosting>>
updatePostingAction(input: PostingInput & { id: string }): Promise<ActionResult<JobPosting>>   // chỉ DRAFT, PUBLISHED
publishPostingAction(input: { id: string }): Promise<ActionResult<JobPosting>>               // deadline phải ở tương lai
closePostingAction(input: { id: string }): Promise<ActionResult<JobPosting>>                 // chỉ PUBLISHED
listMyPostings(): Promise<JobPosting[]>
getMyPosting(id: string): Promise<JobPosting | null>
```

## 03 + 04 — Xem và tìm tin (`@/actions/postings`)

```ts
type SearchFilter = {
  q?: string; location?: string; employmentType?: EmploymentType;
  minSalary?: number; page?: number;   // page bắt đầu từ 1, pageSize cố định 20
};
type PostingSummary = Pick<JobPosting,
  'id' | 'title' | 'companyName' | 'location' | 'employmentType' |
  'salaryMin' | 'salaryMax' | 'applicationDeadline' | 'createdAt'>;
type PostingDetail = JobPosting & { isOpen: boolean };  // isOpen = PUBLISHED và chưa hết hạn

listOpenPostings(filter: SearchFilter): Promise<{ items: PostingSummary[]; total: number; page: number; pageSize: 20 }>
  // ticket 03: chỉ dùng page; ticket 04: thêm q, location, employmentType, minSalary
getPostingDetail(id: string): Promise<PostingDetail | null>   // DRAFT → null (trang hiện 404)
```

## 05 + 06 + 07 — Application (`@/actions/applications`)

```ts
type Application = {
  id: string; jobPostingId: string; candidateId: string;
  status: ApplicationStatus; createdAt: string; updatedAt: string;
};
type StatusChange = {
  fromStatus: ApplicationStatus | null; toStatus: ApplicationStatus;
  changedByRole: Role; changedAt: string;
};
type CandidateApplicationSummary = Application & { postingTitle: string; companyName: string };
type EmployerApplicationSummary = Application & { candidateName: string; candidatePhone: string | null };

// 05 — Candidate nộp đơn
submitApplicationAction(formData: FormData): Promise<ActionResult<Application>>
  // fields: postingId (string), resume (File, application/pdf, ≤ 5 MB)
  // lỗi: đã nộp tin này, tin không còn nhận đơn, file không hợp lệ
getMyApplicationForPosting(postingId: string): Promise<Application | null>   // để trang /jobs/[id] hiện "Đã nộp"

// 06 — Candidate theo dõi và rút đơn
listMyApplications(): Promise<CandidateApplicationSummary[]>
getMyApplication(id: string): Promise<(CandidateApplicationSummary & { history: StatusChange[] }) | null>
withdrawApplicationAction(input: { applicationId: string }): Promise<ActionResult<Application>>

// 07 — Employer xử lý đơn
listApplicationsForPosting(postingId: string): Promise<EmployerApplicationSummary[] | null>   // null nếu không phải chủ tin
changeApplicationStatusAction(input: { applicationId: string; toStatus: ApplicationStatus }): Promise<ActionResult<Application>>
getResumeUrlAction(input: { applicationId: string }): Promise<ActionResult<{ url: string; expiresInSeconds: number }>>
allowedNextStatuses(status: ApplicationStatus, role: Role): ApplicationStatus[]
  // hàm thuần (không 'use server'), export từ '@/modules/application' để UI chỉ hiện nút hợp lệ
```
