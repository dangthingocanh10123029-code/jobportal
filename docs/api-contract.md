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
Tài khoản bị khóa: `signInAction` trả 'Tài khoản đã bị khóa: <lý do>'; mọi API trả 403 cùng thông báo; middleware đăng xuất + chuyển `/login?error=locked`.

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

