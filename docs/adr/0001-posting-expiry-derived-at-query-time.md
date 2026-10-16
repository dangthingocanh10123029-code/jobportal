# ADR-0001: Trạng thái EXPIRED của Job Posting tính lúc truy vấn

**Status:** Accepted — 2026-10-16

## Context
Job Posting có Application Deadline. Khi qua hạn, tin không được nhận đơn và không hiện trong kết quả tìm kiếm.

## Decision
Database chỉ lưu `DRAFT | PUBLISHED | CLOSED`. EXPIRED là trạng thái suy ra: `status = 'PUBLISHED' AND application_deadline < now()`. Mọi truy vấn công khai và thao tác nộp đơn đều kiểm tra điều kiện này phía database.

## Consequences
- Không cần cron job, không có khoảng trễ giữa lúc hết hạn và lúc tin bị ẩn.
- Employer gia hạn tin chỉ cần sửa deadline, tin tự hiện lại.
- Truy vấn phải luôn kèm điều kiện deadline; gom vào một view/hàm dùng chung để không bị sót.
