# Coding Standards — Job Portal

Tiêu chuẩn bắt buộc cho toàn bộ mã nguồn (Next.js 15, Supabase PostgreSQL, TypeScript, Vitest).

## 1. Deep Modules & Seams

1. Mỗi domain (`src/modules/<domain>/`) giấu logic nghiệp vụ sau một interface nhỏ (3–5 phương thức công khai), không để lộ cấu trúc bảng hay SQL.
2. Tầng domain không import Next.js hoặc Supabase Client. Mọi truy cập dữ liệu đi qua interface repository (ví dụ `IJobPostingRepository`, `IApplicationRepository`).
3. Mỗi seam có tối thiểu 2 adapter:
   - `InMemory` adapter cho unit test nhanh, không mock mạng.
   - `Supabase` adapter dùng `@supabase/supabase-js` thật.
4. Cấu trúc thư mục mỗi domain: `domain/` (types, errors), `adapters/` (in-memory, supabase), `index.ts` (service + export công khai).

## 2. Type Safety

1. `strict: true`, không dùng `any` ngoài test stub.
2. Branded types cho định danh dễ nhầm (`JobPostingId`, `ApplicationId`, `CandidateId`, `EmployerId`).
3. Mọi input từ client vào Server Actions phải qua Zod `safeParse` trước khi gọi domain service.
4. Server Actions lấy service qua factory phía server (đọc session Supabase), không nhận service từ client.

## 3. Tính toàn vẹn dữ liệu

1. **State Machine**: chuyển `Posting Status` và `Application Status` chỉ qua bảng transition hợp lệ trong domain; database có `CHECK` trên cột status.
2. **Atomic writes**: thao tác chạm nhiều bảng (ví dụ nộp đơn + ghi lịch sử trạng thái) đóng gói trong một stored procedure / RPC. Không ghi nhiều lệnh rời rạc từ tầng ứng dụng.
3. **Ràng buộc ở database**: quy tắc chống trùng (ví dụ một ứng viên nộp trùng một tin) phải có `UNIQUE`/constraint ở PostgreSQL, không chỉ kiểm tra ở ứng dụng (tránh Check-Then-Act race condition).
4. **Row Level Security**: bật RLS trên mọi bảng. Ứng viên chỉ đọc đơn của mình; nhà tuyển dụng chỉ đọc đơn nộp vào tin của mình; tin DRAFT chỉ chủ sở hữu thấy.
5. **Thời gian**: dùng `timestamptz`, so sánh hạn nộp phía database (`now()`), không tin giờ client.

## 4. Kiểm thử (TDD & Vitest)

1. Viết test trước (Red-Green-Refactor) qua interface công khai của service.
2. Unit test dùng `InMemory` adapter, toàn bộ suite chạy dưới vài giây.
3. Dùng `fromPartial<T>()` từ `@total-typescript/shoehorn` thay cho ép kiểu `as T`.
4. Dọn hết log debug trước khi commit.

## 5. Fowler Code Smells Baseline (Refactoring, Ch.3)

Rà soát định kỳ: Mysterious Name, Duplicated Code, Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change, Speculative Generality, Message Chains, Middle Man, Refused Bequest.
