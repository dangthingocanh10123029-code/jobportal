# 51: Lỗi hydration React #418 ngẫu nhiên trên production

**What to build:** Tìm nguyên nhân gốc và sửa lỗi `Minified React error #418` (args `HTML`) xuất hiện ngẫu nhiên khi khách tải `/`, `/guide`, `/companies`, `/jobs/[id]` trên bản `next start` / Vercel (~5–10% lượt), không xuất hiện ở `next dev`. Nội dung text HTML server và DOM sau render giống hệt nhau.

**Blocked by:** —

**Status:** in-progress (người dùng chọn nâng Next 16.4)

## Đã biết
- Có từ trước redesign 50 (manual-checks v4), nên không do redesign gây ra.
- Không do giờ tương đối: client component trên các trang này không dùng `Date.now`; tái hiện được trên cùng máy, cùng múi giờ.
- Nghi: cấu trúc chung (layout, SiteHeader, streaming/Suspense, middleware), HTML lồng sai (`<a>` trong `<a>`, `<div>` trong `<p>`, `<form>` lồng nhau) bị trình duyệt sửa lại, hoặc script/extension chèn vào `<html>/<body>`.

## Cách làm gợi ý
- Bắt `componentStack` ở production: dùng `onRecoverableError`/`reportError` hoặc build có `NEXT_PUBLIC_*` debug tạm thời; hoặc so sánh HTML thô (curl) với DOM ngay trước hydrate (`document.documentElement.outerHTML` trong `addInitScript` lúc DOMContentLoaded).
- Chia đôi: tạm tắt từng khối (header, grain overlay, các khối trang chủ) trên một build thử để khoanh vùng.
- Sửa nguyên nhân gốc, không `suppressHydrationWarning` đại trà.

## Chấp nhận
- [ ] 200 lượt tải lặp `/`, `/guide`, `/companies`, `/jobs/[id]` trên `next start` không còn #418
- [ ] E2E bước console trở lại FAIL khi có #418 (bỏ WARN tạm)
- [ ] npm test, typecheck, next build xanh

## Nguyên nhân gốc (đã xác định)
Bug React 19.2.0-canary-0bdb9206 đóng gói trong Next 15.5.28: Flight tách phần tử sau ~3200 byte/dòng thành tham chiếu lazy (`$L`); nếu dòng chưa tới khi hydrate, một thẻ host (ở `/` là `div.browse-layout`) suspend trong reconcileChildren; khi replay (`replaySuspendedUnitOfWork`, case 5) React gọi lại beginWork mà không reset con trỏ hydrate → claim nhầm con đầu (`<form>`) → #418, root render lại phía client. Vá 7 dòng của React 19.3 cho 0/360 lượt. Next 16.4.2 (React 19.3 canary) đã có bản sửa; 15.x chưa có. Người dùng chọn nâng Next 16.4.
