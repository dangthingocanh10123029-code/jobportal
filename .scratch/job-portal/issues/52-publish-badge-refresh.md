# 52: Đăng tin xong badge "Đang đăng" đôi khi không cập nhật

**What to build:** Ở `/employer/postings`, bấm "Đăng tin": API publish trả 200 nhưng thỉnh thoảng `router.refresh()` không cập nhật badge sang "Đang đăng" trong 45 giây (E2E v5 bắt được 1 lần / 4 lượt chạy). Tìm nguyên nhân (cache router, revalidatePath thiếu, race giữa refresh và action) và sửa để trạng thái luôn cập nhật sau khi đăng/đóng tin.

**Blocked by:** —

**Status:** resolved (d49134d)

## Gợi ý
- `src/components/postings/posting-controls.tsx` (`changeStatus`) và action `publishPostingAction`/`closePostingAction`: cân nhắc `revalidatePath('/employer/postings')` trong Server Action thay vì chỉ `router.refresh()` phía client, hoặc trả trạng thái mới để cập nhật cục bộ.

## Chấp nhận
- [ ] Bước E2E "Đăng tin → badge Đang đăng" PASS 10/10 lượt chạy lặp
- [ ] npm test, typecheck, next build xanh

## Nguyên nhân gốc
Ở production (Next 15.5.28 + React 19.2.0-canary-0bdb9206), cập nhật RSC trên cùng trang (router.refresh / revalidatePath) bên dưới Suspense boundary của `loading.tsx` làm transition suspend vĩnh viễn: dữ liệu đúng nhưng UI không đổi. Sửa: bỏ `src/app/employer/postings/loading.tsx`, action publish/close gọi revalidatePath. 10/10 PASS. `candidate/applications` và `employer/dashboard` còn loading.tsx + router.refresh: kiểm lại sau khi nâng Next 16 (ticket 51).
