-- Ticket 45: 60 APPROVED company reviews, written for this project (not copied from any site).
-- Run as postgres after seed-demo.sql and the company_reviews migration:
--   psql "$DATABASE_URL" -f supabase/seed/reviews.sql
-- Only demo accounts: each review goes to a (candidate, company) pair that has a demo application, so it is one
-- the app itself would have accepted. Pairs are picked by a fixed hash order, so reruns refresh the same rows;
-- wipe-demo.sql removes them with the candidates (cascade).
\set ON_ERROR_STOP 1
begin;
with pairs as (
  select a.candidate_id, p.employer_id as company_id, min(a.created_at) as applied_at,
         row_number() over (order by md5(a.candidate_id::text || p.employer_id::text)) as n
  from public.applications a
  join public.job_postings p on p.id = a.job_posting_id
  join auth.users uc on uc.id = a.candidate_id and uc.email like '%@demo.jobportal.test'
  join auth.users ue on ue.id = p.employer_id and ue.email like '%@demo.jobportal.test'
  group by a.candidate_id, p.employer_id
)
insert into public.company_reviews (company_id, candidate_id, rating, title, pros, cons, anonymous, status,
                                    moderated_at, created_at, updated_at)
select pr.company_id, pr.candidate_id, v.rating, v.title, v.pros, v.cons, v.anonymous, 'APPROVED',
       least(now(), pr.applied_at + interval '4 days'),
       least(now(), pr.applied_at + interval '3 days'), least(now(), pr.applied_at + interval '4 days')
from pairs pr
join (values
  (1, 5, 'Quy trình tuyển dụng chuyên nghiệp', 'Phản hồi hồ sơ trong vòng ba ngày, lịch phỏng vấn rõ ràng và người phỏng vấn đã đọc kỹ CV trước buổi gặp.', 'Vòng bài test hơi dài, mất gần một buổi tối để hoàn thành.', false),
  (2, 4, 'Môi trường cởi mở, đồng nghiệp dễ gần', 'Mọi người sẵn sàng hướng dẫn người mới, quản lý trực tiếp lắng nghe ý kiến và góp ý thẳng thắn.', 'Văn phòng hơi chật vào giờ cao điểm, chỗ để xe máy không đủ.', true),
  (3, 5, 'Lộ trình thăng tiến minh bạch', 'Có khung năng lực cho từng cấp bậc, đánh giá hiệu suất sáu tháng một lần và tiêu chí lên lương được công bố.', 'Đôi khi kết quả đánh giá được thông báo chậm hơn lịch hẹn khoảng hai tuần.', false),
  (4, 3, 'Công việc ổn nhưng áp lực deadline', 'Dự án đa dạng, học được nhiều kỹ năng mới trong thời gian ngắn.', 'Cuối tháng thường phải làm thêm giờ, kế hoạch hay bị thay đổi sát ngày giao.', true),
  (5, 4, 'Phỏng vấn thân thiện, câu hỏi thực tế', 'Câu hỏi bám sát công việc hằng ngày, người phỏng vấn giải thích rõ về nhóm và sản phẩm.', 'Phải chờ khoảng mười lăm phút so với giờ hẹn ở vòng hai.', false),
  (6, 5, 'Chế độ đãi ngộ tốt', 'Lương tháng mười ba, bảo hiểm sức khỏe cho cả người thân và mười hai ngày phép năm.', 'Mức thưởng dự án chưa được nói rõ ngay từ lúc nhận việc.', true),
  (7, 2, 'Thông tin công việc chưa rõ ràng', 'Đồng nghiệp trong nhóm thân thiện, giờ giấc khá linh hoạt.', 'Mô tả công việc khác khá nhiều so với thực tế, phải kiêm thêm nhiều đầu việc không liên quan.', true),
  (8, 4, 'Đào tạo bài bản cho người mới', 'Có chương trình hội nhập hai tuần, tài liệu nội bộ đầy đủ và người kèm cặp riêng.', 'Phần mềm nội bộ hơi cũ, mất thời gian làm quen.', false),
  (9, 5, 'Quản lý tâm lý, tôn trọng nhân viên', 'Quản lý chủ động hỏi han khối lượng công việc, sẵn sàng điều chỉnh khi nhân viên quá tải.', 'Chưa có nhiều hoạt động gắn kết giữa các phòng ban.', false),
  (10, 3, 'Lương ở mức trung bình thị trường', 'Công việc ổn định, ít biến động nhân sự, đóng bảo hiểm đầy đủ theo lương thực tế.', 'Mức tăng lương hằng năm không cao, phụ cấp ăn trưa còn thấp.', true),
  (11, 4, 'Văn hóa học hỏi rõ rệt', 'Công ty tài trợ khóa học và chứng chỉ, có buổi chia sẻ kiến thức nội bộ mỗi thứ sáu.', 'Thời gian dành cho học tập dễ bị lấn át khi dự án gấp.', false),
  (12, 5, 'Trải nghiệm ứng tuyển rất tốt', 'Được thông báo kết quả từng vòng qua email, kể cả khi chưa phù hợp cũng nhận được góp ý cụ thể.', 'Không có điểm nào đáng kể để phàn nàn.', false),
  (13, 4, 'Sản phẩm có ý nghĩa với cộng đồng', 'Được làm sản phẩm phục vụ nhiều người dùng thật, thấy rõ giá trị công việc mình làm.', 'Quy trình phê duyệt nhiều cấp khiến việc phát hành chậm.', true),
  (14, 1, 'Phản hồi chậm sau phỏng vấn', 'Buổi phỏng vấn đầu tiên diễn ra đúng giờ và lịch sự.', 'Sau phỏng vấn hơn ba tuần không nhận được bất kỳ phản hồi nào dù đã chủ động hỏi lại.', true),
  (15, 4, 'Giờ làm việc linh hoạt', 'Có thể làm từ xa hai ngày mỗi tuần, giờ vào làm linh động trong khoảng một tiếng.', 'Họp trực tuyến khá nhiều, đôi khi kéo dài hơn dự kiến.', false),
  (16, 5, 'Đồng đội giỏi và nhiệt tình', 'Nhóm có nhiều anh chị kinh nghiệm, review công việc kỹ và luôn giải thích lý do.', 'Nhịp làm việc nhanh nên người mới cần thời gian để bắt kịp.', false),
  (17, 3, 'Phù hợp với người thích ổn định', 'Công việc lặp lại nhưng rõ ràng, ít phát sinh ngoài giờ.', 'Ít cơ hội thử thách bản thân, các dự án mới không nhiều.', true),
  (18, 4, 'Phúc lợi chăm lo cho nhân viên', 'Khám sức khỏe định kỳ, du lịch hằng năm và quà vào các dịp lễ tết.', 'Chính sách làm thêm giờ chưa được ghi nhận đầy đủ trên hệ thống.', false),
  (19, 5, 'Minh bạch về lương ngay từ đầu', 'Khoảng lương được trao đổi thẳng thắn từ vòng đầu, không có bất ngờ khi nhận thư mời.', 'Thủ tục nhận việc cần khá nhiều giấy tờ bản cứng.', false),
  (20, 2, 'Áp lực doanh số lớn', 'Thu nhập tốt nếu đạt chỉ tiêu, được đào tạo kỹ năng bán hàng bài bản.', 'Chỉ tiêu tăng liên tục mỗi quý, áp lực lớn và tỷ lệ nghỉ việc khá cao.', true),
  (21, 4, 'Văn phòng đẹp, tiện nghi', 'Không gian làm việc thoáng, có khu nghỉ ngơi, đồ uống miễn phí và gần trung tâm.', 'Gửi xe khá xa, vào giờ cao điểm thang máy phải chờ lâu.', false),
  (22, 4, 'Cơ hội làm việc với khách hàng quốc tế', 'Được trực tiếp trao đổi với khách hàng nước ngoài, ngoại ngữ cải thiện rõ.', 'Một số buổi họp diễn ra buổi tối do lệch múi giờ.', true),
  (23, 5, 'Lãnh đạo có tầm nhìn rõ ràng', 'Ban giám đốc chia sẻ định hướng mỗi quý, nhân viên hiểu mục tiêu chung của công ty.', 'Một vài thay đổi chiến lược được triển khai hơi gấp.', false),
  (24, 3, 'Trải nghiệm phỏng vấn ở mức khá', 'Người phỏng vấn lịch sự, câu hỏi chuyên môn hợp lý.', 'Không được giới thiệu nhiều về nhóm sẽ làm việc cùng, khó hình dung công việc thực tế.', true),
  (25, 4, 'Quy trình làm việc rõ ràng', 'Có tài liệu quy trình cho từng công đoạn, phân công trách nhiệm cụ thể.', 'Đôi khi quy trình quá chặt khiến xử lý việc gấp bị chậm.', false),
  (26, 5, 'Môi trường trẻ trung, năng động', 'Nhiều hoạt động thể thao, câu lạc bộ và các buổi gặp mặt cuối tháng.', 'Một số hoạt động diễn ra cuối tuần, không phải ai cũng sắp xếp được.', true),
  (27, 4, 'Công việc đúng chuyên môn', 'Được giao việc đúng ngành học, có cơ hội áp dụng kiến thức vào thực tế.', 'Thiết bị làm việc cấp cho nhân viên mới hơi cũ.', false),
  (28, 2, 'Giao tiếp nội bộ còn rời rạc', 'Đồng nghiệp cùng nhóm hỗ trợ nhau tốt.', 'Thông tin giữa các phòng ban hay bị chậm, nhiều việc phải hỏi lại nhiều lần mới rõ.', true),
  (29, 5, 'Ứng tuyển nhanh gọn', 'Chỉ hai vòng phỏng vấn, nhận kết quả sau một tuần và thư mời ghi rõ mọi quyền lợi.', 'Chưa thấy điểm cần cải thiện trong quá trình ứng tuyển.', false),
  (30, 4, 'Được tin tưởng giao trách nhiệm', 'Người mới cũng được giao phụ trách hạng mục riêng, tự chủ trong cách làm.', 'Hỗ trợ ban đầu chưa nhiều, phải tự tìm hiểu khá nhiều.', true),
  (31, 3, 'Chế độ ổn, công việc hơi đơn điệu', 'Đóng bảo hiểm đầy đủ, lương trả đúng hạn hằng tháng.', 'Công việc ít thay đổi, khó phát triển thêm kỹ năng mới sau một thời gian.', true),
  (32, 4, 'Chăm sóc nhân viên chu đáo', 'Phòng nhân sự hỗ trợ nhanh các thủ tục, giải đáp thắc mắc tận tình.', 'Căng tin ít lựa chọn món ăn.', false),
  (33, 5, 'Nơi tốt để bắt đầu sự nghiệp', 'Người mới được hướng dẫn từng bước, sai sót được góp ý nhẹ nhàng và mang tính xây dựng.', 'Mức lương khởi điểm cho thực tập sinh chưa cao.', false),
  (34, 4, 'Dự án thú vị, công nghệ mới', 'Được tiếp cận công cụ và công nghệ mới, nhóm khuyến khích thử nghiệm ý tưởng.', 'Tài liệu kỹ thuật chưa được cập nhật thường xuyên.', true),
  (35, 3, 'Tốt nhưng cần cải thiện quy trình', 'Đồng nghiệp hòa đồng, quản lý dễ trao đổi.', 'Quy trình phê duyệt nghỉ phép còn thủ công, mất thời gian.', false),
  (36, 5, 'Phỏng vấn tôn trọng ứng viên', 'Người phỏng vấn đúng giờ, tạo không khí thoải mái và dành thời gian trả lời câu hỏi của ứng viên.', 'Phòng chờ phỏng vấn hơi nhỏ.', true),
  (37, 4, 'Cân bằng công việc và cuộc sống', 'Hiếm khi phải làm thêm giờ, cuối tuần được nghỉ trọn vẹn.', 'Lương không cao bằng một số nơi cùng ngành.', false),
  (38, 2, 'Kỳ vọng chưa được trao đổi rõ', 'Công ty có thương hiệu, sản phẩm được nhiều người biết đến.', 'Mục tiêu công việc thay đổi liên tục, khó biết mình được đánh giá dựa trên tiêu chí nào.', true),
  (39, 4, 'Đồng nghiệp hỗ trợ nhiệt tình', 'Gặp khó khăn luôn có người sẵn sàng giúp, không khí làm việc dễ chịu.', 'Khối lượng công việc giữa các thành viên chưa đều.', false),
  (40, 5, 'Thưởng xứng đáng với đóng góp', 'Thưởng theo hiệu quả công việc được tính minh bạch, chi trả đúng hẹn.', 'Không có điểm trừ đáng kể.', false),
  (41, 4, 'Văn hóa phản hồi thẳng thắn', 'Mọi người góp ý trực tiếp, cởi mở, giúp tiến bộ nhanh.', 'Người mới có thể thấy hơi choáng với cách góp ý thẳng.', true),
  (42, 3, 'Ổn định, ít bất ngờ', 'Công ty lâu năm, chính sách rõ ràng và ổn định.', 'Cách làm việc còn truyền thống, chậm ứng dụng công cụ mới.', false),
  (43, 4, 'Lịch làm việc hợp lý', 'Ca làm việc được báo trước một tuần, dễ sắp xếp việc cá nhân.', 'Đôi khi phải đổi ca đột xuất khi thiếu người.', true),
  (44, 5, 'Đánh giá năng lực công bằng', 'Tiêu chí đánh giá rõ ràng, có buổi trao đổi một một với quản lý mỗi tháng.', 'Biểu mẫu tự đánh giá hơi dài.', false),
  (45, 4, 'Quy mô vừa phải, dễ hòa nhập', 'Mọi người biết nhau, thông tin truyền đạt nhanh, dễ đề xuất cải tiến.', 'Ít vị trí cấp cao nên lộ trình thăng tiến cần thời gian.', false),
  (46, 1, 'Trải nghiệm phỏng vấn chưa tốt', 'Địa điểm phỏng vấn dễ tìm, lễ tân hướng dẫn chu đáo.', 'Buổi phỏng vấn bị dời hai lần sát giờ và người phỏng vấn không nắm thông tin về vị trí tuyển.', true),
  (47, 4, 'Học hỏi được nhiều từ quản lý', 'Quản lý giàu kinh nghiệm, sẵn sàng chia sẻ cách xử lý tình huống thực tế.', 'Quản lý bận nên lịch trao đổi đôi khi bị hoãn.', false),
  (48, 5, 'Chính sách làm việc từ xa tốt', 'Làm từ xa toàn thời gian, công ty hỗ trợ chi phí internet và thiết bị.', 'Ít có dịp gặp trực tiếp đồng nghiệp.', true),
  (49, 3, 'Công việc vất vả nhưng học được nhiều', 'Va chạm nhiều tình huống thực tế, kỹ năng xử lý công việc tiến bộ nhanh.', 'Khối lượng công việc lớn, đôi khi phải mang việc về nhà.', true),
  (50, 4, 'Phúc lợi gia đình tốt', 'Hỗ trợ khi có con nhỏ, nghỉ phép linh hoạt cho các việc gia đình.', 'Thủ tục thanh toán chi phí còn chậm.', false),
  (51, 5, 'Môi trường đa dạng, tôn trọng khác biệt', 'Đồng nghiệp đến từ nhiều vùng miền, mọi ý kiến đều được lắng nghe.', 'Một số buổi họp toàn công ty kéo dài.', false),
  (52, 4, 'Đúng hẹn trong mọi cam kết', 'Lương, thưởng, bảo hiểm đều được thực hiện đúng như thư mời nhận việc.', 'Chưa có nhiều hoạt động ngoại khóa.', true),
  (53, 3, 'Tạm ổn cho giai đoạn đầu', 'Có kinh nghiệm làm việc thực tế, môi trường không quá áp lực.', 'Ít được đào tạo bài bản, chủ yếu tự học qua công việc.', false),
  (54, 4, 'Quản lý hỗ trợ phát triển bản thân', 'Được khuyến khích đặt mục tiêu cá nhân và có kế hoạch theo dõi cụ thể.', 'Ngân sách đào tạo mỗi năm còn hạn chế.', false),
  (55, 5, 'Rất hài lòng sau một năm làm việc', 'Công việc thú vị, đồng nghiệp tốt, chế độ đầy đủ và được ghi nhận khi làm tốt.', 'Bãi đỗ xe ô tô gần văn phòng khá đắt.', true),
  (56, 4, 'Tuyển dụng tôn trọng thời gian ứng viên', 'Lịch phỏng vấn được xếp linh hoạt ngoài giờ hành chính cho người đang đi làm.', 'Bài kiểm tra năng lực còn mang tính lý thuyết.', false),
  (57, 2, 'Chính sách chưa nhất quán', 'Công việc có nhiều thử thách thú vị.', 'Quy định thay đổi thường xuyên mà không được thông báo trước, gây khó khăn khi lên kế hoạch.', true),
  (58, 4, 'Không khí làm việc tích cực', 'Mọi người vui vẻ, thường xuyên ghi nhận đóng góp của nhau trong các buổi họp nhóm.', 'Khu vực làm việc chung khá ồn.', false),
  (59, 5, 'Công ty đáng để gắn bó lâu dài', 'Chính sách giữ chân nhân viên tốt, có thưởng thâm niên và lộ trình phát triển rõ ràng.', 'Quy trình nội bộ cần số hóa thêm để tiết kiệm thời gian.', false),
  (60, 4, 'Thông tin tuyển dụng trung thực', 'Mô tả công việc khớp với thực tế, quyền lợi được giữ đúng như đã đăng.', 'Thời gian thử việc hai tháng hơi dài với vị trí có kinh nghiệm.', true)
) as v (n, rating, title, pros, cons, anonymous) on v.n = pr.n
on conflict (company_id, candidate_id) do update set rating = excluded.rating, title = excluded.title,
  pros = excluded.pros, cons = excluded.cons, anonymous = excluded.anonymous, status = 'APPROVED',
  reject_reason = null, updated_at = now();
commit;
select count(*) as demo_reviews from public.company_reviews r
join auth.users u on u.id = r.candidate_id where u.email like '%@demo.jobportal.test';
