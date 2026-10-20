# 52: Đăng tin xong badge "Đang đăng" đôi khi không cập nhật

**What to build:** Ở `/employer/postings`, bấm "Đăng tin": API publish trả 200 nhưng thỉnh thoảng `router.refresh()` không cập nhật badge sang "Đang đăng" trong 45 giây (E2E v5 bắt được 1 lần / 4 lượt chạy). Tìm nguyên nhân (cache router, revalidatePath thiếu, race giữa refresh và action) và sửa để trạng thái luôn cập nhật sau khi đăng/đóng tin.

**Blocked by:** —

**Status:** ready-for-agent

## Gợi ý
- `src/components/postings/posting-controls.tsx` (`changeStatus`) và action `publishPostingAction`/`closePostingAction`: cân nhắc `revalidatePath('/employer/postings')` trong Server Action thay vì chỉ `router.refresh()` phía client, hoặc trả trạng thái mới để cập nhật cục bộ.

## Chấp nhận
- [ ] Bước E2E "Đăng tin → badge Đang đăng" PASS 10/10 lượt chạy lặp
- [ ] npm test, typecheck, next build xanh
