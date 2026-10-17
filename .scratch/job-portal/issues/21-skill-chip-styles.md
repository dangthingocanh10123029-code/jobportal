# 21: Style chip kỹ năng

**What to build:** E2E sau /code-review phát hiện `.skill-tag` chưa bao giờ có CSS (từ 14B): kỹ năng ở trang tin hiện dính liền ("ExcelMISA"), tag trong ô nhập không có kiểu.

**Blocked by:** 14, 16

**Status:** resolved

- [x] `.skill-tag` chip dùng chung (trang tin, thẻ tin, ô nhập tag), nút × có hover + focus ring
- [x] `.posting-skill-list` flex-wrap gap 8px

## Phân công (Orca)
- **Phần B — Codex:** toàn bộ ticket (chỉ `src/app/globals.css`).
