# Coding Standards — Job Portal

Tiêu chuẩn bắt buộc cho toàn bộ mã nguồn (Next.js 15, Supabase PostgreSQL, TypeScript, Vitest).

## 1. Deep Modules & Seams (kiến trúc v3, ADR-0003)

1. Nghiệp vụ nằm ở backend FastAPI: mỗi domain `backend/app/modules/<domain>/` giấu logic sau một service nhỏ, không để lộ cấu trúc bảng hay SQL ra router.
2. Tầng domain/service không import FastAPI hay psycopg. Mọi truy cập dữ liệu đi qua repository `Protocol`.
3. Mỗi seam có tối thiểu 2 adapter:
   - `memory.py` (InMemory) cho pytest nhanh, không mock mạng.
   - `postgres.py` chạy trong `app.db.user_tx(claims)` — luôn dưới role `authenticated`/`anon` của người gọi để RLS/RPC giữ hiệu lực; không truy vấn bằng quyền `postgres`.
4. Cấu trúc mỗi domain: `domain.py`, `repository.py`, `memory.py`, `postgres.py`, `service.py`, `router.py` (+ `schemas.py`, `storage.py` khi cần).
5. Next.js là frontend: Server Action trong `src/actions/` chỉ chạy Zod `safeParse` rồi gọi `apiFetch` (`src/lib/api.ts`). Ngoại lệ có chủ đích: auth flows (Supabase Auth, cookie) và `getCurrentActor` trong proxy (`src/proxy.ts`, trước là middleware) đọc Supabase trực tiếp.

## 2. Type Safety

1. `strict: true`, không dùng `any` ngoài test stub.
2. Branded types cho định danh dễ nhầm (`JobPostingId`, `ApplicationId`, `CandidateId`, `EmployerId`).
3. Mọi input từ client vào Server Actions phải qua Zod `safeParse` trước khi gọi API; backend validate lại bằng Pydantic/domain (không tin Next).
4. Server Actions gửi access token của session tới API (`Authorization: Bearer`); API xác minh JWT bằng JWKS, không nhận định danh người dùng từ body.

## 3. Tính toàn vẹn dữ liệu

1. **State Machine**: chuyển `Posting Status` và `Application Status` chỉ qua bảng transition hợp lệ trong domain; database có `CHECK` trên cột status.
2. **Atomic writes**: thao tác chạm nhiều bảng (ví dụ nộp đơn + ghi lịch sử trạng thái) đóng gói trong một stored procedure / RPC. Không ghi nhiều lệnh rời rạc từ tầng ứng dụng.
3. **Ràng buộc ở database**: quy tắc chống trùng (ví dụ một ứng viên nộp trùng một tin) phải có `UNIQUE`/constraint ở PostgreSQL, không chỉ kiểm tra ở ứng dụng (tránh Check-Then-Act race condition).
4. **Row Level Security**: bật RLS trên mọi bảng. Ứng viên chỉ đọc đơn của mình; nhà tuyển dụng chỉ đọc đơn nộp vào tin của mình; tin DRAFT chỉ chủ sở hữu thấy.
5. **Thời gian**: dùng `timestamptz`, so sánh hạn nộp phía database (`now()`), không tin giờ client.

## 4. Kiểm thử (TDD — pytest + Vitest)

1. Viết test trước (Red-Green-Refactor) qua interface công khai của service.
2. Unit test domain viết bằng pytest với InMemory repo (`cd backend && uv run pytest`); Vitest chỉ test Zod của Server Action, `apiFetch` và hàm thuần ở `src/lib`. Cả hai suite chạy dưới vài giây.
3. Dùng `fromPartial<T>()` từ `@total-typescript/shoehorn` thay cho ép kiểu `as T`.
4. Dọn hết log debug trước khi commit.

## 5. Fowler Code Smells Baseline (Refactoring, Ch.3)

Rà soát định kỳ: Mysterious Name, Duplicated Code, Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change, Speculative Generality, Message Chains, Middle Man, Refused Bequest.
