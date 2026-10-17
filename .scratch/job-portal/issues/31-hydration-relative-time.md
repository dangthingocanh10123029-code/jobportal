# 31: Sửa hydration mismatch thời gian thông báo

**What to build:** E2E phát hiện Next dev overlay "1 Issue" ở `/notifications` khi thông báo vừa tạo: `relativeTime()` gọi `Date.now()` trong client component render cả server lẫn client.

**Blocked by:** 17

**Status:** resolved

- [x] SSR + hydrate hiện giờ tuyệt đối cố định (giờ Việt Nam), sau mount mới đổi sang tương đối và tự cập nhật mỗi 30 s
- [x] E2E thêm bước bắt mọi lỗi console/pageerror → 0

## Phân công (Orca)
- **Codex:** toàn bộ ticket.
