# ADR-0002: Mỗi Candidate chỉ nộp một Application cho mỗi Job Posting

**Status:** Accepted — 2026-10-16

## Decision
Ràng buộc `UNIQUE (job_posting_id, candidate_id)` trên bảng applications. Application đã REJECTED hoặc WITHDRAWN vẫn chặn nộp lại.

## Consequences
- Chặn nộp trùng ngay ở database, an toàn khi hai request đến cùng lúc (không Check-Then-Act).
- Ứng viên muốn đổi CV sau khi nộp phải liên hệ Employer ngoài hệ thống; chấp nhận cho phạm vi đồ án.
