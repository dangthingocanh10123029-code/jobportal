# API Contract — Job Portal v1

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

signUpAction(input: { email: string; password: string; role: Role; fullName?: string; companyName?: string }): Promise<ActionResult<Profile & { needsEmailConfirmation: boolean }>>
  // needsEmailConfirmation = true khi Supabase bật xác nhận email và chưa có session: UI báo "kiểm tra email"
  // EMPLOYER bắt buộc companyName, CANDIDATE bắt buộc fullName; password ≥ 8 ký tự
signInAction(input: { email: string; password: string }): Promise<ActionResult<Profile>>
signOutAction(): Promise<ActionResult<null>>
updateProfileAction(input: { fullName?: string; phone?: string; companyName?: string }): Promise<ActionResult<Profile>>
getCurrentProfile(): Promise<Profile | null>

// 11 — Xác nhận email bằng mã OTP (Supabase bật Confirm email)
verifySignupOtpAction(input: { email: string; token: string }): Promise<ActionResult<Profile>>
  // token: 6–10 chữ số trong email "Confirm signup"; thành công = đã xác nhận + đăng nhập (set session cookie)
  // lỗi: mã sai hoặc hết hạn, quá nhiều lần thử
resendSignupOtpAction(input: { email: string }): Promise<ActionResult<null>>
  // gửi lại mã; lỗi: gửi quá nhanh / hết lượt gửi email
// signInAction với tài khoản chưa xác nhận trả lỗi 'Email chưa được xác nhận…' → UI cho nhập mã

// 13 — Link xác nhận trong email (PKCE ?code=), route handler do Codex tạo ở src/app/auth/callback/route.ts
handleAuthCallback(request: NextRequest): Promise<NextResponse>   // export từ '@/lib/auth-callback'
  // đổi ?code= lấy session (set cookie) rồi redirect tới ?next= nội bộ hoặc '/account'; lỗi → '/login?error=link'
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
  applicationDeadline: string;   // ISO 8601 có múi giờ (new Date(local).toISOString()); chuỗi datetime-local không offset bị từ chối
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

## v2 — Kiểu dùng chung mới (`src/actions/types.ts`)

```ts
type Industry =
  | 'IT_SOFTWARE' | 'SALES' | 'MARKETING' | 'ACCOUNTING_FINANCE' | 'HR' | 'ADMIN'
  | 'CUSTOMER_SERVICE' | 'EDUCATION' | 'HEALTHCARE' | 'CONSTRUCTION' | 'MANUFACTURING'
  | 'LOGISTICS' | 'HOSPITALITY' | 'DESIGN' | 'LEGAL' | 'OTHER';
type JobLevel = 'INTERN' | 'FRESHER' | 'JUNIOR' | 'MIDDLE' | 'SENIOR' | 'LEAD' | 'MANAGER';
type CompanySize = 'S1_10' | 'S11_50' | 'S51_200' | 'S201_500' | 'S500_PLUS';
type PostingSort = 'newest' | 'salary_desc' | 'deadline_asc';
```
Nhãn tiếng Việt của các enum do Codex đặt trong `src/components/format.ts`.

## 14 — Tin chi tiết + bộ lọc mới (`@/actions/postings`)

```ts
// PostingInput bổ sung (bắt buộc khi tạo/sửa):
industry: Industry; level: JobLevel;
experienceYears: number;   // 0–20, 0 = không yêu cầu kinh nghiệm
headcount: number;         // 1–999
skills: string[];          // 0–10 kỹ năng, mỗi kỹ năng 1–30 ký tự, không trùng (không phân biệt hoa thường)
requirements: string;      // 10–5000 ký tự
benefits: string;          // 10–5000 ký tự
// Tin cũ trước v2: industry 'OTHER', level 'JUNIOR', experienceYears 0, headcount 1, skills [], requirements/benefits ''

// JobPosting, PostingDetail có đủ các trường trên + companyLogoUrl: string | null
// PostingSummary bổ sung: industry, level, experienceYears, skills, companyLogoUrl, employerId (link /companies/<employerId>)

// SearchFilter bổ sung (URL: ?industry=&level=&exp=&skill=&sort=):
industry?: Industry; level?: JobLevel;
maxExperience?: number;    // tin yêu cầu kinh nghiệm ≤ giá trị này
skill?: string;            // khớp không dấu, không phân biệt hoa thường với một kỹ năng của tin
sort?: PostingSort;        // mặc định 'newest'; 'salary_desc' xếp theo salary_max (null = thỏa thuận ở cuối)

getRelatedPostings(postingId: string): Promise<PostingSummary[]>   // ≤ 6 tin đang mở cùng ngành, trừ chính nó
```

## 15 — Trang công ty (`@/actions/companies`)

```ts
type Company = {
  id: string;               // = user id của Employer
  name: string; logoUrl: string | null; about: string | null;
  size: CompanySize | null; address: string | null; website: string | null;
};
type CompanySummary = Company & { openPostings: number };

getMyCompany(): Promise<Company | null>                                     // Employer đang đăng nhập
updateMyCompanyAction(input: { name?: string; about?: string; size?: CompanySize | null; address?: string; website?: string }): Promise<ActionResult<Company>>
  // name 1–150; about ≤ 5000; address ≤ 300; website URL http(s) ≤ 300; chuỗi rỗng = xóa
uploadCompanyLogoAction(formData: FormData): Promise<ActionResult<Company>>
  // field 'logo': PNG/JPEG/WebP ≤ 1 MB (không nhận SVG). Bucket public 'company-logos', thư mục = user id
  // logoUrl hợp lệ: URL public của bucket 'company-logos/<id>/…' hoặc logo tĩnh dữ liệu mẫu '/images/companies/logo-NN.svg'
listCompanies(filter: { q?: string; page?: number }): Promise<{ items: CompanySummary[]; total: number; page: number; pageSize: 20 }>
getCompany(id: string): Promise<(Company & { openPostings: PostingSummary[] }) | null>
```
Tên công ty hiển thị trên tin lấy từ Company. `profiles.company_name` được đồng bộ để không phá chữ ký ticket 01.

## 16 — Hồ sơ ứng viên + lưu việc (`@/actions/candidates`)

```ts
type CandidateProfile = {
  userId: string; fullName: string; phone: string | null;
  headline: string | null;  // ≤ 150
  skills: string[];         // ≤ 20, mỗi kỹ năng 1–30 ký tự
  experience: string | null; education: string | null;   // ≤ 5000 mỗi trường
};
getMyCandidateProfile(): Promise<CandidateProfile | null>
updateCandidateProfileAction(input: { headline?: string; skills?: string[]; experience?: string; education?: string }): Promise<ActionResult<CandidateProfile>>
getApplicantProfile(applicationId: string): Promise<CandidateProfile | null>   // chỉ Employer chủ tin của đơn

toggleSavedPostingAction(input: { postingId: string }): Promise<ActionResult<{ saved: boolean }>>   // chỉ Candidate
listSavedPostings(): Promise<(PostingSummary & { isOpen: boolean; savedAt: string })[]>
getSavedPostingIds(): Promise<string[]>   // [] khi không phải Candidate
```
`EmployerApplicationSummary` bổ sung `candidateHeadline: string | null; candidateSkills: string[]`.

## 17 — Thông báo + dashboard (`@/actions/notifications`, `@/actions/dashboard`)

```ts
type NotificationType = 'APPLICATION_RECEIVED' | 'APPLICATION_STATUS_CHANGED' | 'APPLICATION_WITHDRAWN';
type AppNotification = {
  id: string; type: NotificationType; title: string; body: string;
  link: string;              // đường dẫn nội bộ, vd '/candidate/applications/<id>'
  readAt: string | null; createdAt: string;
};
listMyNotifications(): Promise<AppNotification[]>          // 30 mới nhất
getUnreadNotificationCount(): Promise<number>               // 0 khi chưa đăng nhập
markNotificationsReadAction(input: { ids?: string[] }): Promise<ActionResult<null>>   // ids rỗng/thiếu = đánh dấu tất cả

type EmployerDashboard = {
  totals: { postings: number; open: number; applications: number; views: number };
  byStatus: Record<ApplicationStatus, number>;
  postings: { id: string; title: string; displayStatus: DisplayPostingStatus; views: number; applications: number }[];
};
getEmployerDashboard(): Promise<EmployerDashboard | null>   // null khi không phải Employer
```
Thông báo do database tạo (trigger): đơn mới → Employer; Employer đổi trạng thái → Candidate; Candidate rút đơn → Employer.
Lượt xem tin tăng khi `getPostingDetail` được gọi cho tin không phải của người xem.

## 18 — Dữ liệu mẫu (Claude logic, không có UI)
`supabase/seed/seed-demo.sql` + `supabase/seed/wipe-demo.sql`. Mọi user mẫu có email `*@demo.jobportal.test`, mật khẩu chung ghi trong `supabase/seed/README.md`.

## Routes v2 (Codex)

| Route | Ai vào được | Ticket |
|---|---|---|
| `/companies`, `/companies/[id]` | mọi người | 15 |
| `/employer/company` | Employer | 15 |
| `/candidate/profile`, `/candidate/saved` | Candidate | 16 |
| `/notifications` | đã đăng nhập | 17 |
| `/employer/dashboard` | Employer | 17 |

## v3 — REST API FastAPI (ADR-0003)

Base URL: env `API_URL` (dev `http://127.0.0.1:8000`). Swagger: `/docs`. Server Actions gọi qua `apiFetch` trong `src/lib/api.ts` (logic): tự gắn `Authorization: Bearer <access_token>` từ session, ném lỗi mạng, trả JSON.
Quy ước: JSON camelCase đúng kiểu TS ở trên; thành công 200/201 trả object/array; lỗi nghiệp vụ 400/403/404/409/422 trả `{ "error": "<tiếng Việt>" }` — Server Action chuyển thành `ActionResult` thất bại. "(auth)" = cần Bearer; "(emp)"/"(cand)" = đúng vai trò, sai vai trò → 403.

| Method + path | Thay cho (Server Action / hàm đọc) | Ticket |
|---|---|---|
| `GET /health` | — (kiểm tra DB + JWKS) | 22 |
| `GET /postings?q&location&type&industry&level&exp&skill&minSalary&sort&page` | `listOpenPostings` | 23 |
| `GET /postings/{id}` | `getPostingDetail` (ghi lượt xem) | 23 |
| `GET /postings/{id}/related` | `getRelatedPostings` | 23 |
| `GET /me/postings` (emp) · `GET /me/postings/{id}` (emp) | `listMyPostings` · `getMyPosting` | 23 |
| `POST /me/postings` (emp) · `PUT /me/postings/{id}` (emp) | `createPostingDraftAction` · `updatePostingAction` | 23 |
| `POST /me/postings/{id}/publish` · `/close` (emp) | `publishPostingAction` · `closePostingAction` | 23 |
| `POST /applications` (cand, multipart `postingId`, `resume`) | `submitApplicationAction` | 24 |
| `GET /postings/{id}/my-application` (cand) | `getMyApplicationForPosting` | 24 |
| `GET /me/applications` · `GET /me/applications/{id}` (cand) | `listMyApplications` · `getMyApplication` | 24 |
| `POST /me/applications/{id}/withdraw` (cand) | `withdrawApplicationAction` | 24 |
| `GET /me/postings/{id}/applications` (emp) | `listApplicationsForPosting` (403/404 → null) | 24 |
| `POST /applications/{id}/status` (emp, `{ toStatus }`) | `changeApplicationStatusAction` | 24 |
| `GET /applications/{id}/resume-url` (emp) | `getResumeUrlAction` | 24 |
| `GET /companies?q&page` · `GET /companies/{id}` | `listCompanies` · `getCompany` | 25 |
| `GET /me/company` · `PATCH /me/company` (emp) | `getMyCompany` · `updateMyCompanyAction` | 25 |
| `POST /me/company/logo` (emp, multipart `logo`) | `uploadCompanyLogoAction` | 25 |
| `GET /me/candidate-profile` · `PATCH /me/candidate-profile` (cand) | `getMyCandidateProfile` · `updateCandidateProfileAction` | 25 |
| `GET /applications/{id}/applicant` (emp) | `getApplicantProfile` | 25 |
| `POST /me/saved-postings/{postingId}/toggle` · `GET /me/saved-postings` · `GET /me/saved-postings/ids` (cand) | `toggleSavedPostingAction` · `listSavedPostings` · `getSavedPostingIds` | 25 |
| `GET /me/notifications` · `GET /me/notifications/unread-count` · `POST /me/notifications/read` (`{ ids? }`) (auth) | `listMyNotifications` · `getUnreadNotificationCount` · `markNotificationsReadAction` | 26 |
| `GET /me/dashboard` (emp) | `getEmployerDashboard` | 26 |
| `GET /me/profile` · `PATCH /me/profile` (auth) | `getCurrentProfile` · `updateProfileAction` | 26 |

Giữ ở Next.js (Supabase Auth, cookie): `signUpAction`, `signInAction`, `signOutAction`, `verifySignupOtpAction`, `resendSignupOtpAction`, `/auth/callback`, middleware.
`allowedNextStatuses` (hàm thuần cho UI) chuyển về `src/lib/application-status.ts` ở ticket 27; Python có bản tương đương trong domain applications.

## 32 — Quản trị (Admin) — v4

```ts
type Role = 'CANDIDATE' | 'EMPLOYER' | 'ADMIN';   // ADMIN chỉ do script SQL cấp, không đăng ký được
type NotificationType = ... | 'POSTING_HIDDEN';  // gửi Employer khi tin bị ẩn (body có lý do)

type AdminStats = {
  users: { CANDIDATE: number; EMPLOYER: number; ADMIN: number; locked: number };
  postings: { DRAFT: number; PUBLISHED: number; CLOSED: number; EXPIRED: number; hidden: number };
  applications: Record<ApplicationStatus, number>;
  daily: { date: string; signups: number; applications: number; postings: number }[];   // 30 ngày gần nhất, đủ 30 phần tử
  topCompanies: { id: string; name: string; openPostings: number; applications: number }[];   // 5
  topIndustries: { industry: Industry; openPostings: number }[];                              // 5
};
type AdminUser = {
  userId: string; email: string; role: Role; displayName: string;   // fullName hoặc companyName
  createdAt: string; lastSignInAt: string | null;
  lockedAt: string | null; lockedReason: string | null;
};
type AdminUserDetail = AdminUser & { phone: string | null; postings: number; applications: number };
type AdminPosting = PostingSummary & { status: PostingStatus; displayStatus: DisplayPostingStatus;
  applications: number; hiddenAt: string | null; hiddenReason: string | null };
type AdminCompany = CompanySummary & { verifiedAt: string | null; employerEmail: string };
type AuditEntry = { id: string; actorId: string; actorEmail: string;
  action: 'USER_LOCKED' | 'USER_UNLOCKED' | 'POSTING_HIDDEN' | 'POSTING_UNHIDDEN' | 'COMPANY_VERIFIED' | 'COMPANY_UNVERIFIED';
  targetType: 'USER' | 'POSTING' | 'COMPANY'; targetId: string; targetLabel: string;
  details: Record<string, string>; createdAt: string };
type Page<T> = { items: T[]; total: number; page: number; pageSize: 20 };

// @/actions/admin — mọi hàm: không phải ADMIN → null / ActionResult lỗi 'Chỉ quản trị viên…'
getAdminStats(): Promise<AdminStats | null>
listAdminUsers(filter: { q?: string; role?: Role; locked?: boolean; page?: number }): Promise<Page<AdminUser> | null>
getAdminUser(userId: string): Promise<AdminUserDetail | null>
setUserLockAction(input: { userId: string; locked: boolean; reason?: string }): Promise<ActionResult<AdminUser>>
  // khóa cần reason 5–500 ký tự; không khóa được chính mình hoặc ADMIN khác
listAdminPostings(filter: { q?: string; status?: DisplayPostingStatus; hidden?: boolean; employerId?: string; page?: number }): Promise<Page<AdminPosting> | null>
setPostingHiddenAction(input: { postingId: string; hidden: boolean; reason?: string }): Promise<ActionResult<AdminPosting>>
  // ẩn cần reason 5–500; tin ẩn: không có trong danh sách công khai/tìm kiếm, /jobs/[id] trả 404 cho người ngoài, không nhận đơn mới; đơn cũ giữ nguyên
listAdminCompanies(filter: { q?: string; verified?: boolean; page?: number }): Promise<Page<AdminCompany> | null>
setCompanyVerifiedAction(input: { companyId: string; verified: boolean }): Promise<ActionResult<AdminCompany>>
listAuditLog(filter: { action?: AuditEntry['action']; actorId?: string; page?: number }): Promise<Page<AuditEntry> | null>
```
`Company`, `PostingSummary`, `PostingDetail` bổ sung `companyVerified: boolean` (huy hiệu ✓).
`JobPosting` (của Employer) bổ sung `hiddenAt: string | null; hiddenReason: string | null` — trang `/employer/postings` hiện nhãn "Bị ẩn" + lý do.
Tài khoản bị khóa: `signInAction` trả 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' (KHÔNG kèm lý do — tránh dò email/lộ lý do cho người chưa đăng nhập); endpoint cần đăng nhập với token còn hạn trả 403 'Tài khoản đã bị khóa: <lý do>', endpoint công khai coi như khách; middleware đăng xuất + chuyển `/login?error=locked`.

REST (FastAPI, require_admin): `GET /admin/stats` · `GET /admin/users` · `GET /admin/users/{id}` · `POST /admin/users/{id}/lock` (`{ locked, reason? }`) · `GET /admin/postings` · `POST /admin/postings/{id}/hidden` (`{ hidden, reason? }`) · `GET /admin/companies` · `POST /admin/companies/{id}/verified` (`{ verified }`) · `GET /admin/audit`.

Routes (Codex): `/admin` (tổng quan), `/admin/users`, `/admin/users/[id]`, `/admin/postings`, `/admin/companies`, `/admin/audit` — chỉ ADMIN (middleware); header có mục "Quản trị" cho ADMIN.

## Hình ảnh (Antigravity → Codex)

Antigravity giao đúng tên file và đường dẫn dưới đây (ticket 08). Codex tham chiếu theo đường dẫn này ngay từ đầu, kể cả khi file chưa merge (ảnh tạm thời không hiện là chấp nhận được, không tự tạo ảnh thay thế).

| File | Dùng ở | Kích thước / định dạng |
|---|---|---|
| `public/images/logo.svg` | Thanh điều hướng | SVG, logo ngang (biểu tượng + chữ "Job Portal"), cao hiển thị 32px |
| `public/images/logo-mark.svg` | Chỗ hẹp, mobile | SVG vuông, chỉ biểu tượng |
| `src/app/icon.png` | Favicon (Next.js tự nhận) | PNG 512×512 |
| `src/app/opengraph-image.png` | Ảnh xem trước khi chia sẻ link | PNG 1200×630, có logo + câu "Tìm việc nhanh, ứng tuyển dễ" |
| `public/images/hero.webp` | Trang chủ `/`, phía trên ô tìm kiếm | WebP 1600×600, ≤ 200 KB |
| `public/images/auth.webp` | Cột bên `/login`, `/signup` | WebP 800×1000, ≤ 150 KB |
| `public/images/company-placeholder.svg` | Thay logo công ty (v1 chưa upload logo công ty) | SVG vuông |
| `public/images/empty-search.svg` | Không có kết quả tìm kiếm | SVG, minh họa 240×180 |
| `public/images/empty-postings.svg` | Employer chưa có tin nào | SVG, 240×180 |
| `public/images/empty-applications.svg` | Candidate chưa nộp đơn / tin chưa có đơn | SVG, 240×180 |
| `public/images/not-found.svg` | Trang 404 | SVG, 320×240 |

Alt text tiếng Việt do Codex viết khi dùng ảnh; ảnh trang trí dùng `alt=""`.

### Bảng màu chung

Codex khai báo thành CSS variables, Antigravity vẽ ảnh theo đúng bảng này. Nền sáng (Light Mode, xem `NOTES.md`).

| Token | Màu | Dùng cho |
|---|---|---|
| `--color-primary` | `#2563EB` | Nút chính, link, logo |
| `--color-primary-soft` | `#DBEAFE` | Nền nhấn nhẹ |
| `--color-accent` | `#F59E0B` | Điểm nhấn minh họa, badge nổi bật |
| `--color-text` | `#0F172A` | Chữ chính |
| `--color-muted` | `#64748B` | Chữ phụ |
| `--color-bg` | `#FFFFFF` | Nền trang |
| `--color-surface` | `#FFFFFF` | Nền card (v4: trắng đồng bộ, tách lớp bằng viền + bóng) |
| `--color-border` | `#E5E7EB` | Viền siêu mảnh của thẻ, ô nhập (v4) |
| `--color-success` / `--color-danger` | `#16A34A` / `#DC2626` | Trạng thái HIRED / REJECTED, lỗi |

Phong cách minh họa: phẳng (flat), nét tròn, tối đa 4 màu từ bảng trên, không chứa chữ (trừ logo và ảnh Open Graph).

### Hình ảnh v2 (ticket 19)

| File | Dùng ở | Định dạng |
|---|---|---|
| `public/images/companies/logo-01.svg` … `logo-24.svg` | Logo công ty hư cấu cho dữ liệu mẫu | SVG vuông 128×128, mỗi logo một biểu tượng trừu tượng + nền màu, KHÔNG chữ, KHÔNG giống thương hiệu có thật |
| `public/images/industries/<industry>.svg` (16 file, tên = giá trị `Industry` viết thường, vd `it_software.svg`) | Chip ngành nghề trên trang chủ, bộ lọc | SVG 48×48, nét đơn sắc dùng `currentColor` |
| `public/images/empty-notifications.svg`, `public/images/empty-saved.svg` | Trạng thái rỗng | SVG 240×180, cùng phong cách |


## v5 — 8 module mới (ticket 40–47)

Quy ước như v3: mỗi hàm dưới đây có endpoint FastAPI tương ứng (Phần A ghi vào bảng REST của ticket) và Server Action mỏng gọi `apiFetch`. Thông báo mới do database tạo (trigger/RPC), không do frontend.

```ts
type NotificationType = ...
  | 'INTERVIEW_SCHEDULED' | 'INTERVIEW_RESPONDED' | 'INTERVIEW_CANCELLED'   // 40
  | 'TALENT_INVITED'                                                       // 43
  | 'JOB_ALERT'                                                            // 44
  | 'REVIEW_MODERATED'                                                     // 45
  | 'ORDER_PAID';                                                          // 47
type AuditEntry['action'] = ... | 'REVIEW_APPROVED' | 'REVIEW_REJECTED' | 'ARTICLE_PUBLISHED' | 'ARTICLE_UNPUBLISHED' | 'PACKAGE_UPDATED';
type AuditEntry['targetType'] = ... | 'REVIEW' | 'ARTICLE' | 'PACKAGE';   // mỗi ticket thêm action/target vào CHECK của admin_audit_log (giữ giá trị cũ)
```

### 40 — Lịch phỏng vấn (`@/actions/interviews`)
```ts
type InterviewMode = 'ONLINE' | 'ONSITE';
type InterviewStatus = 'PROPOSED' | 'CONFIRMED' | 'DECLINED' | 'RESCHEDULE_REQUESTED' | 'CANCELLED' | 'DONE';
type Interview = {
  id: string; applicationId: string; postingId: string; postingTitle: string;
  companyName: string; candidateName: string;
  scheduledAt: string; durationMinutes: number;       // 15–240
  mode: InterviewMode; location: string;              // ONLINE: URL http(s); ONSITE: địa chỉ 5–300 ký tự
  note: string | null;                                // ≤ 1000, của Employer
  status: InterviewStatus; candidateNote: string | null;   // ≤ 500
  createdAt: string; updatedAt: string;
};
scheduleInterviewAction(input: { applicationId: string; scheduledAt: string; durationMinutes: number; mode: InterviewMode; location: string; note?: string }): Promise<ActionResult<Interview>>
  // Employer chủ tin; đơn ở REVIEWING hoặc INTERVIEWING; scheduledAt trong tương lai (≤ 90 ngày);
  // đơn REVIEWING tự chuyển INTERVIEWING (cùng transaction, ghi lịch sử trạng thái); tối đa 1 lịch đang PROPOSED/CONFIRMED mỗi đơn
respondInterviewAction(input: { interviewId: string; response: 'CONFIRM' | 'DECLINE' | 'RESCHEDULE'; note?: string }): Promise<ActionResult<Interview>>
  // Candidate của đơn; chỉ khi PROPOSED; RESCHEDULE bắt buộc note (gợi ý giờ khác)
cancelInterviewAction(input: { interviewId: string; reason?: string }): Promise<ActionResult<Interview>>   // Employer; PROPOSED/CONFIRMED/RESCHEDULE_REQUESTED
markInterviewDoneAction(input: { interviewId: string }): Promise<ActionResult<Interview>>                  // Employer; CONFIRMED và đã qua giờ hẹn
listMyInterviews(filter: { scope?: 'upcoming' | 'past' }): Promise<Interview[]>   // theo vai trò; upcoming tăng dần theo giờ, past giảm dần
listInterviewsForApplication(applicationId: string): Promise<Interview[] | null>  // Candidate của đơn hoặc Employer chủ tin
```
Thông báo: đặt lịch → Candidate; Candidate trả lời → Employer; hủy → Candidate.
Chi tiết đã chốt khi làm 40A: `scope` mặc định 'upcoming' (theo giờ kết thúc, tối đa 100 lịch); link ONLINE ≤ 500 ký tự; lý do hủy ≤ 500 chỉ nằm trong thông báo; đặt lịch cho đơn REVIEWING sinh 2 thông báo (đổi trạng thái + lịch); lịch ở RESCHEDULE_REQUESTED không tự hủy — Employer hủy rồi đặt lịch mới.

### 41 — Nhắn tin (`@/actions/messages`)
```ts
type Message = { id: string; applicationId: string; senderId: string; mine: boolean; body: string; createdAt: string; readAt: string | null };
type Conversation = {
  applicationId: string; postingTitle: string; otherPartyName: string; otherPartyLogoUrl: string | null;
  lastMessage: string | null; lastMessageAt: string | null; unread: number; canSend: boolean;
};
listConversations(): Promise<Conversation[]>   // các đơn có ≥ 1 tin nhắn hoặc đơn đang không ở trạng thái kết thúc; mới nhất trước
getConversation(applicationId: string, before?: string): Promise<{ conversation: Conversation; messages: Message[]; hasMore: boolean } | null>
  // 50 tin mỗi trang, tăng dần theo thời gian; before = createdAt của tin cũ nhất đang có
sendMessageAction(input: { applicationId: string; body: string }): Promise<ActionResult<Message>>
  // body 1–2000 sau trim; chỉ 2 bên của đơn; không gửi được khi đơn WITHDRAWN/REJECTED/HIRED (canSend=false); tối đa 30 tin/phút/người
markConversationReadAction(input: { applicationId: string }): Promise<ActionResult<null>>
getUnreadMessageCount(): Promise<number>   // 0 khi chưa đăng nhập
```
Gửi quá 30 tin/phút → HTTP 429 `{ error }` (apiFetch hiển thị như lỗi nghiệp vụ). Không tạo notification cho từng tin nhắn (tránh spam). Header có biểu tượng tin nhắn với số chưa đọc. Trang chat làm mới bằng `router.refresh()` mỗi 10 giây khi tab đang mở (không thêm thư viện realtime).

### 42 — CV online (`@/actions/cv`)
```ts
type CvTemplate = 'CLASSIC' | 'MODERN';
type CvItem = { title: string; organization: string; startDate: string; endDate: string | null; description: string };
  // title/organization 1–150; startDate/endDate 'YYYY-MM'; endDate null = hiện tại; description ≤ 2000
type OnlineCv = {
  candidateId: string; template: CvTemplate;
  fullName: string; headline: string | null; email: string; phone: string | null; location: string | null;
  summary: string | null;                  // ≤ 2000
  experiences: CvItem[]; educations: CvItem[];   // mỗi loại ≤ 15
  skills: string[];                         // ≤ 30, mỗi kỹ năng 1–30
  languages: string[];                      // ≤ 10
  certifications: { name: string; issuer: string | null; year: number | null }[];   // ≤ 15
  updatedAt: string;
};
getMyCv(): Promise<OnlineCv | null>                       // Candidate; null khi chưa tạo
saveMyCvAction(input: Omit<OnlineCv, 'candidateId' | 'updatedAt'>): Promise<ActionResult<OnlineCv>>
deleteMyCvAction(): Promise<ActionResult<null>>
getApplicationCv(applicationId: string): Promise<OnlineCv | null>   // Employer chủ tin: bản chụp CV lúc nộp
```
`submitApplicationAction(formData)` nhận thêm field `cvSource`: `'FILE'` (mặc định, field `resume` như cũ) hoặc `'ONLINE'` (không cần file; lưu bản chụp CV online vào đơn, sửa CV sau đó không đổi đơn đã nộp). `Application`/`EmployerApplicationSummary` bổ sung `cvSource: 'FILE' | 'ONLINE'`.
Giới hạn chốt khi làm 42A: fullName 1–100; headline, location ≤ 150; mỗi language 1–30; certification name/issuer ≤ 150, year 1950–2100. Nộp ONLINE khi chưa có CV → 422 'Bạn chưa tạo CV online'.
Xuất PDF: trang `/candidate/cv/print` dùng CSS `@media print` + `window.print()`, không thêm thư viện.

### 43 — Tìm ứng viên (`@/actions/talent`)
```ts
type TalentSummary = {
  candidateId: string; fullName: string; headline: string | null; skills: string[];
  location: string | null; experienceYears: number | null; hasOnlineCv: boolean; updatedAt: string; saved: boolean;
};
type TalentDetail = TalentSummary & { profile: CandidateProfile; cv: OnlineCv | null };   // KHÔNG có email/phone
setOpenToWorkAction(input: { openToWork: boolean; location?: string; experienceYears?: number }): Promise<ActionResult<{ openToWork: boolean }>>   // Candidate; mặc định false
searchTalent(filter: { q?: string; skill?: string; location?: string; minExperience?: number; page?: number }): Promise<Page<TalentSummary> | null>   // Employer; chỉ ứng viên openToWork, tài khoản không bị khóa
getTalent(candidateId: string): Promise<TalentDetail | null>   // Employer; null nếu ứng viên tắt openToWork
toggleSavedTalentAction(input: { candidateId: string; note?: string }): Promise<ActionResult<{ saved: boolean }>>
listSavedTalent(): Promise<TalentSummary[]>
inviteTalentAction(input: { candidateId: string; postingId: string; message?: string }): Promise<ActionResult<null>>
  // tin PUBLISHED của chính Employer; mỗi cặp (ứng viên, tin) mời 1 lần; ≤ 20 lời mời/ngày/Employer → notification TALENT_INVITED (link /jobs/<postingId>)
```
`CandidateProfile` bổ sung `openToWork: boolean; location: string | null; experienceYears: number | null`.

### 44 — Gợi ý việc + job alert (`@/actions/alerts`)
```ts
type AlertFilter = Pick<SearchFilter, 'q' | 'location' | 'type' | 'industry' | 'level' | 'minSalary'>;
type JobAlert = { id: string; name: string; filter: AlertFilter; active: boolean; createdAt: string; lastMatchedAt: string | null };
getRecommendedPostings(): Promise<(PostingSummary & { matchReasons: string[] })[]>
  // Candidate: ≤ 10 tin đang mở, chưa nộp, điểm theo kỹ năng trùng + ngành/địa điểm từ đơn đã nộp & hồ sơ; matchReasons tiếng Việt, vd 'Khớp kỹ năng: Excel, MISA'. Khách/Employer → []
listJobAlerts(): Promise<JobAlert[]>
createJobAlertAction(input: { name: string; filter: AlertFilter }): Promise<ActionResult<JobAlert>>   // name 1–100; filter có ≥ 1 điều kiện; tối đa 5 alert/Candidate
updateJobAlertAction(input: { id: string; active: boolean }): Promise<ActionResult<JobAlert>>
deleteJobAlertAction(input: { id: string }): Promise<ActionResult<null>>
```
Khi một tin chuyển PUBLISHED, trigger tạo notification `JOB_ALERT` cho mỗi alert đang bật khớp tin (mỗi alert tối đa 1 thông báo/tin, link `/jobs/<id>`). Chỉ thông báo trong ứng dụng, không gửi email.

### 45 — Đánh giá công ty (`@/actions/reviews`)
```ts
type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type CompanyReview = {
  id: string; companyId: string; rating: 1 | 2 | 3 | 4 | 5;
  title: string; pros: string; cons: string;          // title 5–150; pros/cons 10–3000
  authorName: string;                                 // 'Ứng viên ẩn danh' khi anonymous
  anonymous: boolean; createdAt: string;
};
type MyReview = CompanyReview & { status: ReviewStatus; rejectReason: string | null };
type CompanyRating = { average: number | null; count: number; distribution: Record<1 | 2 | 3 | 4 | 5, number> };   // chỉ review APPROVED
listCompanyReviews(companyId: string, page?: number): Promise<{ rating: CompanyRating } & Page<CompanyReview>>
getMyReview(companyId: string): Promise<MyReview | null>
canReviewCompany(companyId: string): Promise<boolean>   // Candidate đã từng nộp đơn vào tin của công ty và chưa có review
submitReviewAction(input: { companyId: string; rating: number; title: string; pros: string; cons: string; anonymous: boolean }): Promise<ActionResult<MyReview>>
  // tạo PENDING; sửa review REJECTED → PENDING lại; mỗi Candidate 1 review/công ty
// Admin (@/actions/admin):
listAdminReviews(filter: { status?: ReviewStatus; page?: number }): Promise<Page<CompanyReview & { status: ReviewStatus; companyName: string; authorEmail: string }> | null>
moderateReviewAction(input: { reviewId: string; approve: boolean; reason?: string }): Promise<ActionResult<null>>   // từ chối cần reason 5–500; ghi audit + notification REVIEW_MODERATED
```
`CompanySummary` bổ sung `rating: number | null; reviewCount: number`.

### 46 — Cẩm nang nghề nghiệp (`@/actions/articles`)
```ts
type ArticleCategory = 'CV' | 'INTERVIEW' | 'SALARY' | 'CAREER' | 'WORKPLACE';
type ArticleSummary = { id: string; slug: string; title: string; excerpt: string; category: ArticleCategory;
  coverImage: string;           // '/images/articles/<category viết thường>.svg' (ảnh tĩnh Antigravity)
  readingMinutes: number; publishedAt: string; views: number };
type Article = ArticleSummary & { content: string };   // Markdown rút gọn: '## ', '### ', '- ', '1. ', **đậm**, đoạn văn; KHÔNG HTML
listArticles(filter: { category?: ArticleCategory; q?: string; page?: number }): Promise<Page<ArticleSummary>>   // chỉ PUBLISHED, mới nhất trước, pageSize 12
getArticle(slug: string): Promise<(Article & { related: ArticleSummary[] }) | null>   // tăng views; related ≤ 3 cùng danh mục
// Admin:
listAdminArticles(filter: { status?: 'DRAFT' | 'PUBLISHED'; page?: number }): Promise<Page<ArticleSummary & { status: 'DRAFT' | 'PUBLISHED' }> | null>
getAdminArticle(id: string): Promise<(Article & { status: 'DRAFT' | 'PUBLISHED' }) | null>
saveArticleAction(input: { id?: string; title: string; slug?: string; excerpt: string; category: ArticleCategory; content: string }): Promise<ActionResult<Article>>
  // title 5–200; slug tự sinh không dấu từ title nếu thiếu, duy nhất; excerpt 20–300; content 100–50000
setArticlePublishedAction(input: { id: string; published: boolean }): Promise<ActionResult<null>>   // ghi audit
```
Frontend render Markdown rút gọn bằng component tự viết, escape mọi ký tự HTML (không `dangerouslySetInnerHTML` với nội dung thô). Dữ liệu mẫu: ≥ 12 bài tự viết (không sao chép nguồn ngoài).

### 47 — Gói dịch vụ / tin nổi bật (`@/actions/billing`)
```ts
type ServicePackage = { id: string; code: string; name: string; description: string;
  priceVnd: number; durationDays: number; active: boolean };   // mặc định TOP_7 / TOP_14 / TOP_30
type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED';
type Order = { id: string; packageName: string; postingId: string; postingTitle: string;
  amountVnd: number; status: OrderStatus; createdAt: string; paidAt: string | null; featuredUntil: string | null };
listPackages(): Promise<ServicePackage[]>                     // gói active
createOrderAction(input: { packageId: string; postingId: string }): Promise<ActionResult<Order>>   // Employer; tin PUBLISHED của mình; amount = giá gói lúc đặt
payOrderAction(input: { orderId: string }): Promise<ActionResult<Order>>
  // THANH TOÁN GIẢ LẬP — không thu tiền thật. PENDING → PAID; featured_until = max(now, featured_until) + durationDays; notification ORDER_PAID
cancelOrderAction(input: { orderId: string }): Promise<ActionResult<Order>>   // chỉ PENDING
listMyOrders(): Promise<Order[]>
// Admin:
listAdminPackages(): Promise<ServicePackage[] | null>
savePackageAction(input: { id?: string; code: string; name: string; description: string; priceVnd: number; durationDays: number; active: boolean }): Promise<ActionResult<ServicePackage>>
  // code A–Z0–9_ 2–30 duy nhất; priceVnd 0–100.000.000; durationDays 1–90; ghi audit
listAdminOrders(filter: { status?: OrderStatus; page?: number }): Promise<Page<Order & { employerEmail: string; companyName: string }> | null>
```
`PostingSummary`/`PostingDetail` bổ sung `featured: boolean` (featured_until > now). Danh sách công khai: tin nổi bật lên đầu khi sort = 'newest'; trang chủ có khối "Việc làm nổi bật" (≤ 6). `AdminStats` bổ sung `revenue: { paidOrders: number; totalVnd: number; last30DaysVnd: number }`. Trang thanh toán ghi rõ "Thanh toán giả lập — không thu tiền thật".

### Routes v5 (Codex)

| Route | Ai vào được | Ticket |
|---|---|---|
| `/interviews` | Candidate, Employer | 40 |
| `/messages`, `/messages/[applicationId]` | Candidate, Employer (2 bên của đơn) | 41 |
| `/candidate/cv`, `/candidate/cv/print` | Candidate | 42 |
| `/employer/applications/[id]/cv` | Employer chủ tin | 42 |
| `/employer/talent`, `/employer/talent/[id]`, `/employer/talent/saved` | Employer | 43 |
| `/candidate/alerts` | Candidate | 44 |
| `/admin/reviews` | ADMIN | 45 |
| `/guide`, `/guide/[slug]` | mọi người | 46 |
| `/admin/articles`, `/admin/articles/new`, `/admin/articles/[id]` | ADMIN | 46 |
| `/employer/billing`, `/employer/billing/checkout/[orderId]` | Employer | 47 |
| `/admin/packages`, `/admin/orders` | ADMIN | 47 |

Middleware: thêm `/interviews`, `/messages` (đã đăng nhập), `/employer/*`, `/candidate/*`, `/admin/*` như cũ.
