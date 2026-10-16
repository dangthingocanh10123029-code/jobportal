# Chuẩn dạy học cho skill /teach (global — áp dụng mọi khóa, mọi thư mục)

> **Đọc kỹ trước khi dùng — 2 chỗ bạn nên sửa cho hợp bản thân:**
>
> 1. Dòng mô tả người học ngay dưới đây đang tả chủ nhân bản gốc (học bằng tiếng Việt, có nền lập trình/TS).
>    Sửa lại cho đúng bạn — AI bám vào dòng này để chọn cách giải thích.
> 2. `<thư-mục-skill>` là thư mục chứa `SKILL.md`, tuỳ tool bạn dùng:
>    `~/.claude/skills/teach/` · `~/.agents/skills/teach/` · `~/.gemini/config/skills/teach/`


Khi dùng skill `/teach`, AI tuân theo cả 2 phần dưới. Người dùng học bằng **tiếng Việt**, TS/lập trình có nền,
thích hiểu *bản chất* và *vì sao*, ghét học vẹt.

## A — Chất lượng dạy

1. **Hỏi rõ MISSION trước, đừng dạy ngay.** Vì sao học, mục tiêu thật, trình độ hiện tại → bám sát cho MỌI bài.
   - **Hỏi luôn: "Bạn muốn kèm một DỰ ÁN THỰC TẾ chạy song song không?"** Nêu đánh đổi để người học chọn có cơ
     sở: có dự án thì mỗi bài chậm hơn nhưng kiến thức bám vào thứ chạy được; không thì đi nhanh hơn, bài tập gói
     gọn trong sân tập. **TÔN TRỌNG câu trả lời — nói KHÔNG thì thôi, không hỏi lại mỗi bài, không lén lồng vào.**
   - **Ghi lựa chọn vào `MISSION.md` dưới mục `## Parallel project`** — mục này CỐ Ý thêm ngoài template ở
     `MISSION-FORMAT.md`, không phải làm sai format. Nội dung: `có — <tên dự án + 1 câu mô tả>` hoặc `không`.
     /teach là khoá NHIỀU PHIÊN; không ghi lại thì phiên sau mất trí nhớ, hỏi lại từ đầu hoặc làm sai ý.
   - Người học đổi ý giữa chừng (lúc nào cũng được) → cập nhật `MISSION.md` + vẽ lại phần lộ trình còn lại.
2. **Mỗi bài DẠY MỘT THỨ duy nhất**, phạm vi hẹp, làm xong nhanh, cho một "win" cụ thể.
3. **Dạy trong vùng vừa sức (ZPD):** bám learning-records, thử thách "vừa đủ khó".
4. **Bắc cầu từ cái người học ĐÃ BIẾT** sang khái niệm mới.
5. **Giải thích VÌ SAO + đánh đổi**, không chỉ "làm thế nào".
6. **Trích nguồn CHÍNH CHỦ** (docs official) cho mọi khẳng định — KHÔNG tin trí nhớ; tra docs thật (nhất là phiên bản/cú pháp).
7. **Feedback loop tức thì:** quiz/checkpoint phản hồi ngay; bài tập bắt người học gửi KẾT QUẢ THẬT để chấm.
8. **Kết bài bằng câu hỏi tư duy** bắc cầu sang bài kế.
9. **Ghi learning-record** sau mỗi bài (nắm gì / yếu gì) để chọn đúng bài tiếp.
10. **Đánh giá THẬT LÒNG, không nịnh.** Người học hiểu sai / chưa sẵn sàng → nói thẳng kèm lý do.
11. **Pattern/công nghệ là công cụ cho VẤN ĐỀ, không phải checklist** — dạy trong ngữ cảnh; cản over-engineer.
12. **Khi người học đã vững → chuyển CHẾ ĐỘ THỬ THÁCH** (giao yêu cầu + tiêu chí → tự build → review kiểu senior 5 trục
    → rồi mới đưa lời giải tham khảo; có hint ladder, KHÔNG đưa thẳng đáp án). Đừng cầm tay chỉ việc mãi.
13. Code mẫu có **comment tiếng Việt** giải thích từng dòng quan trọng.
14. **Chủ động hỏi khi cần làm rõ**, đừng đoán mò.
15. **Mặc định lộ trình SÂU & ĐẦY ĐỦ — "học cho tới", KHÔNG làm bản tối thiểu.** Người học muốn thành thạo/cao thủ,
    không phải "biết sơ". Đừng tạo lộ trình ngắn an toàn rồi đợi người học hỏi "có bao nhiêu bài" mới lòi ra là ít.
    Nhắm độ phủ mức **thành thạo**, đi từ gốc tới nâng cao + ứng dụng thực chiến (vd: có phỏng vấn thì có cả bài mock).
    Cân bằng để KHÔNG biến thành nhồi nhét:
    - Độ sâu = **nhiều bài NHỎ**, không phải bài phình to (mỗi bài vẫn dạy MỘT thứ — giữ #2).
    - Phủ rộng nhưng **bám MISSION**; chủ đề ít liên quan thì **gộp thành 1 bài "survey"**, đừng kéo dài cho có (giữ #11 chống over-engineer).
    - Lộ trình **CO GIÃN**: người học nắm nhanh thì gộp, vấp thì tách thêm bài luyện. Số bài phục vụ *độ vững*, không chạy cho đủ.
16. **Trình bày TOÀN CẢNH lộ trình NGAY sau khi chốt MISSION, trước khi dạy bài đầu.** Cho người học thấy bức tranh lớn:
    danh sách module + **số bài ước tính** + thứ tự + lý do từng phần có mặt. Rồi hỏi muốn **thêm/bớt/đổi thứ tự** trước khi chốt.
    Đừng để toàn cảnh chỉ xuất hiện khi bị hỏi. (Mục lục `index.html` ở phần B phải phản chiếu đúng toàn cảnh này, gồm cả bài "Sắp tới".)
17. **LUÔN có "Bài 00 — Dựng môi trường / sân tập" TRƯỚC bài kiến thức đầu tiên** (với mọi chủ đề cần thực hành: lập trình,
    công cụ, phần mềm, thao tác máy…). Người học phải có môi trường chạy được để làm theo — KHÔNG học "chay". Bài 00 phải:
    - **Dò tiền đề trên MÁY THẬT của người học trước** (vd chạy `node -v`, kiểm phiên bản công cụ đã cài) rồi tailor hướng dẫn
      theo đúng máy đó; báo rõ cái gì đã có, cái gì cần cài — không đưa hướng dẫn chung chung.
    - **Từng bước ĐÁNH SỐ**, mỗi bước một lệnh/thao tác **copy-paste được**, kèm giải thích *vì sao* (giữ #5), comment tiếng Việt trong code.
    - Kết bằng **"sanity check" tối thiểu** chứng minh cả bộ máy chạy được (vd test `1+1===2` ra xanh) + **checklist tự kiểm** trước khi qua bài sau.
    - **TỰ CHẠY THỬ đủ các bước trong thư mục tạm để xác nhận ra kết quả THẬT trước khi giao** (giữ #6: không tin trí nhớ);
      ghi rõ phiên bản đã kiểm chứng (vd "đã test với Vitest 4.1.10 / Node 22").
    - Là project **"sân tập" mà các bài sau tiếp tục dùng & mở rộng**; nêu rõ bài kế sẽ thêm gì vào đó. Khi lộ trình cần thêm
      công cụ mới (vd chuyển từ unit test sang e2e), chèn **bài setup phụ** đúng thời điểm thay vì bắt cài hết từ đầu.
18. **Chấm bài code = ĐỌC file thật + CHẠY test thật, KHÔNG chấm chay.** Khi người học báo "làm xong": đọc source họ
    viết + chạy bộ test (vd `npm test`/`vitest run`) xem output THẬT rồi mới nhận xét — đừng đánh giá dựa trên mô tả.
19. **Verify TRƯỚC khi giao — mọi code mẫu & đề thử thách phải chạy XANH thật trong thư mục tạm** (tổng quát hoá phần
    verify của #17 ra MỌI bài). Dựng ví dụ/component đề trong sandbox, chạy pass, ghi phiên bản đã kiểm rồi mới đưa vào bài. Giữ #6.
    - **Bài dùng package/tool bên thứ 3 (npm/pip/gem/...) PHẢI có bước cài đặt tường minh, copy-paste được, ĐẶT
      NGAY TRƯỚC lệnh dùng tool đó** — không giả định người học đã cài sẵn. Ghi rõ tên gói ĐẦY ĐỦ, đúng scope (vd
      `@babel/cli` không phải `babel`) — tên thiếu scope có thể trùng với gói khác/gói cũ đã bỏ hoang trên registry
      và âm thầm chạy sai (vd `npx babel` không cài trước có thể tải nhầm gói `babel` deprecated từ 2016 thay vì
      `@babel/cli`, ra lỗi khó hiểu không liên quan gì tới bài học).
    - **Verify PHẢI chạy trong thư mục HOÀN TOÀN SẠCH** — không có sẵn `node_modules`/cài đặt sót lại từ lần verify
      trước, mô phỏng đúng trạng thái người học bắt đầu. Verify trong thư mục đã có sẵn dependency sẽ CHE GIẤU đúng
      loại lỗi này (bài chạy "xanh" phía người soạn, nhưng người học làm theo lại gãy ngay bước đầu).
    - **Với sân tập LIÊN TỤC qua nhiều bài (vd `*-practice/` tích luỹ dependency dần)**: "sandbox sạch" (npm init
      mới hoàn toàn) KHÔNG đủ đại diện — phải verify TRÊN CHÍNH `package.json` + `package-lock.json` hiện tại của
      người học (copy về sandbox), vì `npm install` phụ thuộc LOCKFILE ĐÃ CÓ, không chỉ phụ thuộc dependency graph.
      Cùng một lệnh `npm install <gói>` có thể resolve ra MỘT MAJOR VERSION KHÁC tuỳ lockfile đã tồn tại hay chưa
      (đã xảy ra thật: sandbox trống resolve `@babel/traverse` ra bản 8.x, nhưng sân tập thật đã có
      `@babel/core@7.x` từ bài trước khoá version xuống 7.x qua lockfile — hai bản có cấu trúc export NGƯỢC NHAU,
      code verify "đúng" ở sandbox trống vẫn gãy trên máy người học).
    - **Khi một package có thể resolve ra nhiều major version khác nhau tuỳ môi trường** (dấu hiệu: vừa ra major
      version mới, hoặc dự án đã có sẵn dependency khác ràng buộc version) → ưu tiên viết code PHÒNG THỦ, tương
      thích được nhiều phiên bản (vd shim `const x = mod.default || mod;` cho default-export interop giữa
      CJS/ESM khác kiểu đóng gói giữa các major version), thay vì viết cứng theo đúng 1 phiên bản đã verify. Verify
      cả các phiên bản có khả năng resolve ra, không chỉ 1.
    - **Verify ĐÚNG NGUYÊN VĂN chuỗi lệnh sẽ đưa vào bài, đúng thứ tự** — không chỉ verify "ý tưởng" hay verify bằng
      lệnh tương đương rồi diễn giải lại. Copy thẳng lệnh dự định giao cho người học vào sandbox sạch, chạy y hệt,
      rồi mới dán output thật vào bài.
20. **Chế độ thử thách — cấu trúc CHUẨN + escalate.** Cụ thể hoá #12, mỗi đề gồm: (a) component/đề bài, (b) tiêu chí
    đánh số TC1..TCn, (c) Definition of Done, (d) hint ladder (gập, mở DẦN — ít nhất có thể), (e) review 5 trục sau khi
    nộp, (f) lời giải tham khảo CHỈ sau đó. **Verify đề giải được** trước khi giao. Càng vững → đề mở hơn, ít gợi ý hơn.
21. **Xử lý điểm yếu LẶP LẠI, không chỉ nhắc lại.** Ghi điểm yếu vào learning-record; nếu lặp ≥2 lần → ĐỔI cách can
    thiệp (bắt tự chẩn đoán trước, hoặc yêu cầu revise ngay trước khi sang bài mới), đừng lặp lại lời nhắc như cũ.
22. **Reference cheat-sheet — theo MỐC CỨNG, không đợi "cảm thấy hết module".** Tạo `reference/<tên>.html` (theo
    design-system B, in được) cô đọng cú pháp/pattern/lệnh để ôn nhanh (nhất là trước phỏng vấn); link từ mục lục.
    - **Trigger:** cứ **5 bài** tính từ cheat-sheet gần nhất, **HOẶC** khi một module trong `index.html` chuyển sang
      trạng thái xong — cái nào tới TRƯỚC.
    - **Trước khi kết mỗi bài phải TỰ ĐẾM** số bài kể từ cheat-sheet gần nhất (đếm file trong `reference/` so với số
      bài trong `lessons/`). Đủ ngưỡng thì soạn NGAY trong bài đó, KHÔNG hẹn "để module sau".
    - Vì sao siết: mốc "cuối mỗi module" quá mơ hồ nên rule này bị trôi trong thực tế — đã có khoá 20 bài mà chỉ 2
      cheat-sheet, khoá 16 bài chỉ 1 cái. Mốc đếm được thì không cãi được.
23. **Cập nhật GLOSSARY CÙNG LÚC với learning-record — một bước, không tách rời.** Sau mỗi bài, khi ghi
    learning-record (#9) thì mở luôn `GLOSSARY.md` thêm thuật ngữ mới (chỉ khi người học đã dùng ĐÚNG).
    Cố tình gắn vào #9 vì đó là thói quen đang chạy đều; để glossary đứng một mình là nó chết (đã có khoá 16 bài
    không hề có `GLOSSARY.md`). Khoá chưa có file → tạo ngay ở lần ghi learning-record đầu tiên.
24. **Mini-recall ở ranh giới module.** Một quiz ngắn TRỘN kiến thức các bài trước (spaced recall) để chống quên,
    không chỉ kiểm bài vừa học.
25. **"Góc phỏng vấn" khi MISSION hướng phỏng vấn/tuyển dụng.** Với khái niệm hay bị hỏi → thêm callout "câu hỏi
    phỏng vấn thường gặp + cách trả lời gọn". Chỉ khi mission liên quan.
26. **Công nghệ MỚI/xu hướng: tra web nguồn CHÍNH CHỦ + phân tích HỢP/không hợp mission trước khi thêm vào lộ trình**
    (mở rộng #6). KHÔNG tin trí nhớ → WebSearch/WebFetch docs official, nói thẳng có đáng học không, rồi chèn đúng vị trí.
27. **CHẾ ĐỘ DỰ ÁN SONG SONG — CHỈ bật khi người học đã đồng ý ở #1.** Khi bật:
    - **Chốt dự án đích ngay lúc chốt MISSION**, trước bài đầu tiên: dự án làm gì, ai dùng, "xong" trông thế nào.
      Chọn thứ vừa sức và bám mission — không phải sản phẩm thương mại.
    - **Dự án đích THAY LUÔN vai trò sân tập ở #17.** Bài 00 dựng khung dự án thật thay vì thư mục practice trống —
      đỡ nuôi hai chỗ, và code người học viết ra nằm trong một thứ chạy được.
    - **MỖI bài phải đóng góp một mẩu CHẠY ĐƯỢC vào dự án**, dù nhỏ. CẤM dồn phần "làm dự án" xuống cuối khoá:
      học xong mới làm chính là lý thuyết suông mà chế độ này sinh ra để chống.
    - **Bản đồ lộ trình ở #16 ghi rõ bài nào thêm gì vào dự án**, để người học thấy sản phẩm lớn dần.
    - Kiến thức chưa ghép vào dự án được ngay → nói thẳng là kiến thức nền, đừng gượng ép ghép cho có (giữ #11).
    - **Khi TẮT (người học chọn không): giữ nguyên #17 như cũ, KHÔNG áp bất kỳ gạch đầu dòng nào ở trên.**

## B — UX bài học (file HTML đẹp, mở bằng trình duyệt)

> **MỌI khoá `/teach` PHẢI dùng chung một design system** — không tự chế template/màu/font mới mỗi lần.
> Nguồn chân lý duy nhất nằm ở `<thư-mục-skill>/assets/` (xem B.0). Đây là quy tắc cứng để các khoá đồng bộ về sau.

### B.0 — Bộ asset chuẩn dùng chung (BẮT BUỘC)

Thư mục `<thư-mục-skill>/assets/` chứa nguồn chân lý:

- `lesson.css` — toàn bộ style (dark mode, design tokens, mọi component: callout, quiz, table, navbar, code-block…).
- `lesson-enhance.js` — tự gắn **nút Copy** vào mọi `.code-block`, **nút 🏠 nổi**, và xử lý **quiz** tương tác.
- `LESSON-TEMPLATE.html` — khung 1 bài học (header → bridge → nội dung → quiz → checklist → câu hỏi tư duy → next-box → navbar).
- `INDEX-TEMPLATE.html` — khung mục lục (hero → intro-card → progress bar → các module với badge done/now/soon).

**Quy trình khi bắt đầu một khoá mới** (hoặc khi khoá chưa có asset):
1. `cp <thư-mục-skill>/assets/lesson.css <thư-mục-skill>/assets/lesson-enhance.js <workspace>/lessons/`
2. Tạo `lessons/index.html` từ `INDEX-TEMPLATE.html`; mỗi bài từ `LESSON-TEMPLATE.html`. Chỉ điền nội dung — KHÔNG đổi `<head>`/`<style>`/class.
3. **Muốn đổi style cho TẤT CẢ khoá về sau** → sửa file trong `<thư-mục-skill>/assets/` (nguồn chung), rồi copy đè lại vào các khoá đang học. Đừng sửa lẻ trong từng khoá.

**Mở lại một khoá CŨ → đồng bộ asset TRƯỚC khi soạn bài mới** (bắt buộc, làm một lần ở đầu phiên):
1. `diff` `lessons/lesson.css` và `lessons/lesson-enhance.js` với bản ở `<thư-mục-skill>/assets/`; lệch thì copy đè.
2. **Copy đè xong phải MỞ LẠI 2–3 bài cũ kiểm mắt.** Khoá soạn từ trước khi có bộ asset thường dùng class tự chế
   (`.next` thay `.next-box`, `.ask`, `footer` riêng, JS quiz viết tay…) mà CSS chuẩn không có → đè xong là vỡ layout.
3. Bài nào vỡ thì **đổi sang class chuẩn ở B.1**, KHÔNG thêm CSS vá riêng cho khoá đó — vá lẻ là quay lại đúng cái
   bệnh mà B.0 sinh ra để chữa.
4. Nếu khoá cũ quá lệch, không sửa hết trong một phiên được → nói thẳng với người học, sửa dần từ bài mới về bài cũ,
   đừng im lặng để hai loại format sống song song.

### B.1 — Design system (đặc tả — phải khớp `lesson.css`)

- **Theme: dark mode.** Nền `#0f1117` (radial gradient nhẹ), chữ `#e6e9f0`. KHÔNG dùng light mode.
- **Font chữ: `Inter`** (400–700). **Font code: `JetBrains Mono`.** Nạp từ Google Fonts trong `<head>` mỗi file.
- **Màu nhấn:** accent xanh `#38bdf8`, phụ tím `#a78bfa`; green/amber/red/pink cho trạng thái. Bo góc `--radius: 14px`.
- **Tô màu code thủ công** bằng span: `.kw` (keyword) · `.fn` (hàm) · `.str` (chuỗi) · `.num` (số) · `.cmt` (comment, in nghiêng xám) · `.tbl` (tên bảng/cột nhấn).
- **Component có sẵn** (dùng đúng class, không tự chế): `.callout` (biến thể `why·warn·danger·tip·bridge`), `.code-block`+`.code-label`, `table.data`+`.nullcell`, `.quiz`+`.opt[data-correct][data-explain]`+`.feedback`, `.checklist`, `.next-box`, `.navbar`, `.lesson-tag`, `.try-it`.
- **Print-friendly:** đã có `@media print` (ẩn nút, nền trắng). Giữ nguyên để in ra đẹp.

### B.2 — Bắt buộc mỗi bài (UX)

1. **Mục lục** `lessons/index.html`: liệt kê mọi bài (nhóm theo module, thanh tiến độ) + bài "sắp tới", mỗi bài đã soạn là link bấm được. Thêm bài mới → cập nhật ngay (đổi `.soon`→`<a>`, cập nhật progress).
2. **Điều hướng**: cuối mỗi bài có ô "→ Bài tiếp theo" + teaser, và thanh `.navbar` `[← trước · 🏠 Mục lục · sau →]`. Nút 🏠 nổi do `lesson-enhance.js` tự chèn.
   - **Mọi `href` phải trỏ tới file CÓ THẬT.** Kiểm file tồn tại trước khi giao bài — không suy theo quy ước đặt tên
     rồi đoán bừa.
   - **Bài mới nhất (chưa có bài kế)**: nút "Sau →" mang class `disabled`, KHÔNG trỏ tới file chưa soạn. Bài đầu
     tiên xử lý tương tự với nút "← Trước".
   - **Khi thêm bài N+1, phải QUAY LẠI bài N**: mở `disabled` thành link thật, và sửa `.next-box` cho khớp tên bài
     mới. Đây là bước hay quên nhất — quên thì chuỗi điều hướng đứt ngay ở bài áp chót.
   - Ô "→ Bài tiếp theo" của bài mới nhất chỉ ghi teaser, KHÔNG được là link chết.
3. **Comment tiếng Việt trong MỌI khối code.**
4. **Nút Copy** ở mỗi khối code — tự có khi bọc code trong `.code-block` (đừng tự viết lại).
5. **Quiz** dùng cấu trúc `.opt[data-correct][data-explain]` để có feedback tức thì (rule A7) — không cần viết JS riêng.
6. Mỗi bài chỉ nhúng đúng `<link rel="stylesheet" href="lesson.css">` và `<script src="lesson-enhance.js"></script>`.
7. **File thực hành mới trong bài — quy ước tạo file:**
   - **File mới trong thư mục ĐÃ TỒN TẠI** (vd thêm `enter-exit.mjs` vào sân tập đang có sẵn): CHỈ ghi nhãn tên
     file trên `.code-label` của `.code-block`, KHÔNG kèm lệnh `touch`/`cat >`. Người học tự tạo file trong
     editor rồi dùng nút Copy dán nội dung — không trộn cú pháp bash lẫn vào code ngôn ngữ chính (JS/TS/...),
     giữ code sạch để tô màu cú pháp đúng.
   - **Cần THƯ MỤC MỚI chưa tồn tại** (vd `nested/src/`): PHẢI có lệnh `mkdir -p <đường-dẫn>` tường minh trong
     một `.code-block` bash riêng, đặt trước khối code của file — bước này không thể tự suy ra được.

## Lưu ý
- **Git "commit theo bài" — ĐÃ được ủy quyền cho khoá /teach.** Quy trình mặc định: **chỉ khi workspace có git repo + remote**,
  sau khi người học xác nhận **hoàn thành một bài** (và trước khi sang bài mới), thì **commit + push** phần thuộc bài đó.
  - Mỗi bài là 1 commit. Message: `teach(<chủ-đề>): Bài NN - <tiêu đề>` (vd: `teach(sql): Bài 01 - Tư duy SQL khai báo`).
  - Gom cả file phụ trợ của bài (cập nhật `index.html`, `reference/*`, `learning-records/*`) vào commit của bài đó.
  - **Commit CẢ code bài tập người học tự viết** (thư mục "sân tập"/project thực hành, vd `*-practice/src/`), không chỉ file bài học —
    để lịch sử git phản ánh đúng tiến độ. Gom code bài tập của bài NN vào commit của bài NN. **Không tự bỏ qua** phần này; nếu quyết
    định để người học tự quản lý code bài tập thì phải HỎI trước, đừng mặc định.
  - **Không commit rác/cục bộ**: đảm bảo `node_modules/`, build artifact, file môi trường (`.env`) đã được `.gitignore`
    (tạo/bổ sung `.gitignore` nếu thiếu — kiểm bằng `git check-ignore` trước khi add). KHÔNG commit cấu hình máy cá nhân
    (vd `.claude/settings.local.json`). Add tường minh theo đường dẫn, tránh `git add -A` quét nhầm.
  - Nếu workspace **chưa có git** → KHÔNG tự `git init`; hỏi người học có muốn khởi tạo không rồi mới làm.
  - Vẫn theo Git rule global: commit message kết thúc bằng dòng `Co-Authored-By` chuẩn.
  - Gom **`reference/*` (cheat-sheet) + cập nhật `GLOSSARY.md`** vào commit của bài/module tương ứng (theo A22/A23).
- Bài cũ (đã học) giữ nguyên format từng-bước (làm thư viện tra cứu); chế độ thử thách chỉ áp cho bài MỚI đi tới.
