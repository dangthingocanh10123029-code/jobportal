-- Ticket 46: career guide sample articles (15, every category). Written for this project, not copied from any site.
-- Run as postgres after the articles migration: psql "$DATABASE_URL" -f supabase/seed/articles.sql
-- Idempotent: an existing slug is refreshed (content, category), its views and author are kept.
\set ON_ERROR_STOP 1
begin;
insert into public.articles (slug, title, excerpt, category, content, published_at, views, status)
select slug, title, excerpt, category, content, published_at, views, 'PUBLISHED' from (values
  ('viet-cv-cho-nguoi-moi-ra-truong', 'Viết CV cho người mới ra trường: bắt đầu từ đâu khi chưa có kinh nghiệm', 'Chưa có kinh nghiệm đi làm vẫn có thể viết một CV thuyết phục nếu bạn biết chọn đúng nội dung và trình bày gọn gàng, dễ đọc.', 'CV', $md$Nhiều bạn sinh viên vừa tốt nghiệp thường lo lắng vì nghĩ rằng CV của mình "trống trơn". Thực tế, nhà tuyển dụng không kỳ vọng người mới có nhiều năm kinh nghiệm. Họ muốn thấy bạn có nền tảng phù hợp, có tinh thần học hỏi và biết cách trình bày bản thân rõ ràng. Bài viết này giúp bạn xây dựng một CV đầu tiên chỉn chu từ những gì bạn đã có.

## Chọn bố cục đơn giản, dễ đọc

Người tuyển dụng thường chỉ dành vài chục giây để lướt qua một CV. Vì vậy, bố cục rõ ràng quan trọng hơn màu sắc cầu kỳ. Một CV cho người mới ra trường nên gói gọn trong **một trang** và đi theo thứ tự sau:

1. Thông tin liên hệ: họ tên, số điện thoại, email nghiêm túc, khu vực sinh sống.
2. Mục tiêu nghề nghiệp ngắn gọn, khoảng hai đến ba câu.
3. Học vấn.
4. Kinh nghiệm thực tập, dự án, hoạt động.
5. Kỹ năng.
6. Chứng chỉ, giải thưởng (nếu có).

Hãy dùng một hoặc hai phông chữ dễ đọc, cỡ chữ vừa phải và để khoảng trắng hợp lý giữa các mục.

## Đưa học vấn và dự án lên vị trí nổi bật

Khi chưa có kinh nghiệm chính thức, học vấn và các dự án là "vốn liếng" lớn nhất của bạn. Ở phần học vấn, hãy ghi tên trường, chuyên ngành, thời gian học và điểm trung bình nếu điểm của bạn khá trở lên.

Phần dự án là nơi bạn chứng minh mình đã từng làm việc thật. Đó có thể là đồ án tốt nghiệp, bài tập lớn theo nhóm, một sản phẩm cá nhân hay nghiên cứu khoa học. Với mỗi dự án, hãy trả lời ba câu hỏi:

- Dự án giải quyết vấn đề gì?
- Bạn đảm nhận vai trò nào, dùng công cụ hay kiến thức gì?
- Kết quả cuối cùng ra sao?

Ví dụ, thay vì viết "Tham gia đồ án quản lý thư viện", hãy viết "**Phụ trách thiết kế cơ sở dữ liệu** cho đồ án quản lý thư viện của nhóm bốn người, đạt điểm 9 và được chọn trình bày trước khoa".

## Tận dụng hoạt động ngoại khóa và việc làm thêm

Đừng bỏ qua những trải nghiệm tưởng chừng không liên quan. Làm thêm ở quán cà phê cho thấy bạn chịu được áp lực và biết giao tiếp với khách hàng. Tham gia ban tổ chức sự kiện ở câu lạc bộ cho thấy khả năng lập kế hoạch và làm việc nhóm. Điều quan trọng là cách bạn diễn đạt: tập trung vào **kỹ năng rút ra được** thay vì chỉ liệt kê tên công việc.

## Viết mục tiêu nghề nghiệp và kỹ năng thật cụ thể

Mục tiêu nghề nghiệp chung chung như "mong muốn làm việc trong môi trường năng động để phát triển bản thân" xuất hiện trong rất nhiều CV và gần như không để lại ấn tượng. Hãy nói rõ bạn muốn làm vị trí gì, mang lại điều gì và hướng đi trong một đến hai năm tới. Ví dụ: "Mong muốn bắt đầu ở vị trí nhân viên phân tích dữ liệu, ứng dụng kiến thức thống kê và kỹ năng xử lý bảng tính để hỗ trợ đội kinh doanh ra quyết định".

Với phần kỹ năng, hãy chia thành hai nhóm: kỹ năng chuyên môn (phần mềm, ngôn ngữ lập trình, ngoại ngữ kèm trình độ) và kỹ năng mềm. Chỉ ghi những gì bạn thực sự làm được, vì nhà tuyển dụng hoàn toàn có thể hỏi lại hoặc kiểm tra trong buổi phỏng vấn.

## Kiểm tra kỹ trước khi gửi

Trước khi nộp, hãy đọc lại CV ít nhất hai lần để soát lỗi chính tả, dấu câu và định dạng ngày tháng cho thống nhất. Cuối cùng, lưu CV dưới dạng tệp PDF và đặt tên tệp rõ ràng, chẳng hạn kèm họ tên và vị trí ứng tuyển, để nhà tuyển dụng dễ tìm lại.

Một CV đầu tiên không cần hoàn hảo, nhưng cần trung thực và cho thấy bạn đã chuẩn bị nghiêm túc. Hãy coi nó là tài liệu sống và cập nhật thường xuyên mỗi khi bạn có thêm trải nghiệm mới.$md$,
   now() - interval '2 days', 51),
  ('chuan-bi-truoc-buoi-phong-van', 'Chuẩn bị trước buổi phỏng vấn: danh sách việc cần làm trong 3 ngày', 'Một kế hoạch chuẩn bị gọn gàng trong ba ngày giúp bạn hiểu công ty, nắm chắc vị trí ứng tuyển và bước vào phòng phỏng vấn với tâm thế tự tin.', 'INTERVIEW', $md$Nhiều ứng viên chỉ bắt đầu chuẩn bị vào tối hôm trước buổi phỏng vấn, rồi lo lắng vì không biết nên ôn gì. Thực tế, chỉ cần một kế hoạch ngắn trong ba ngày, bạn đã có thể nâng chất lượng câu trả lời lên rất nhiều. Bài viết này gợi ý cách chia nhỏ công việc để vừa đủ sâu, vừa không quá tải.

## Ngày thứ nhất: hiểu rõ công ty và vị trí

Hãy đọc lại tin tuyển dụng thật chậm, lần này với vai trò của người tuyển dụng. Gạch chân những yêu cầu bắt buộc, những kỹ năng được nhắc lại nhiều lần và những cụm từ mô tả môi trường làm việc. Đó chính là các chủ đề mà người phỏng vấn gần như chắc chắn sẽ hỏi.

Tiếp theo, tìm hiểu về công ty qua trang giới thiệu, các bài đăng gần đây và sản phẩm hoặc dịch vụ chính của họ. Bạn nên trả lời được ba câu hỏi:

- Công ty kiếm tiền từ đâu và khách hàng chính là ai?
- Vị trí bạn ứng tuyển đóng góp vào kết quả kinh doanh như thế nào?
- Gần đây công ty có thay đổi hay dự án mới nào đáng chú ý?

Ghi lại những điều này vào một trang giấy. Khi được hỏi vì sao muốn làm ở đây, bạn sẽ có câu trả lời cụ thể thay vì những lời khen chung chung.

## Ngày thứ hai: chuẩn bị câu chuyện của chính bạn

Người phỏng vấn không chỉ muốn nghe bạn làm được gì, mà còn muốn thấy bằng chứng. Hãy chọn từ bốn đến sáu tình huống tiêu biểu trong quá trình học tập hoặc làm việc, ví dụ một dự án thành công, một lần xử lý mâu thuẫn, một sai lầm và bài học rút ra, một lần bạn chủ động cải tiến quy trình.

Với mỗi tình huống, viết ra bối cảnh, việc bạn đã làm và kết quả đạt được. Nếu có con số, hãy đưa vào, chẳng hạn rút ngắn thời gian xử lý đơn hàng từ hai ngày xuống một ngày. Những câu chuyện này có thể dùng linh hoạt cho nhiều câu hỏi khác nhau.

Đừng quên chuẩn bị phần giới thiệu bản thân dài khoảng một đến hai phút. Một cấu trúc dễ nhớ là:

1. Hiện tại bạn đang làm gì và thế mạnh chính là gì.
2. Một hoặc hai thành tích nổi bật liên quan đến vị trí.
3. Lý do bạn quan tâm đến cơ hội này.

## Ngày thứ ba: luyện tập và lo phần hậu cần

Hãy tập nói thành tiếng, tốt nhất là trước gương hoặc nhờ một người bạn đóng vai nhà tuyển dụng. Việc nói ra giúp bạn phát hiện chỗ lan man, chỗ dùng từ lặp lại và chỗ thiếu ví dụ. Bạn có thể ghi âm lại để nghe tốc độ nói của mình.

Sau đó, kiểm tra các chi tiết hậu cần:

- Xác nhận lại thời gian, địa điểm và tên người phỏng vấn nếu có.
- Tính trước đường đi và dự phòng ít nhất hai mươi phút.
- Chuẩn bị trang phục phù hợp với văn hóa công ty, gọn gàng và thoải mái.
- In sẵn hai bản hồ sơ, mang theo sổ và bút.

Buổi tối trước ngày phỏng vấn, đừng cố học thêm nội dung mới. Hãy đọc lại ghi chú, ngủ đủ giấc và ăn uống nhẹ nhàng.

## Những lỗi nhỏ nhưng dễ mất điểm

Có một vài lỗi tưởng như không đáng kể nhưng lại để lại ấn tượng xấu. Đến quá sớm cũng có thể gây bất tiện cho người tiếp đón, vì vậy hãy có mặt trước giờ hẹn khoảng mười phút. Tránh nói xấu nơi làm việc cũ, kể cả khi bạn có lý do chính đáng để rời đi. Đừng trả lời mọi câu hỏi bằng những từ quá chung như chăm chỉ hay ham học hỏi mà không kèm ví dụ.

Cuối cùng, hãy nhớ rằng buổi phỏng vấn là cuộc trò chuyện hai chiều. **Sự chuẩn bị kỹ lưỡng** không chỉ giúp bạn gây ấn tượng, mà còn giúp bạn đánh giá xem công việc này có thật sự phù hợp với mình hay không. Khi đã làm đủ phần việc của mình, bạn có quyền bước vào phòng với sự tự tin.$md$,
   now() - interval '5 days', 88),
  ('tim-hieu-muc-luong-thi-truong-truoc-khi-thuong-luong', 'Tìm hiểu mức lương thị trường trước khi thương lượng', 'Biết được mặt bằng lương cho vị trí của mình là nền tảng để bạn đưa ra con số mong muốn hợp lý và tự tin hơn khi trao đổi với nhà tuyển dụng.', 'SALARY', $md$Câu hỏi "Mức lương mong muốn của bạn là bao nhiêu?" khiến không ít ứng viên lúng túng. Nói thấp quá thì thiệt thòi, nói cao quá lại sợ mất cơ hội. Cách tốt nhất để vượt qua nỗi lo này là chuẩn bị từ trước: tìm hiểu mức lương thị trường cho đúng vị trí, đúng kinh nghiệm và đúng khu vực của bạn.

## Vì sao cần nghiên cứu trước

Khi có dữ liệu trong tay, bạn không còn phải đoán. Bạn sẽ biết con số của mình nằm ở đâu so với mặt bằng chung, từ đó đưa ra đề xuất có cơ sở. Nhà tuyển dụng cũng đánh giá cao những ứng viên hiểu giá trị của bản thân và trình bày được lý do cho mức lương mình đề nghị.

Ngoài ra, việc nghiên cứu giúp bạn nhận ra những lời mời có mức lương **thấp bất thường** hoặc **cao bất thường**. Cả hai trường hợp đều đáng để bạn hỏi kỹ thêm trước khi quyết định.

## Những yếu tố ảnh hưởng đến mức lương

Cùng một chức danh nhưng mức lương có thể chênh lệch khá lớn. Hãy xác định rõ các yếu tố sau trước khi so sánh:

- **Ngành nghề và vị trí**: một số lĩnh vực có mặt bằng lương cao hơn do nhu cầu nhân lực lớn.
- **Số năm kinh nghiệm và cấp bậc**: nhân viên mới, chuyên viên, trưởng nhóm có khung lương khác nhau.
- **Khu vực làm việc**: các thành phố lớn thường có mức lương và chi phí sinh hoạt cao hơn.
- **Quy mô và loại hình doanh nghiệp**: doanh nghiệp lớn, doanh nghiệp vừa và nhỏ hay công ty khởi nghiệp có chính sách đãi ngộ khác nhau.
- **Kỹ năng đặc thù**: ngoại ngữ, chứng chỉ chuyên môn hoặc kỹ năng hiếm có thể giúp bạn đề xuất cao hơn.

## Các nguồn tham khảo đáng tin

Không có nguồn nào hoàn hảo, vì vậy hãy kết hợp nhiều nguồn để có bức tranh đầy đủ:

1. **Tin tuyển dụng công khai mức lương**: lọc theo vị trí và khu vực, ghi lại khoảng lương của khoảng mười đến hai mươi tin tương tự.
2. **Báo cáo lương thường niên** do các đơn vị tuyển dụng hoặc tổ chức nghiên cứu nhân sự công bố.
3. **Mạng lưới quan hệ**: trò chuyện với anh chị đi trước, bạn bè cùng ngành hoặc người làm nhân sự. Bạn không cần hỏi con số chính xác của ai, chỉ cần hỏi khoảng chung.
4. **Cộng đồng nghề nghiệp**: các nhóm trao đổi chuyên môn thường có những cuộc khảo sát lương do thành viên tự đóng góp.
5. **Chuyên viên tư vấn tuyển dụng**: họ nắm khá rõ mặt bằng lương do làm việc với nhiều doanh nghiệp.

## Biến dữ liệu thành con số của bạn

Sau khi thu thập, hãy sắp xếp dữ liệu và xác định ba mốc:

- **Mức tối thiểu**: con số thấp nhất bạn có thể chấp nhận, dựa trên chi phí sinh hoạt và mức lương hiện tại.
- **Mức mục tiêu**: con số hợp lý theo thị trường và năng lực của bạn.
- **Mức kỳ vọng cao**: con số bạn đưa ra khi bạn có lợi thế rõ ràng.

Khi được hỏi, bạn có thể đưa ra một khoảng lương với cận dưới gần mức mục tiêu. Hãy nhớ phân biệt rõ bạn đang nói **lương trước thuế hay sau thuế** để tránh hiểu lầm về sau.

## Đừng chỉ nhìn vào lương cơ bản

Tổng thu nhập không chỉ gồm lương hằng tháng. Hãy xem xét cả thưởng theo hiệu quả công việc, lương tháng thứ mười ba, phụ cấp, bảo hiểm sức khỏe bổ sung, ngày nghỉ phép, chế độ làm việc linh hoạt và cơ hội đào tạo. Một vị trí có lương cơ bản thấp hơn một chút nhưng phúc lợi tốt và lộ trình thăng tiến rõ ràng đôi khi lại có lợi hơn về lâu dài.

Nghiên cứu mức lương thị trường không mất quá nhiều thời gian, nhưng giúp bạn bước vào cuộc trao đổi với tâm thế chủ động. Hãy cập nhật thông tin này định kỳ, kể cả khi bạn chưa có ý định chuyển việc.$md$,
   now() - interval '8 days', 125),
  ('lap-ke-hoach-phat-trien-nghe-nghiep-3-nam', 'Lập kế hoạch phát triển nghề nghiệp trong 3 năm', 'Hướng dẫn từng bước xây dựng kế hoạch nghề nghiệp ba năm thực tế, từ đánh giá bản thân, đặt mục tiêu đến theo dõi và điều chỉnh định kỳ.', 'CAREER', $md$Ba năm là khoảng thời gian đủ dài để tạo ra thay đổi đáng kể, nhưng cũng đủ ngắn để bạn hình dung rõ ràng. Một kế hoạch nghề nghiệp ba năm giúp bạn chủ động lựa chọn công việc, khóa học và mối quan hệ, thay vì để mọi thứ trôi theo hoàn cảnh. Dưới đây là cách xây dựng kế hoạch đó một cách thực tế.

## Bước 1: Nhìn lại vị trí hiện tại

Trước khi nghĩ đến đích đến, bạn cần biết mình đang đứng ở đâu. Hãy dành một buổi tối để trả lời trung thực các câu hỏi:

- Những công việc nào khiến bạn hào hứng và những việc nào làm bạn mệt mỏi?
- Kỹ năng nào bạn làm tốt và được người khác ghi nhận?
- Kỹ năng nào còn thiếu khiến bạn bỏ lỡ cơ hội?
- Bạn coi trọng điều gì nhất: thu nhập, sự ổn định, thời gian cho gia đình hay cơ hội thăng tiến?

Bạn cũng có thể hỏi ý kiến cấp trên hoặc đồng nghiệp thân thiết. Góc nhìn từ bên ngoài thường giúp phát hiện những điểm mạnh mà bạn không nhận ra.

## Bước 2: Hình dung bạn của ba năm sau

Hãy viết ra một đoạn mô tả ngắn về bản thân sau ba năm. Bạn đang giữ vị trí gì, làm việc trong lĩnh vực nào, mỗi ngày làm những việc gì, thu nhập khoảng bao nhiêu. Càng cụ thể, mục tiêu càng dễ biến thành hành động.

Ví dụ, thay vì viết muốn thăng tiến, hãy viết trở thành trưởng nhóm chăm sóc khách hàng, quản lý từ năm đến bảy người, chịu trách nhiệm về chỉ số hài lòng của khách hàng.

## Bước 3: Chia nhỏ thành mục tiêu từng năm

Một mục tiêu lớn chỉ trở nên khả thi khi được chia thành các chặng ngắn hơn. Với ví dụ trên, kế hoạch có thể như sau:

1. Năm thứ nhất: trở thành nhân viên có kết quả tốt nhất nhóm, chủ động hướng dẫn người mới, học một khóa về kỹ năng giao tiếp và giải quyết khiếu nại.
2. Năm thứ hai: đảm nhận vai trò phó nhóm hoặc phụ trách một dự án nhỏ, học thêm về quản lý con người và đọc hiểu số liệu.
3. Năm thứ ba: ứng tuyển vị trí trưởng nhóm trong công ty hoặc tại nơi khác, chuẩn bị hồ sơ với những thành tích cụ thể đã tích lũy.

Với mỗi năm, hãy xác định rõ kỹ năng cần học, kết quả cần đạt và người có thể giúp bạn.

## Bước 4: Biến kế hoạch thành thói quen

Kế hoạch dù hay đến đâu cũng vô nghĩa nếu chỉ nằm trong sổ. Hãy gắn nó vào nhịp sống hằng ngày bằng những việc nhỏ:

- Dành ba đến năm giờ mỗi tuần cho việc học, ghi rõ vào lịch như một cuộc hẹn.
- Mỗi tháng ghi lại ít nhất một thành tích hoặc bài học trong công việc.
- Mỗi quý trò chuyện với cấp trên về định hướng phát triển của bạn.
- Mở rộng quan hệ với những người đang ở vị trí bạn mong muốn để học hỏi kinh nghiệm.

**Ghi chép thành tích đều đặn** sẽ giúp bạn rất nhiều khi cần đánh giá cuối năm, đàm phán lương hoặc cập nhật hồ sơ xin việc.

## Bước 5: Rà soát và điều chỉnh định kỳ

Thị trường lao động và hoàn cảnh cá nhân luôn thay đổi. Có thể sau một năm bạn phát hiện mình thích làm chuyên môn sâu hơn là quản lý, hoặc công ty mở ra một hướng đi mới hấp dẫn hơn. Điều đó hoàn toàn bình thường.

Hãy đặt lịch rà soát kế hoạch sáu tháng một lần. Đánh giá những gì đã làm được, những gì chưa và lý do. Sau đó điều chỉnh mục tiêu cho phù hợp, nhưng đừng thay đổi chỉ vì một vài khó khăn tạm thời.

Một kế hoạch ba năm không phải là lời hứa cứng nhắc, mà là chiếc la bàn giúp bạn biết mình đang đi đúng hướng. Bắt đầu từ hôm nay, dù chỉ với một trang giấy, bạn đã đi trước rất nhiều người vẫn đang chờ cơ hội tự tìm đến.$md$,
   now() - interval '11 days', 162),
  ('hoa-nhap-90-ngay-dau-o-cong-ty-moi', '90 ngày đầu ở công ty mới: lộ trình hòa nhập từng bước', 'Ba tháng đầu quyết định phần lớn ấn tượng của bạn ở nơi làm việc mới. Đây là lộ trình chia theo từng giai đoạn để bạn hòa nhập nhanh và tự tin hơn.', 'WORKPLACE', $md$Ngày đầu đi làm ở một công ty mới thường mang cảm giác vừa háo hức vừa lo lắng. Bạn chưa quen ai, chưa rõ quy trình, và luôn muốn chứng minh mình là lựa chọn đúng. Tin tốt là không ai kỳ vọng bạn giỏi mọi thứ ngay lập tức. Điều mọi người quan sát là cách bạn học hỏi, đặt câu hỏi và xây dựng mối quan hệ. Hãy chia 90 ngày đầu thành ba chặng rõ ràng để không bị cuốn vào mọi việc cùng lúc.

## Tháng thứ nhất: lắng nghe và quan sát

Mục tiêu của 30 ngày đầu không phải là tạo ra thay đổi lớn, mà là hiểu môi trường xung quanh. Hãy dành thời gian tìm hiểu sản phẩm, khách hàng, cơ cấu phòng ban và cách mọi người phối hợp với nhau.

- Đọc kỹ tài liệu hướng dẫn nội bộ, quy định về giờ giấc, nghỉ phép và các công cụ làm việc.
- Ghi chép tên, vai trò của những người bạn gặp, kèm một vài chi tiết nhỏ để dễ nhớ.
- Hỏi quản lý trực tiếp xem thế nào là **hoàn thành tốt** sau ba tháng.
- Đừng ngại hỏi lại những điều chưa rõ. Hỏi sớm luôn tốt hơn làm sai rồi sửa.

Một thói quen hữu ích là cuối mỗi tuần viết ra ba điều bạn đã học được và ba câu hỏi còn bỏ ngỏ. Danh sách này sẽ giúp các buổi trao đổi với quản lý trở nên cụ thể hơn.

## Tháng thứ hai: đóng góp những kết quả nhỏ

Khi đã nắm được bức tranh chung, bạn nên bắt đầu nhận những nhiệm vụ vừa sức và hoàn thành chúng thật chỉn chu. Những **chiến thắng nhỏ** giúp đồng nghiệp tin tưởng bạn nhanh hơn bất kỳ lời giới thiệu nào.

1. Chọn một việc có phạm vi rõ ràng, có thể xong trong một đến hai tuần.
2. Thống nhất trước với người giao việc về kết quả mong đợi và hạn chót.
3. Cập nhật tiến độ chủ động, kể cả khi gặp vướng mắc.
4. Sau khi hoàn thành, xin góp ý để biết điều gì cần làm tốt hơn.

Đây cũng là lúc mở rộng mối quan hệ ra ngoài nhóm của mình. Một buổi cà phê ngắn với đồng nghiệp ở phòng ban khác có thể giúp bạn hiểu vì sao một quy trình lại vận hành như hiện tại.

## Tháng thứ ba: chủ động và định hướng

Đến tháng thứ ba, bạn đã đủ hiểu để đưa ra nhận xét có cơ sở. Nếu thấy một bước làm việc có thể cải thiện, hãy trình bày kèm lý do và đề xuất cụ thể, thay vì chỉ nêu vấn đề. Hãy nhớ rằng nhiều cách làm tồn tại vì những lý do bạn chưa biết, nên giữ thái độ cầu thị.

Cuối giai đoạn này, hãy chủ động hẹn quản lý một buổi nhìn lại. Bạn có thể chuẩn bị trước:

- Những việc đã hoàn thành và kết quả đạt được.
- Những kỹ năng bạn muốn phát triển trong sáu tháng tới.
- Các khó khăn cần hỗ trợ thêm, chẳng hạn tài liệu, công cụ hoặc người hướng dẫn.

## Những sai lầm thường gặp cần tránh

Nhiều người mới vô tình tự gây khó khăn cho mình chỉ vì quá nóng vội. Hãy cẩn thận với các thói quen sau:

- So sánh liên tục với công ty cũ theo kiểu "ở chỗ cũ làm khác". Câu nói này dễ khiến người nghe khó chịu.
- Nhận quá nhiều việc để thể hiện, dẫn đến trễ hạn và chất lượng giảm.
- Ngại hỏi vì sợ bị đánh giá thấp, rồi tự đoán và làm sai hướng.
- Bỏ qua các hoạt động chung của nhóm, khiến bạn khó kết nối hơn về sau.

## Lời kết

Hòa nhập là một quá trình, không phải một bài kiểm tra trong ngày đầu tiên. Nếu bạn kiên nhẫn quan sát, đóng góp đều đặn và giao tiếp cởi mở, ba tháng đầu sẽ trở thành nền móng vững chắc cho cả chặng đường dài phía trước. Hãy cho bản thân thời gian, và đừng quên ghi nhận những tiến bộ nhỏ mỗi tuần.$md$,
   now() - interval '14 days', 199),
  ('viet-muc-kinh-nghiem-bang-so-lieu', 'Viết mục kinh nghiệm bằng số liệu để CV thuyết phục hơn', 'Biến những dòng mô tả công việc chung chung thành thành tích đo lường được giúp nhà tuyển dụng nhanh chóng thấy giá trị bạn mang lại.', 'CV', $md$Hãy thử đặt mình vào vị trí nhà tuyển dụng đang đọc hai CV. Một CV viết "Phụ trách chăm sóc khách hàng". CV còn lại viết "Xử lý trung bình 40 yêu cầu khách hàng mỗi ngày, giữ tỷ lệ phản hồi trong vòng hai giờ ở mức 95%". Bạn sẽ ấn tượng với CV nào hơn? Gần như chắc chắn là CV thứ hai. Con số giúp người đọc hình dung cụ thể quy mô công việc và mức độ hiệu quả của bạn.

## Vì sao con số lại có sức nặng

Mô tả công việc thường giống nhau giữa những người cùng vị trí. Ai làm kế toán cũng "lập báo cáo", ai làm bán hàng cũng "tìm kiếm khách hàng". Điều làm bạn khác biệt là **bạn đã làm tốt đến mức nào**. Số liệu trả lời câu hỏi đó một cách khách quan, ngắn gọn và dễ so sánh.

## Công thức viết một dòng kinh nghiệm

Một cách đơn giản để viết mỗi gạch đầu dòng là kết hợp ba thành phần:

1. **Động từ hành động** mở đầu: triển khai, tối ưu, xây dựng, rút ngắn, tăng, giảm.
2. **Việc bạn đã làm**: nhiệm vụ cụ thể, công cụ hoặc phương pháp đã dùng.
3. **Kết quả đo được**: con số, tỷ lệ, thời gian, quy mô.

Ví dụ:

- Trước: "Quản lý trang mạng xã hội của cửa hàng."
- Sau: "Xây dựng lịch đăng bài hằng tuần cho trang mạng xã hội của cửa hàng, tăng lượt tương tác trung bình thêm 30% sau ba tháng."
- Trước: "Hỗ trợ kiểm kê kho."
- Sau: "Đề xuất cách sắp xếp lại mã hàng, rút ngắn thời gian kiểm kê cuối tháng từ hai ngày xuống còn một ngày."

## Tìm số liệu ở đâu khi bạn không chắc

Nhiều người nói rằng công việc của mình "không có số để đưa vào". Thực ra, hầu như công việc nào cũng có thể đo lường nếu bạn nhìn từ các góc độ sau:

- **Khối lượng**: bao nhiêu khách hàng, đơn hàng, hồ sơ, bài viết, sản phẩm bạn xử lý.
- **Thời gian**: bạn đã giúp làm nhanh hơn bao nhiêu, hoặc hoàn thành trước hạn bao lâu.
- **Tiền bạc**: doanh thu tăng thêm, chi phí tiết kiệm được, ngân sách bạn quản lý.
- **Chất lượng**: tỷ lệ lỗi giảm, điểm hài lòng tăng, số lần khiếu nại ít đi.
- **Quy mô**: số người trong nhóm bạn phối hợp hoặc hướng dẫn.

Nếu không có số chính xác, bạn có thể dùng con số ước lượng hợp lý như "khoảng", "hơn", "gần", miễn là bạn giải thích được khi bị hỏi lại.

## Những lỗi cần tránh

Số liệu chỉ có giá trị khi chúng **trung thực và có ngữ cảnh**. Một số lỗi thường gặp:

- Thổi phồng con số. Nhà tuyển dụng có kinh nghiệm sẽ nhận ra những tỷ lệ phi thực tế, và bạn có thể bị hỏi rất sâu trong buổi phỏng vấn.
- Đưa con số không rõ nghĩa. "Tăng 200%" nghe ấn tượng, nhưng nếu từ hai khách lên sáu khách thì nên nói rõ quy mô.
- Nhận hết công lao của cả nhóm. Hãy ghi rõ vai trò của bạn, ví dụ "đóng góp vào" hoặc "là một trong ba thành viên".
- Tiết lộ thông tin nội bộ nhạy cảm của nơi làm cũ. Khi cần, hãy dùng tỷ lệ phần trăm thay cho số tiền tuyệt đối.

## Sắp xếp để thành tích nổi bật nhất

Mỗi vị trí trong CV chỉ nên có khoảng ba đến năm gạch đầu dòng. Hãy đặt thành tích ấn tượng và liên quan nhất lên đầu. Không phải dòng nào cũng cần con số, nhưng nếu phần lớn các dòng có kết quả cụ thể, CV của bạn sẽ khác hẳn so với số đông.

Sau khi viết xong, hãy đọc lại từng dòng và tự hỏi: "Nếu bỏ dòng này đi, nhà tuyển dụng có mất thông tin gì quan trọng không?". Nếu câu trả lời là không, hãy viết lại hoặc lược bỏ. Một CV gọn mà sắc nét luôn hiệu quả hơn một CV dài mà nhạt.$md$,
   now() - interval '17 days', 236),
  ('tra-loi-cau-hoi-hanh-vi-theo-mo-hinh-star', 'Trả lời câu hỏi hành vi theo mô hình STAR', 'Mô hình STAR giúp bạn kể lại kinh nghiệm thực tế một cách mạch lạc, có dẫn chứng và kết quả rõ ràng khi gặp các câu hỏi hành vi trong phỏng vấn.', 'INTERVIEW', $md$Những câu hỏi như hãy kể về một lần bạn làm việc dưới áp lực, hay bạn đã xử lý xung đột với đồng nghiệp ra sao, được gọi là câu hỏi hành vi. Nhà tuyển dụng tin rằng cách bạn đã hành động trong quá khứ là dấu hiệu tốt để dự đoán cách bạn sẽ làm trong tương lai. Vấn đề là nhiều người trả lời lan man, thiếu điểm nhấn. Mô hình STAR là công cụ đơn giản để khắc phục điều đó.

## STAR là gì

STAR là viết tắt của bốn phần trong một câu chuyện:

- **Tình huống**: bối cảnh diễn ra sự việc, ở đâu, khi nào, có ai liên quan.
- **Nhiệm vụ**: mục tiêu hoặc trách nhiệm cụ thể của bạn trong tình huống đó.
- **Hành động**: những bước bạn đã thực hiện và lý do bạn chọn cách làm ấy.
- **Kết quả**: điều gì đã xảy ra sau đó, tốt nhất là có số liệu hoặc phản hồi cụ thể.

Điểm mấu chốt là phần hành động nên chiếm nhiều thời lượng nhất, khoảng một nửa câu trả lời. Đây là nơi người phỏng vấn nhìn thấy kỹ năng, cách tư duy và thái độ của bạn.

## Một ví dụ minh họa

Giả sử câu hỏi là hãy kể về một lần bạn phải hoàn thành công việc với thời hạn rất gấp.

Tình huống: Khi làm nhân viên kinh doanh tại một công ty phân phối thiết bị văn phòng, khách hàng lớn yêu cầu báo giá chi tiết cho hơn hai trăm mặt hàng trong vòng một ngày, trong khi quy trình thông thường mất ba ngày.

Nhiệm vụ: Tôi chịu trách nhiệm gửi báo giá đúng hạn mà vẫn đảm bảo độ chính xác về giá và tồn kho.

Hành động: Tôi chia danh sách thành ba nhóm theo nhà cung cấp, nhờ bộ phận kho kiểm tra song song từng nhóm, đồng thời dùng mẫu báo giá cũ để tiết kiệm thời gian định dạng. Tôi chủ động gọi cho khách hàng để xác nhận các mặt hàng chưa rõ quy cách, tránh phải sửa lại về sau.

Kết quả: Báo giá được gửi trước hạn hai tiếng, khách hàng chốt đơn với giá trị lớn nhất quý. Sau đó, nhóm tôi giữ lại cách chia việc này làm quy trình chuẩn cho các yêu cầu gấp.

## Cách chuẩn bị kho câu chuyện

Bạn không thể đoán trước mọi câu hỏi, nhưng có thể chuẩn bị những câu chuyện dùng được cho nhiều chủ đề. Hãy làm theo các bước sau:

1. Liệt kê các năng lực mà vị trí yêu cầu, ví dụ làm việc nhóm, giải quyết vấn đề, lãnh đạo, giao tiếp với khách hàng.
2. Với mỗi năng lực, tìm ít nhất một trải nghiệm thật của bạn.
3. Viết tóm tắt từng câu chuyện theo bốn phần STAR, mỗi phần chỉ hai đến ba câu.
4. Tập kể lại thành tiếng sao cho trọn vẹn trong khoảng hai phút.

Nên chuẩn bị cả một câu chuyện về thất bại. Khi kể, hãy tập trung vào những gì bạn học được và đã thay đổi như thế nào, thay vì đổ lỗi cho hoàn cảnh.

## Những lỗi thường gặp

### Nói chúng tôi thay vì tôi

Làm việc nhóm là điều tốt, nhưng người phỏng vấn cần biết vai trò riêng của bạn. Hãy nói rõ bạn đã làm gì, đề xuất gì, quyết định gì.

### Bỏ quên kết quả

Nhiều câu trả lời dừng lại ở phần hành động. Một kết quả cụ thể, dù nhỏ, giúp câu chuyện có sức thuyết phục hơn hẳn. Nếu không có số liệu, hãy nêu phản hồi của cấp trên hoặc khách hàng.

### Kể chuyện quá dài

Mất ba phút chỉ để giải thích bối cảnh sẽ khiến người nghe mất tập trung. Hãy giữ phần tình huống và nhiệm vụ thật ngắn gọn.

## Lời khuyên cuối

STAR không phải là một kịch bản cứng nhắc để học thuộc. Nó là khung sườn giúp bạn sắp xếp suy nghĩ. Khi đã quen, bạn sẽ kể chuyện tự nhiên hơn, và người phỏng vấn sẽ dễ dàng nhìn thấy giá trị bạn mang lại. Nếu được hỏi thêm chi tiết, đó là dấu hiệu tốt cho thấy họ đang quan tâm đến câu chuyện của bạn.$md$,
   now() - interval '20 days', 273),
  ('thuong-luong-luong-khi-nhan-offer', 'Thương lượng lương khi nhận offer: chuẩn bị, trao đổi và chốt lại', 'Nhận được thư mời làm việc là tin vui, nhưng đó cũng là thời điểm thích hợp để bạn thương lượng một cách khéo léo cho mức đãi ngộ xứng đáng.', 'SALARY', $md$Sau nhiều vòng phỏng vấn, bạn nhận được thư mời làm việc. Đây là lúc nhiều người vội vàng đồng ý ngay vì sợ mất cơ hội. Thực tế, khi doanh nghiệp đã quyết định chọn bạn, họ thường sẵn sàng lắng nghe một đề xuất hợp lý. Thương lượng lương không phải là đòi hỏi, mà là cuộc trao đổi để hai bên cùng đi đến một thỏa thuận thoải mái.

## Đọc kỹ thư mời trước khi phản hồi

Đừng trả lời ngay trong vài phút đầu. Hãy cảm ơn nhà tuyển dụng và xin thêm một khoảng thời gian ngắn, thường là một đến hai ngày, để xem xét. Trong thời gian đó, hãy kiểm tra các thông tin:

- Mức lương ghi trong thư là **gross hay net**.
- Thời gian thử việc và mức lương trong giai đoạn thử việc.
- Các khoản thưởng, phụ cấp và cách tính.
- Chế độ bảo hiểm, ngày nghỉ phép, giờ làm việc.
- Chức danh, cấp bậc và người quản lý trực tiếp.

Nếu có điểm nào chưa rõ, hãy hỏi lại bằng văn bản để có căn cứ về sau.

## Chuẩn bị lập luận cho đề xuất của bạn

Một đề xuất thuyết phục cần có cơ sở. Hãy dựa vào những điểm sau:

1. **Mặt bằng lương thị trường** cho vị trí tương tự mà bạn đã tìm hiểu.
2. **Kinh nghiệm và kỹ năng** cụ thể giúp bạn đóng góp nhanh hơn, đặc biệt là những điểm nhà tuyển dụng đã tỏ ra quan tâm trong buổi phỏng vấn.
3. **Phạm vi công việc thực tế** nếu nó rộng hơn so với mô tả ban đầu.

Hãy xác định trước con số mục tiêu và mức thấp nhất bạn chấp nhận. Khi đưa ra đề xuất, nên nêu con số cao hơn mục tiêu một chút để còn khoảng trống trao đổi, nhưng vẫn trong giới hạn hợp lý.

## Cách trao đổi khéo léo

Giọng điệu quyết định rất nhiều đến kết quả. Hãy bắt đầu bằng sự hào hứng với vị trí, sau đó mới nói đến đề xuất. Ví dụ:

"Tôi rất vui khi nhận được thư mời và thực sự mong muốn được gia nhập đội ngũ. Dựa trên kinh nghiệm triển khai các dự án tương tự và mặt bằng chung cho vị trí này, tôi mong công ty có thể cân nhắc mức lương ở khoảng... Tôi sẵn sàng trao đổi thêm để tìm phương án phù hợp cho cả hai bên."

Một vài nguyên tắc nên nhớ:

- Nói về **giá trị bạn mang lại**, không nói về nhu cầu cá nhân như tiền nhà hay khoản vay.
- Giữ thái độ hợp tác, tránh so sánh hay gây áp lực bằng thư mời khác nếu bạn không thực sự có.
- Lắng nghe phản hồi và đặt câu hỏi để hiểu giới hạn ngân sách của doanh nghiệp.

## Khi doanh nghiệp không thể tăng lương

Đôi khi khung lương đã cố định. Lúc này, bạn vẫn có thể thương lượng những yếu tố khác:

- Rút ngắn thời gian thử việc hoặc nhận đủ lương trong giai đoạn thử việc.
- Cam kết xét tăng lương sau một mốc thời gian cụ thể, kèm tiêu chí đánh giá rõ ràng.
- Thêm ngày nghỉ phép, chế độ làm việc từ xa vài ngày mỗi tuần.
- Hỗ trợ chi phí đào tạo, chứng chỉ chuyên môn.
- Phụ cấp đi lại, ăn trưa hoặc thiết bị làm việc.

Những điều này đôi khi dễ được chấp thuận hơn và vẫn mang lại giá trị thực tế cho bạn.

## Chốt thỏa thuận bằng văn bản

Khi hai bên đã thống nhất, hãy đề nghị nhà tuyển dụng gửi lại **thư mời cập nhật** ghi đầy đủ các điều kiện mới. Đọc kỹ lần cuối, đối chiếu với những gì đã trao đổi rồi mới xác nhận đồng ý. Nếu bạn quyết định từ chối, hãy phản hồi sớm, lịch sự và cảm ơn họ đã dành thời gian. Giữ mối quan hệ tốt có thể mở ra cơ hội khác trong tương lai.

Thương lượng lương là kỹ năng có thể rèn luyện. Càng chuẩn bị kỹ, bạn càng bình tĩnh và cuộc trao đổi càng diễn ra tự nhiên.$md$,
   now() - interval '23 days', 70),
  ('chuyen-nganh-an-toan', 'Chuyển ngành an toàn: làm sao đổi nghề mà không đánh cược tất cả', 'Chuyển ngành không nhất thiết phải là một bước nhảy liều lĩnh, hãy kiểm chứng, chuẩn bị tài chính và tận dụng kỹ năng sẵn có để đổi nghề vững vàng.', 'CAREER', $md$Nhiều người đi làm vài năm rồi nhận ra công việc hiện tại không còn phù hợp. Mong muốn chuyển ngành là chính đáng, nhưng nỗi sợ mất thu nhập, bắt đầu lại từ đầu và bị đánh giá thiếu kinh nghiệm khiến không ít người chần chừ mãi. Tin tốt là chuyển ngành có thể được thực hiện từng bước, giảm rủi ro ở mức thấp nhất.

## Xác định rõ lý do muốn chuyển

Trước khi quyết định, hãy phân biệt bạn đang chán nghề hay chỉ chán môi trường hiện tại. Nếu vấn đề nằm ở cấp trên, đồng nghiệp hay chính sách công ty, việc chuyển sang một nơi khác cùng ngành có thể đã đủ để giải quyết.

Hãy tự hỏi:

- Điều gì cụ thể khiến bạn không muốn tiếp tục công việc này?
- Ngành mới hấp dẫn bạn ở điểm nào, và bạn đã tìm hiểu nó kỹ đến đâu?
- Bạn có sẵn sàng chấp nhận vị trí thấp hơn hoặc thu nhập giảm trong một thời gian không?

## Kiểm chứng trước khi nhảy

Đừng nghỉ việc chỉ dựa trên hình dung. Hãy thử trải nghiệm ngành mới bằng những cách ít tốn kém:

1. Trò chuyện với ba đến năm người đang làm trong ngành, hỏi họ về công việc hằng ngày, khó khăn và lộ trình thăng tiến.
2. Tham gia một khóa học ngắn hoặc tự học qua tài liệu miễn phí để xem mình có thật sự hứng thú.
3. Nhận một dự án nhỏ làm thêm, làm tình nguyện hoặc hỗ trợ một bộ phận liên quan ngay trong công ty hiện tại.
4. Theo dõi tin tuyển dụng của ngành mới để biết yêu cầu thực tế và mức lương phổ biến.

Sau vài tháng, bạn sẽ có đủ thông tin để quyết định dựa trên trải nghiệm thật, chứ không phải trên tưởng tượng.

## Chuẩn bị nền tảng tài chính

Giai đoạn chuyển đổi thường kéo dài hơn dự kiến. Hãy chuẩn bị một khoản dự phòng đủ chi tiêu thiết yếu trong ít nhất sáu tháng. Nếu có thể, hãy cắt giảm các khoản chi không cần thiết từ sớm để làm quen với mức sống thấp hơn.

Một lựa chọn an toàn khác là chuyển ngành trong khi vẫn giữ công việc cũ, dành buổi tối và cuối tuần để học và tích lũy dự án. Cách này chậm hơn nhưng giúp bạn không bị áp lực tài chính chi phối quyết định.

## Tận dụng kỹ năng chuyển đổi

Bạn không thực sự bắt đầu từ con số không. Rất nhiều kỹ năng có thể mang theo sang ngành mới, chẳng hạn giao tiếp, quản lý thời gian, làm việc với khách hàng, phân tích số liệu hay quản lý dự án.

Ví dụ, một giáo viên chuyển sang làm đào tạo nội bộ doanh nghiệp đã có sẵn kỹ năng thiết kế bài giảng và truyền đạt. Một nhân viên kế toán chuyển sang phân tích dữ liệu đã quen với số liệu và sự chính xác. Hãy liệt kê những kỹ năng này và thể hiện rõ trong hồ sơ.

### Viết lại hồ sơ theo hướng ngành mới

- Đặt phần tóm tắt nghề nghiệp lên đầu, nêu rõ định hướng mới và lý do.
- Ưu tiên các dự án, khóa học liên quan đến ngành mới.
- Mô tả kinh nghiệm cũ bằng ngôn ngữ mà nhà tuyển dụng ngành mới dễ hiểu.

## Chọn con đường vào ngành phù hợp

Có nhiều cửa để bước vào một ngành mới. Bạn có thể chuyển nội bộ sang bộ phận khác trong công ty hiện tại, nơi người quản lý đã biết năng lực của bạn. Bạn cũng có thể ứng tuyển vị trí ở giao điểm giữa hai ngành, ví dụ người làm bán hàng chuyển sang marketing cho sản phẩm mình đã quen thuộc.

**Kiên nhẫn là yếu tố quyết định.** Chuyển ngành thành công thường mất từ sáu tháng đến hai năm. Hãy ghi nhận từng tiến bộ nhỏ và tin rằng mỗi bước chuẩn bị đều đưa bạn gần hơn đến công việc mình thật sự mong muốn.$md$,
   now() - interval '26 days', 107),
  ('giao-tiep-va-phan-hoi-voi-quan-ly-dong-nghiep', 'Giao tiếp và phản hồi hiệu quả với quản lý và đồng nghiệp', 'Biết cách trao đổi rõ ràng, góp ý khéo léo và tiếp nhận phản hồi bình tĩnh sẽ giúp bạn làm việc nhóm trơn tru và phát triển nhanh hơn.', 'WORKPLACE', $md$Năng lực chuyên môn giúp bạn hoàn thành công việc, nhưng kỹ năng giao tiếp mới quyết định công việc đó có được nhìn nhận đúng giá trị hay không. Rất nhiều hiểu lầm ở nơi làm việc không đến từ ý xấu, mà từ những thông điệp mơ hồ, những lời góp ý thiếu tế nhị hoặc sự im lặng đúng lúc cần lên tiếng. Bài viết này gợi ý cách giao tiếp rõ ràng hơn với cả quản lý lẫn đồng nghiệp.

## Trao đổi với quản lý: rõ ràng và chủ động

Quản lý thường phải theo dõi nhiều việc cùng lúc, vì vậy thông tin bạn gửi càng gọn và rõ thì càng có ích. Một nguyên tắc đơn giản là **nói kết luận trước, chi tiết sau**.

- Khi báo cáo, hãy nêu tình trạng hiện tại, rủi ro nếu có và việc bạn cần hỗ trợ.
- Khi gặp khó khăn, báo sớm kèm một hai phương án bạn đã nghĩ tới, thay vì chỉ nói "em bị kẹt".
- Khi nhận việc mới, xác nhận lại mục tiêu, thời hạn và mức độ ưu tiên so với các việc đang làm.
- Đề xuất lịch trao đổi ngắn định kỳ, ví dụ mười lăm phút mỗi tuần, để hai bên luôn nắm cùng một bức tranh.

Sự chủ động không có nghĩa là làm phiền. Bạn có thể gom các câu hỏi nhỏ lại và hỏi một lần, trừ khi vấn đề thực sự gấp.

## Phối hợp với đồng nghiệp: tôn trọng và minh bạch

Với đồng nghiệp, mục tiêu là xây dựng sự tin cậy lẫn nhau. Hãy giữ lời hứa về thời hạn, và nếu không kịp thì báo trước thay vì để người khác phải đi hỏi. Khi nhờ giúp đỡ, hãy nói rõ bạn cần gì, khi nào cần và vì sao việc đó quan trọng.

Trong các cuộc thảo luận nhóm, hãy lắng nghe trọn ý người khác trước khi phản biện. Một câu hỏi như "anh chị có thể nói thêm vì sao chọn cách này không" thường mở ra cuộc trao đổi tốt hơn nhiều so với việc phủ nhận ngay.

## Cách đưa ra phản hồi mang tính xây dựng

Góp ý là điều cần thiết, nhưng cách nói quyết định người nghe có tiếp nhận hay không. Bạn có thể áp dụng trình tự sau:

1. **Mô tả tình huống cụ thể**, tránh nhận xét chung chung về con người.
2. **Nêu tác động** của hành vi đó tới công việc hoặc tới nhóm.
3. **Đề xuất hướng cải thiện** và hỏi ý kiến của người nghe.

Ví dụ, thay vì nói "bạn lúc nào cũng gửi báo cáo muộn", hãy nói "báo cáo tuần trước đến sau hạn một ngày, nên mình phải lùi buổi họp với khách. Lần tới nếu có vướng mắc, bạn báo sớm để mình sắp xếp lại nhé". Cách nói này tập trung vào sự việc và giải pháp, không khiến người nghe cảm thấy bị công kích.

Hãy góp ý riêng tư khi nội dung nhạy cảm, và đừng quên ghi nhận công khai những điều đồng nghiệp làm tốt.

## Tiếp nhận phản hồi một cách bình tĩnh

Nghe góp ý về bản thân chưa bao giờ dễ chịu. Phản ứng tự nhiên là giải thích hoặc phòng thủ, nhưng điều đó dễ khiến người khác ngần ngại góp ý lần sau.

- Hít thở và lắng nghe đến hết, đừng ngắt lời.
- Hỏi thêm ví dụ cụ thể nếu bạn chưa hiểu rõ.
- Cảm ơn người góp ý, kể cả khi bạn chưa hoàn toàn đồng ý.
- Dành thời gian suy nghĩ rồi mới quyết định thay đổi điều gì.

Nếu bạn thấy góp ý chưa chính xác, hãy quay lại trao đổi khi đã bình tĩnh, kèm dữ liệu hoặc ví dụ cụ thể.

## Lời kết

Giao tiếp tốt là kỹ năng có thể luyện tập mỗi ngày. Bắt đầu từ những việc nhỏ như viết tin nhắn rõ ràng, báo tiến độ đúng lúc và góp ý bằng sự tôn trọng, bạn sẽ thấy các mối quan hệ công việc trở nên nhẹ nhàng và hiệu quả hơn rất nhiều.$md$,
   now() - interval '29 days', 144),
  ('toi-uu-cv-va-thu-xin-viec-theo-tin-tuyen-dung', 'Tối ưu CV và thư xin việc theo từng tin tuyển dụng', 'Gửi cùng một CV cho mọi vị trí là cách nhanh nhất để bị bỏ qua; hãy học cách điều chỉnh CV và thư xin việc cho khớp với từng tin tuyển dụng.', 'CV', $md$Khi tìm việc, nhiều người có thói quen chuẩn bị một bộ CV rồi gửi đi hàng chục nơi. Cách này tiết kiệm thời gian nhưng hiệu quả thường thấp, bởi mỗi vị trí có yêu cầu và trọng tâm khác nhau. Chỉ cần dành thêm khoảng ba mươi phút để điều chỉnh cho từng tin tuyển dụng, cơ hội được gọi phỏng vấn của bạn có thể cải thiện đáng kể.

## Đọc kỹ tin tuyển dụng như đọc đề bài

Tin tuyển dụng chính là "đề bài" mà nhà tuyển dụng đưa ra. Trước khi chỉnh CV, hãy đọc kỹ và đánh dấu ba nhóm thông tin:

- **Trách nhiệm chính**: những việc bạn sẽ làm hằng ngày.
- **Yêu cầu bắt buộc**: bằng cấp, số năm kinh nghiệm, kỹ năng chuyên môn.
- **Yêu cầu ưu tiên**: những điểm cộng nếu có.

Sau đó, hãy lập một danh sách từ khóa xuất hiện nhiều lần, ví dụ tên công cụ, phương pháp làm việc hay kỹ năng cụ thể. Đây là những điều nhà tuyển dụng quan tâm nhất, và nhiều hệ thống lọc hồ sơ tự động cũng dựa vào chúng để xếp hạng ứng viên.

## Điều chỉnh CV cho khớp với yêu cầu

Bạn không cần viết lại CV từ đầu. Hãy giữ một **bản CV gốc** đầy đủ mọi kinh nghiệm, rồi tạo bản sao cho từng vị trí và chỉnh theo các bước:

1. Sửa mục tiêu nghề nghiệp để nhắc đúng tên vị trí và lĩnh vực của nơi tuyển dụng.
2. Sắp xếp lại các gạch đầu dòng trong mục kinh nghiệm, đưa những thành tích liên quan nhất lên đầu.
3. Dùng đúng thuật ngữ mà tin tuyển dụng sử dụng, nếu bạn thực sự có kỹ năng đó. Ví dụ tin ghi "quản lý dự án" thì đừng chỉ viết "điều phối công việc".
4. Lược bớt những chi tiết không liên quan để CV gọn hơn.
5. Bổ sung chứng chỉ hoặc dự án phụ phù hợp với yêu cầu ưu tiên.

Lưu ý quan trọng: tối ưu không có nghĩa là bịa đặt. Chỉ đưa vào những kỹ năng bạn có thể chứng minh khi được hỏi.

## Viết thư xin việc ngắn gọn mà có trọng tâm

Thư xin việc là cơ hội để bạn nói điều mà CV không thể hiện được: lý do bạn quan tâm đến vị trí này và vì sao bạn phù hợp. Một lá thư tốt thường chỉ dài khoảng ba đến bốn đoạn ngắn.

### Đoạn mở đầu

Giới thiệu bạn là ai, ứng tuyển vị trí nào và biết đến cơ hội từ đâu. Hãy đi thẳng vào vấn đề thay vì những câu chào hỏi dài dòng.

### Đoạn thân bài

Chọn **hai hoặc ba yêu cầu quan trọng nhất** trong tin tuyển dụng và đưa ra bằng chứng bạn đáp ứng được. Ví dụ: "Vị trí yêu cầu khả năng phân tích số liệu bán hàng. Ở công việc trước, tôi đã xây dựng báo cáo tuần giúp nhóm phát hiện sớm những mặt hàng tồn kho chậm."

### Đoạn kết

Thể hiện mong muốn được trao đổi thêm, cảm ơn người đọc và để lại thông tin liên hệ. Giọng văn nên lịch sự, tự tin nhưng không khoa trương.

## Kiểm tra lần cuối trước khi nộp

Trước khi bấm gửi, hãy rà soát theo danh sách sau:

- Tên vị trí và tên công ty trong thư đã đúng chưa, đặc biệt khi bạn dùng lại mẫu cũ.
- Các từ khóa chính trong tin tuyển dụng đã xuất hiện tự nhiên trong CV chưa.
- Tệp đính kèm có định dạng PDF, đặt tên rõ ràng và mở được trên điện thoại không.
- Email gửi kèm có tiêu đề ghi rõ vị trí ứng tuyển và họ tên của bạn không.

Việc điều chỉnh CV cho từng tin tuyển dụng ban đầu có thể mất công, nhưng sau vài lần bạn sẽ quen tay. Quan trọng hơn, quá trình này giúp bạn hiểu rõ mình thực sự phù hợp với những vị trí nào, từ đó tập trung năng lượng vào đúng cơ hội thay vì gửi hồ sơ tràn lan.$md$,
   now() - interval '32 days', 181),
  ('phong-van-online-va-cau-hoi-nen-hoi-lai', 'Phỏng vấn online và những câu nên hỏi lại nhà tuyển dụng', 'Chuẩn bị kỹ thuật, không gian và thái độ cho buổi phỏng vấn trực tuyến, kèm gợi ý những câu hỏi thông minh để bạn chủ động hỏi lại nhà tuyển dụng.', 'INTERVIEW', $md$Phỏng vấn trực tuyến ngày càng phổ biến, đặc biệt ở vòng sơ loại. Hình thức này tiết kiệm thời gian đi lại, nhưng cũng có những thử thách riêng: đường truyền chập chờn, âm thanh kém, hoặc cảm giác khó kết nối qua màn hình. Bài viết này giúp bạn chuẩn bị tốt cả phần kỹ thuật lẫn phần nội dung, đặc biệt là những câu hỏi nên hỏi lại ở cuối buổi.

## Chuẩn bị kỹ thuật trước ít nhất một ngày

Đừng để sự cố kỹ thuật làm bạn mất bình tĩnh ngay từ phút đầu. Hãy kiểm tra trước:

- Cài đặt và đăng nhập thử ứng dụng họp trực tuyến mà nhà tuyển dụng sử dụng.
- Kiểm tra camera, micro và loa, nên dùng tai nghe có micro để giảm tiếng vọng.
- Đảm bảo kết nối mạng ổn định, chuẩn bị phương án dự phòng như phát mạng từ điện thoại.
- Sạc đầy pin máy tính và tắt các thông báo không cần thiết.
- Đặt tên hiển thị đúng họ tên của bạn, tránh biệt danh.

Nếu có thể, hãy thực hiện một cuộc gọi thử với bạn bè để xem hình ảnh và âm thanh thực tế của mình.

## Không gian và hình ảnh

Chọn một góc yên tĩnh, phía sau gọn gàng, ánh sáng chiếu từ phía trước mặt thay vì từ sau lưng. Đặt camera ngang tầm mắt để tránh góc nhìn từ dưới lên. Trang phục nên chỉn chu như khi phỏng vấn trực tiếp, ít nhất là phần thân trên.

Một mẹo nhỏ là dán tờ ghi chú gồm vài ý chính ở cạnh màn hình. Tuy nhiên, đừng đọc nguyên văn, vì người phỏng vấn dễ nhận ra khi ánh mắt bạn liên tục nhìn sang chỗ khác.

## Giao tiếp hiệu quả qua màn hình

Khi nói, hãy nhìn vào camera thay vì nhìn vào hình ảnh của người phỏng vấn, như vậy họ sẽ cảm thấy bạn đang giao tiếp bằng mắt. Nói chậm hơn bình thường một chút và ngắt câu rõ ràng, vì độ trễ đường truyền có thể khiến hai bên nói chồng lên nhau.

Nếu mạng bị gián đoạn, đừng hoảng. Hãy bình tĩnh nói lại rằng đường truyền vừa bị ngắt và hỏi người phỏng vấn đã nghe đến đoạn nào. Cách xử lý điềm tĩnh này cũng là một điểm cộng.

## Những câu nên hỏi lại nhà tuyển dụng

Gần như mọi buổi phỏng vấn đều kết thúc bằng câu hỏi bạn có muốn hỏi gì không. Trả lời không có là bỏ lỡ cơ hội thể hiện sự quan tâm. Dưới đây là một số gợi ý theo từng nhóm.

### Về công việc

1. Một ngày làm việc điển hình ở vị trí này diễn ra như thế nào?
2. Trong ba tháng đầu, anh chị kỳ vọng người đảm nhận đạt được những kết quả gì?
3. Thử thách lớn nhất của vị trí này hiện nay là gì?

### Về đội nhóm và văn hóa

1. Đội nhóm hiện có bao nhiêu người và phối hợp với các bộ phận nào?
2. Cách đội nhóm trao đổi và đưa ra phản hồi cho nhau ra sao?
3. Khi làm việc từ xa, công ty duy trì sự gắn kết bằng cách nào?

### Về phát triển và bước tiếp theo

1. Người làm tốt ở vị trí này thường phát triển theo hướng nào?
2. Quy trình tuyển dụng còn những vòng nào và khi nào tôi có thể nhận phản hồi?

Bạn chỉ cần chọn hai đến ba câu phù hợp nhất. Tránh hỏi về lương thưởng hay ngày nghỉ ngay ở vòng đầu, trừ khi người phỏng vấn chủ động nhắc đến.

## Sau buổi phỏng vấn

Trong vòng một ngày, hãy gửi một tin nhắn hoặc thư ngắn cảm ơn người phỏng vấn đã dành thời gian. Nhắc lại một điểm bạn thấy ấn tượng trong cuộc trò chuyện và khẳng định sự quan tâm của mình với vị trí. **Một lời cảm ơn đúng lúc** có thể giúp bạn nổi bật giữa nhiều ứng viên có năng lực tương đương.$md$,
   now() - interval '35 days', 218),
  ('hieu-phieu-luong-gross-net-bao-hiem-thue', 'Hiểu phiếu lương: lương gross, lương net, bảo hiểm và thuế thu nhập cá nhân', 'Nắm được các khoản trên phiếu lương giúp bạn hiểu vì sao số tiền thực nhận khác với con số trong hợp đồng và kiểm tra được quyền lợi của mình.', 'SALARY', $md$Nhiều người đi làm lần đầu bất ngờ khi thấy số tiền chuyển vào tài khoản thấp hơn con số đã thỏa thuận. Nguyên nhân thường không phải do sai sót, mà vì lương được trừ đi một số khoản bắt buộc theo quy định.

## Lương gross và lương net khác nhau thế nào

**Lương gross** là tổng thu nhập trước khi trừ các khoản bảo hiểm bắt buộc và thuế thu nhập cá nhân. Đây thường là con số ghi trong hợp đồng lao động.

**Lương net** là số tiền thực nhận sau khi đã trừ các khoản trên. Có thể hiểu đơn giản: lương net bằng lương gross trừ đi phần bảo hiểm người lao động phải đóng, trừ tiếp thuế thu nhập cá nhân nếu có.

Khi trao đổi về lương, hãy luôn hỏi rõ con số được nói là gross hay net.

## Các khoản bảo hiểm bắt buộc

Theo quy định hiện hành, người lao động làm việc theo hợp đồng từ một thời hạn nhất định trở lên sẽ tham gia ba loại bảo hiểm bắt buộc:

- **Bảo hiểm xã hội**: phục vụ các chế độ như ốm đau, thai sản, tai nạn lao động và lương hưu.
- **Bảo hiểm y tế**: hỗ trợ chi phí khám chữa bệnh.
- **Bảo hiểm thất nghiệp**: hỗ trợ một phần thu nhập và học nghề khi bạn mất việc.

Mỗi loại bảo hiểm được tính theo một tỷ lệ phần trăm trên **mức lương đóng bảo hiểm**, không nhất thiết bằng tổng lương gross. Cả người lao động và doanh nghiệp đều cùng đóng, trong đó phần doanh nghiệp đóng thường lớn hơn và không trừ vào lương của bạn. Tỷ lệ cụ thể và mức trần có thể thay đổi theo từng thời kỳ, vì vậy hãy tham khảo văn bản pháp luật mới nhất hoặc hỏi bộ phận nhân sự.

## Thuế thu nhập cá nhân ở mức khái quát

Thuế thu nhập cá nhân được tính trên **thu nhập tính thuế**, tức là phần thu nhập còn lại sau khi đã trừ đi một số khoản. Quy trình chung gồm các bước:

1. Lấy tổng thu nhập chịu thuế trong tháng, bao gồm lương và phần lớn các khoản thưởng, phụ cấp.
2. Trừ các khoản được miễn như một số loại phụ cấp theo quy định.
3. Trừ phần bảo hiểm bắt buộc mà người lao động đã đóng.
4. Trừ các khoản giảm trừ gia cảnh cho bản thân và người phụ thuộc đã đăng ký.
5. Phần còn lại, nếu lớn hơn không, sẽ được tính thuế theo biểu thuế lũy tiến từng phần.

Biểu thuế lũy tiến nghĩa là phần thu nhập càng cao thì chịu thuế suất càng lớn. Mức giảm trừ gia cảnh và các bậc thuế được áp dụng theo quy định hiện hành nên có thể được điều chỉnh. Nếu bạn có người phụ thuộc như con nhỏ hoặc cha mẹ không có thu nhập, hãy đăng ký với bộ phận nhân sự để được giảm trừ đúng quyền lợi.

## Đọc một phiếu lương như thế nào

Một phiếu lương thông thường gồm các phần:

- **Thu nhập**: lương cơ bản, lương làm thêm giờ, thưởng, các loại phụ cấp.
- **Các khoản khấu trừ**: bảo hiểm bắt buộc, thuế thu nhập cá nhân, có thể có đoàn phí hoặc khoản tạm ứng.
- **Số ngày công**: ngày làm việc thực tế, ngày nghỉ phép, ngày nghỉ không lương.
- **Thực lĩnh**: số tiền cuối cùng bạn nhận được.

Mỗi tháng, hãy dành vài phút đối chiếu số ngày công, giờ làm thêm và các khoản thưởng với ghi chép của bạn. Nếu thấy chênh lệch, hãy hỏi bộ phận nhân sự càng sớm càng tốt.

## Một vài lưu ý để bảo vệ quyền lợi

- Lưu giữ hợp đồng lao động và phiếu lương hằng tháng.
- Định kỳ kiểm tra quá trình đóng bảo hiểm xã hội của mình qua các kênh tra cứu chính thức.

Hiểu phiếu lương không đòi hỏi bạn phải là chuyên gia kế toán. Chỉ cần nắm các khái niệm cơ bản, bạn đã có thể yên tâm hơn về thu nhập và chủ động lên kế hoạch tài chính cho bản thân.$md$,
   now() - interval '38 days', 255),
  ('hoc-ky-nang-moi-va-xay-dung-thuong-hieu-ca-nhan', 'Học kỹ năng mới và xây dựng thương hiệu cá nhân', 'Cách chọn kỹ năng đáng học, học hiệu quả khi bận rộn và chia sẻ hành trình đó để xây dựng thương hiệu cá nhân đáng tin cậy trong mắt nhà tuyển dụng.', 'CAREER', $md$Trong thị trường lao động thay đổi nhanh, kỹ năng hôm nay có thể trở nên lỗi thời chỉ sau vài năm. Người đi làm vì thế cần học liên tục. Nhưng học thôi chưa đủ, bạn còn cần để người khác biết mình giỏi gì. Đó là lúc thương hiệu cá nhân phát huy tác dụng. Bài viết này gợi ý cách kết hợp hai việc trên một cách tự nhiên và bền vững.

## Chọn kỹ năng đáng đầu tư

Thời gian có hạn, nên hãy chọn kỹ năng một cách có chủ đích. Một kỹ năng đáng học thường đáp ứng ít nhất hai trong ba tiêu chí:

- Xuất hiện thường xuyên trong tin tuyển dụng của vị trí bạn nhắm tới.
- Giúp bạn làm tốt hơn ngay công việc hiện tại.
- Bạn thật sự thấy hứng thú, đủ để duy trì việc học trong nhiều tháng.

Hãy cân bằng giữa kỹ năng chuyên môn như phân tích dữ liệu, thiết kế, ngoại ngữ và kỹ năng mềm như thuyết trình, viết rõ ràng, quản lý thời gian. Kỹ năng mềm thường bị xem nhẹ nhưng lại quyết định rất nhiều đến cơ hội thăng tiến.

## Học hiệu quả khi bận rộn

Người đi làm hiếm khi có nhiều thời gian liền mạch. Vì vậy, hãy học theo cách phù hợp với nhịp sống của mình.

1. Đặt mục tiêu nhỏ và đo được, ví dụ hoàn thành một bài học mỗi ngày trong ba mươi phút.
2. Học qua dự án thực tế thay vì chỉ xem video, vì làm ra sản phẩm giúp nhớ lâu hơn.
3. Áp dụng ngay vào công việc, dù chỉ là một báo cáo hay một bài thuyết trình nhỏ.
4. Tìm một người bạn học cùng hoặc tham gia cộng đồng để giữ động lực.
5. Mỗi cuối tuần ghi lại những gì đã học và còn vướng mắc ở đâu.

**Sự đều đặn quan trọng hơn cường độ.** Ba mươi phút mỗi ngày trong sáu tháng hiệu quả hơn nhiều so với học dồn vài ngày rồi bỏ dở.

## Thương hiệu cá nhân là gì

Thương hiệu cá nhân đơn giản là ấn tượng mà người khác có về bạn trong công việc. Khi nhắc đến tên bạn, đồng nghiệp và nhà tuyển dụng nghĩ ngay đến điều gì? Đó có thể là người rất cẩn thận với số liệu, người luôn có ý tưởng sáng tạo, hay người giải quyết khiếu nại khách hàng giỏi nhất.

Thương hiệu cá nhân không phải là khoe khoang. Nó được xây dựng từ năng lực thật, hành động nhất quán và sự chia sẻ chân thành.

## Biến việc học thành thương hiệu

Hành trình học tập của bạn chính là chất liệu tốt nhất để xây dựng thương hiệu. Một số cách làm cụ thể:

- Viết bài chia sẻ ngắn về những gì vừa học được trên trang mạng nghề nghiệp, mỗi tuần hoặc mỗi hai tuần một lần.
- Tổng hợp các dự án cá nhân thành một bộ hồ sơ năng lực, có mô tả vấn đề, cách làm và kết quả.
- Chủ động chia sẻ kiến thức trong nhóm, ví dụ tổ chức một buổi trao đổi nội bộ ngắn.
- Hỗ trợ người mới trong cộng đồng, trả lời câu hỏi bằng kinh nghiệm thật của mình.

### Giữ sự nhất quán

Hãy chọn một hoặc hai chủ đề chính để tập trung. Nếu hôm nay bạn viết về thiết kế, ngày mai về tài chính, ngày kia về du lịch, người đọc sẽ khó nhớ bạn là ai. Ảnh đại diện, phần giới thiệu và hồ sơ xin việc cũng nên thống nhất một thông điệp.

## Kiên trì và đo lường

Thương hiệu cá nhân không hình thành sau vài bài đăng. Hãy theo dõi những dấu hiệu tích cực như số lời mời kết nối, lời nhờ tư vấn hay cơ hội phỏng vấn tìm đến bạn. Sau một năm kiên trì học và chia sẻ, bạn sẽ ngạc nhiên vì mình đã đi xa đến đâu, và nhà tuyển dụng cũng sẽ dễ dàng nhìn thấy giá trị của bạn hơn.$md$,
   now() - interval '41 days', 52),
  ('can-bang-cong-viec-cuoc-song-lam-viec-tu-xa-hybrid', 'Cân bằng công việc và cuộc sống khi làm việc từ xa hoặc hybrid', 'Làm việc từ xa mang lại sự linh hoạt nhưng cũng dễ xóa nhòa ranh giới giữa công việc và đời sống. Những thói quen sau giúp bạn vừa hiệu quả vừa thoải mái.', 'WORKPLACE', $md$Làm việc từ xa hoặc theo mô hình hybrid đã trở nên quen thuộc với nhiều người đi làm. Không phải chen chúc giờ cao điểm, có thêm thời gian cho gia đình là những lợi ích rõ ràng. Thế nhưng, khi bàn làm việc chỉ cách giường ngủ vài bước chân, nhiều người lại rơi vào tình trạng làm việc kéo dài, khó tập trung hoặc cảm thấy cô lập. Bí quyết nằm ở việc chủ động thiết lập ranh giới và thói quen phù hợp.

## Tạo ranh giới rõ ràng về không gian và thời gian

Bộ não cần những tín hiệu để biết khi nào là giờ làm và khi nào là giờ nghỉ. Hãy tạo ra các tín hiệu đó một cách có ý thức.

- Chọn một góc làm việc cố định, dù chỉ là một chiếc bàn nhỏ, và tránh làm việc trên giường.
- Đặt giờ bắt đầu và kết thúc cụ thể, chia sẻ khung giờ này với nhóm để mọi người cùng tôn trọng.
- Tạo một nghi thức nhỏ khi bắt đầu và kết thúc ngày, chẳng hạn pha một tách trà, đi bộ quanh nhà hoặc thay quần áo.
- Tắt thông báo công việc trên điện thoại sau giờ làm, trừ khi bạn đang trong ca trực.

## Giữ năng suất mà không làm việc quá sức

Làm việc tại nhà dễ khiến bạn cảm thấy phải luôn chứng minh mình đang bận. Thực tế, năng suất đến từ việc sắp xếp hợp lý chứ không phải ngồi trước màn hình lâu hơn.

1. Đầu ngày, chọn ra **ba việc quan trọng nhất** cần hoàn thành.
2. Chia thời gian thành các khối tập trung, mỗi khối khoảng năm mươi phút, xen kẽ nghỉ ngắn.
3. Gom các cuộc họp vào một khung giờ để giữ lại những khoảng thời gian liền mạch cho việc cần suy nghĩ sâu.
4. Cuối ngày, ghi lại những gì đã làm và việc cần tiếp tục, để sáng hôm sau bắt nhịp nhanh hơn.

Đừng quên vận động. Đứng dậy giãn cơ, uống nước và nhìn ra xa vài phút sau mỗi giờ làm việc giúp bạn đỡ mỏi mắt và giữ được sự tỉnh táo.

## Giao tiếp chủ động khi không ngồi cùng văn phòng

Khi làm việc từ xa, đồng nghiệp không thể nhìn thấy bạn đang làm gì, vì vậy sự minh bạch càng quan trọng. Hãy cập nhật tiến độ ngắn gọn ở kênh chung của nhóm và phản hồi tin nhắn trong khoảng thời gian hợp lý.

Với những vấn đề phức tạp hoặc dễ gây hiểu lầm, một cuộc gọi ngắn thường hiệu quả hơn chuỗi tin nhắn dài. Khi nhắn tin, hãy viết đủ ngữ cảnh để người nhận không phải hỏi lại nhiều lần.

Nếu làm việc theo mô hình hybrid, hãy tận dụng những ngày lên văn phòng cho các hoạt động cần tương tác trực tiếp như thảo luận ý tưởng, họp kế hoạch hay gặp gỡ đồng nghiệp mới. Những ngày ở nhà nên dành cho công việc cần sự tập trung cao.

## Chăm sóc sức khỏe tinh thần

Cảm giác cô lập là thách thức lớn của làm việc từ xa. Hãy chủ động duy trì kết nối, ví dụ trò chuyện vài phút đầu cuộc họp, tham gia các buổi giao lưu trực tuyến của nhóm hoặc thỉnh thoảng hẹn đồng nghiệp đi ăn trưa.

Hãy để ý những dấu hiệu quá tải như khó ngủ, dễ cáu gắt hay mất hứng thú với công việc. Khi nhận thấy chúng, đừng ngần ngại trao đổi thẳng thắn với quản lý về khối lượng công việc và **nghỉ ngơi thực sự** vào cuối tuần.

## Lời kết

Sự linh hoạt chỉ là món quà khi bạn biết cách quản lý nó. Bằng cách đặt ranh giới rõ ràng, sắp xếp công việc khoa học và giữ kết nối với mọi người, bạn có thể vừa làm việc hiệu quả vừa có thời gian cho bản thân và gia đình.$md$,
   now() - interval '44 days', 89)
) as a (slug, title, excerpt, category, content, published_at, views)
on conflict (slug) do update set title = excluded.title, excerpt = excluded.excerpt, category = excluded.category,
  content = excluded.content, updated_at = now();
commit;
