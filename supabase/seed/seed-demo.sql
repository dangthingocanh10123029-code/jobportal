-- Ticket 18: demo data — 40 fictional companies, ~300 postings, 30 candidates, ~200 applications.
-- Every name, description and address is invented for this demo; nothing is copied from real job sites.
-- Run as postgres: psql "$DATABASE_URL" -f supabase/seed/seed-demo.sql   (see README.md)
-- Idempotent: wipes the previous demo set first; setseed + md5-derived ids give the same data on every run,
-- with dates relative to now(). Picks among stored rows order by hashtext(id), not random(): heap order changes
-- after a wipe, and random() per scanned row would follow it.
\set ON_ERROR_STOP 1
\ir wipe-demo.sql

begin;
select setseed(0.18);

-- v4-shaped uuid derived from a text key, so ids stay stable across re-runs.
create function pg_temp.demo_uuid(seed text) returns uuid language sql immutable as
$$ select overlay(overlay(md5(seed) placing '4' from 13) placing '8' from 17)::uuid $$;
create function pg_temp.pick(arr text[]) returns text language sql volatile as
$$ select arr[1 + floor(random() * cardinality(arr))::int] $$;
create function pg_temp.pick_n(arr text[], n int) returns text[] language sql volatile as
$$ select array(select x from unnest(arr) x order by random() limit n) $$;
create function pg_temp.bullets(lines text[]) returns text language sql immutable as
$$ select array_to_string(array(select '- ' || l from unnest(lines) l), E'\n') $$;
-- Notifications come from triggers with created_at = now(); move the one just created to its story time.
create function pg_temp.stamp_notification(recipient uuid, ts timestamptz) returns void language sql volatile as $$
  update public.notifications
  set created_at = ts,
      read_at = case when ts < now() - interval '3 days' or (ts < now() - interval '12 hours' and random() < 0.5)
                     then ts + interval '3 hours' end
  where recipient_id = recipient and created_at = now()
$$;

create temp table demo_industry (code text primary key, factor numeric, manager text, degree text, duties text[], reqs text[]) on commit drop;
insert into demo_industry values
('IT_SOFTWARE', 1.35, 'Trưởng phòng Kỹ thuật Phần mềm', 'Kỹ sư Công nghệ thông tin',
 array['Phân tích yêu cầu và thiết kế giải pháp kỹ thuật cùng nhóm sản phẩm',
       'Viết mã sạch, có kiểm thử tự động và tham gia review code chéo',
       'Tối ưu hiệu năng, theo dõi và xử lý sự cố trên môi trường production',
       'Viết tài liệu kỹ thuật và chia sẻ kiến thức trong nhóm',
       'Phối hợp với QA và DevOps để phát hành sản phẩm theo từng sprint',
       'Nghiên cứu, đề xuất công nghệ mới phù hợp với bài toán của công ty'],
 array['Tốt nghiệp chuyên ngành Công nghệ thông tin, Khoa học máy tính hoặc tương đương',
       'Nắm vững cấu trúc dữ liệu, giải thuật và lập trình hướng đối tượng',
       'Có kinh nghiệm làm việc với cơ sở dữ liệu quan hệ và RESTful API',
       'Đọc hiểu tài liệu tiếng Anh chuyên ngành',
       'Quen thuộc với quy trình Agile/Scrum là lợi thế']),
('SALES', 1.0, 'Trưởng phòng Kinh doanh', 'Cử nhân Quản trị Kinh doanh',
 array['Tìm kiếm, tiếp cận và phát triển khách hàng mới trong khu vực được phân công',
       'Tư vấn sản phẩm, báo giá và đàm phán hợp đồng với khách hàng',
       'Chăm sóc khách hàng hiện có, khai thác nhu cầu mua lại',
       'Theo dõi công nợ và phối hợp với bộ phận giao hàng',
       'Báo cáo doanh số hằng tuần, đề xuất giải pháp tăng trưởng',
       'Tham gia hội chợ, sự kiện để quảng bá thương hiệu'],
 array['Tốt nghiệp Cao đẳng trở lên khối ngành Kinh tế, Quản trị kinh doanh',
       'Giao tiếp tốt, chủ động và chịu được áp lực doanh số',
       'Có phương tiện đi lại và sẵn sàng đi công tác ngắn ngày',
       'Sử dụng thành thạo tin học văn phòng',
       'Ưu tiên ứng viên đã có tệp khách hàng trong ngành']),
('MARKETING', 1.05, 'Trưởng phòng Marketing', 'Cử nhân Marketing',
 array['Xây dựng và triển khai kế hoạch marketing theo từng quý',
       'Quản lý ngân sách quảng cáo, tối ưu chi phí trên mỗi khách hàng tiềm năng',
       'Phối hợp với nhóm thiết kế để sản xuất nội dung hình ảnh, video',
       'Theo dõi số liệu chiến dịch và lập báo cáo hiệu quả',
       'Nghiên cứu đối thủ, xu hướng tiêu dùng để đề xuất ý tưởng mới',
       'Làm việc với đối tác truyền thông, nhà sáng tạo nội dung và agency'],
 array['Tốt nghiệp chuyên ngành Marketing, Truyền thông hoặc liên quan',
       'Tư duy sáng tạo, nhạy bén với xu hướng mạng xã hội',
       'Có khả năng đọc hiểu số liệu và lập báo cáo',
       'Kỹ năng viết tốt, trình bày mạch lạc',
       'Đã từng chạy chiến dịch có ngân sách thực tế là lợi thế']),
('ACCOUNTING_FINANCE', 1.1, 'Kế toán trưởng', 'Cử nhân Kế toán – Kiểm toán',
 array['Hạch toán chứng từ, kiểm tra tính hợp lệ của hóa đơn đầu vào, đầu ra',
       'Lập báo cáo thuế tháng, quý và quyết toán năm',
       'Theo dõi công nợ phải thu, phải trả và đối chiếu định kỳ',
       'Lập báo cáo quản trị phục vụ ban giám đốc',
       'Phối hợp với kiểm toán độc lập trong kỳ kiểm toán',
       'Lưu trữ hồ sơ, chứng từ kế toán theo quy định'],
 array['Tốt nghiệp chuyên ngành Kế toán, Kiểm toán, Tài chính',
       'Nắm vững chuẩn mực kế toán Việt Nam và luật thuế hiện hành',
       'Thành thạo Excel và ít nhất một phần mềm kế toán',
       'Cẩn thận, trung thực, có trách nhiệm với số liệu',
       'Có chứng chỉ ACCA hoặc CPA là lợi thế']),
('HR', 1.0, 'Trưởng phòng Nhân sự', 'Cử nhân Quản trị Nhân lực',
 array['Xây dựng kế hoạch tuyển dụng theo nhu cầu của các phòng ban',
       'Sàng lọc hồ sơ, sắp xếp lịch và tham gia phỏng vấn ứng viên',
       'Tính lương, bảo hiểm và các chế độ phúc lợi cho nhân viên',
       'Tổ chức chương trình hội nhập cho nhân viên mới',
       'Triển khai các hoạt động gắn kết, văn hóa doanh nghiệp',
       'Cập nhật quy chế nội bộ theo quy định pháp luật lao động'],
 array['Tốt nghiệp chuyên ngành Quản trị nhân lực, Luật hoặc Kinh tế',
       'Hiểu biết về Bộ luật Lao động và chính sách bảo hiểm',
       'Kỹ năng giao tiếp, lắng nghe và giữ bí mật thông tin',
       'Thành thạo tin học văn phòng',
       'Từng làm việc trong môi trường trên 200 nhân sự là lợi thế']),
('ADMIN', 0.85, 'Trưởng phòng Hành chính', 'Cử nhân Quản trị Văn phòng',
 array['Tiếp nhận, phân loại và lưu trữ công văn, hồ sơ',
       'Quản lý văn phòng phẩm, trang thiết bị và tài sản văn phòng',
       'Đặt phòng họp, sắp xếp lịch công tác cho ban lãnh đạo',
       'Soạn thảo văn bản, biên bản cuộc họp',
       'Hỗ trợ tổ chức sự kiện nội bộ',
       'Phối hợp với nhà cung cấp dịch vụ tòa nhà'],
 array['Tốt nghiệp Trung cấp trở lên',
       'Thành thạo Word, Excel, Google Workspace',
       'Giao tiếp lịch sự, tác phong chuyên nghiệp',
       'Cẩn thận, ngăn nắp, có tinh thần hỗ trợ đồng nghiệp',
       'Biết tiếng Anh giao tiếp là lợi thế']),
('CUSTOMER_SERVICE', 0.8, 'Quản lý Trung tâm Chăm sóc Khách hàng', 'Cử nhân Quản trị Dịch vụ',
 array['Tiếp nhận và giải đáp thắc mắc của khách hàng qua điện thoại, email, chat',
       'Xử lý khiếu nại, phối hợp với các bộ phận để giải quyết triệt để',
       'Ghi nhận thông tin khách hàng đầy đủ trên hệ thống CRM',
       'Gọi điện khảo sát mức độ hài lòng sau khi sử dụng dịch vụ',
       'Đề xuất cải tiến quy trình phục vụ dựa trên phản hồi thực tế',
       'Hướng dẫn khách hàng sử dụng sản phẩm qua từng bước'],
 array['Tốt nghiệp Trung cấp trở lên, không yêu cầu chuyên ngành',
       'Giọng nói rõ ràng, dễ nghe',
       'Kiên nhẫn, khéo léo khi xử lý tình huống',
       'Sẵn sàng làm việc theo ca, kể cả cuối tuần',
       'Sử dụng máy tính thành thạo']),
('EDUCATION', 0.85, 'Trưởng phòng Đào tạo', 'Cử nhân Sư phạm',
 array['Giảng dạy theo giáo trình và kế hoạch đào tạo của trung tâm',
       'Soạn bài giảng, đề kiểm tra và tài liệu bổ trợ',
       'Theo dõi tiến độ học tập, phản hồi định kỳ cho học viên và phụ huynh',
       'Tham gia các buổi sinh hoạt chuyên môn, dự giờ',
       'Tổ chức hoạt động ngoại khóa cho học viên',
       'Đóng góp ý kiến cải tiến chương trình học'],
 array['Tốt nghiệp Sư phạm hoặc chuyên ngành liên quan',
       'Có chứng chỉ nghiệp vụ sư phạm là lợi thế',
       'Yêu trẻ, kiên nhẫn và có trách nhiệm',
       'Phát âm chuẩn, trình bày dễ hiểu',
       'Có thể dạy buổi tối và cuối tuần']),
('HEALTHCARE', 1.0, 'Điều dưỡng trưởng', 'Cử nhân Điều dưỡng',
 array['Thực hiện công việc chuyên môn theo đúng quy trình của phòng khám',
       'Tiếp đón, hướng dẫn và tư vấn cho người bệnh',
       'Ghi chép hồ sơ, sổ sách chuyên môn đầy đủ',
       'Kiểm tra, bảo quản thiết bị và vật tư y tế',
       'Tham gia trực theo lịch phân công',
       'Cập nhật kiến thức chuyên môn qua các khóa đào tạo nội bộ'],
 array['Tốt nghiệp chuyên ngành Y, Dược hoặc Điều dưỡng phù hợp vị trí',
       'Có chứng chỉ hành nghề còn hiệu lực với vị trí yêu cầu',
       'Tận tâm, cẩn thận, có đạo đức nghề nghiệp',
       'Sức khỏe tốt, có thể làm việc theo ca',
       'Ưu tiên ứng viên từng làm tại phòng khám tư nhân']),
('CONSTRUCTION', 1.05, 'Chỉ huy trưởng Công trình', 'Kỹ sư Xây dựng Dân dụng và Công nghiệp',
 array['Giám sát thi công, kiểm tra chất lượng và khối lượng tại công trường',
       'Lập biện pháp thi công và tiến độ chi tiết',
       'Bóc tách khối lượng, lập hồ sơ nghiệm thu thanh toán',
       'Phối hợp với tư vấn giám sát và chủ đầu tư',
       'Đảm bảo an toàn lao động và vệ sinh môi trường công trường',
       'Báo cáo tiến độ hằng tuần cho ban chỉ huy'],
 array['Tốt nghiệp Đại học chuyên ngành Xây dựng, Cơ điện hoặc tương đương',
       'Sử dụng thành thạo AutoCAD và các phần mềm chuyên ngành',
       'Có thể đi công trình tỉnh theo dự án',
       'Hiểu biết về tiêu chuẩn, quy chuẩn xây dựng hiện hành',
       'Có chứng chỉ hành nghề là lợi thế']),
('MANUFACTURING', 0.95, 'Quản đốc Nhà máy', 'Kỹ sư Cơ khí',
 array['Theo dõi dây chuyền sản xuất, đảm bảo đúng kế hoạch và chất lượng',
       'Phân tích nguyên nhân lỗi và đề xuất hành động khắc phục',
       'Thực hiện bảo trì định kỳ, xử lý sự cố máy móc',
       'Hướng dẫn công nhân vận hành đúng quy trình an toàn',
       'Ghi chép số liệu sản xuất và lập báo cáo ca',
       'Tham gia các dự án cải tiến năng suất'],
 array['Tốt nghiệp Cao đẳng trở lên khối kỹ thuật',
       'Hiểu biết về hệ thống quản lý chất lượng ISO',
       'Chịu được áp lực và sẵn sàng làm việc theo ca',
       'Có kinh nghiệm trong nhà máy FDI là lợi thế',
       'Tiếng Anh hoặc tiếng Nhật cơ bản là lợi thế']),
('LOGISTICS', 0.95, 'Trưởng phòng Logistics', 'Cử nhân Logistics và Quản lý Chuỗi cung ứng',
 array['Lập và kiểm tra bộ chứng từ xuất nhập khẩu',
       'Làm việc với hãng tàu, đại lý và cơ quan hải quan',
       'Điều phối lịch giao nhận, tối ưu chi phí vận chuyển',
       'Quản lý nhập xuất tồn kho và kiểm kê định kỳ',
       'Theo dõi đơn hàng, cập nhật tình trạng cho khách hàng',
       'Đánh giá nhà cung cấp dịch vụ vận tải định kỳ'],
 array['Tốt nghiệp chuyên ngành Logistics, Ngoại thương hoặc Kinh tế',
       'Nắm vững nghiệp vụ giao nhận và quy trình hải quan',
       'Tiếng Anh đọc hiểu chứng từ',
       'Cẩn thận, kỹ năng sắp xếp công việc tốt',
       'Thành thạo Excel']),
('HOSPITALITY', 0.8, 'Quản lý Nhà hàng', 'Cử nhân Quản trị Khách sạn',
 array['Đón tiếp, phục vụ khách theo tiêu chuẩn dịch vụ của đơn vị',
       'Xử lý đặt phòng, đặt bàn và các yêu cầu đặc biệt của khách',
       'Đảm bảo vệ sinh an toàn thực phẩm và khu vực làm việc',
       'Phối hợp với các bộ phận buồng phòng, bếp, bảo vệ',
       'Ghi nhận phản hồi của khách và báo cáo quản lý ca',
       'Giới thiệu dịch vụ, chương trình ưu đãi tới khách'],
 array['Tốt nghiệp Trung cấp trở lên chuyên ngành Du lịch, Nhà hàng – Khách sạn',
       'Tiếng Anh giao tiếp tốt với vị trí tiếp xúc khách quốc tế',
       'Thân thiện, nhanh nhẹn, tác phong chuyên nghiệp',
       'Có thể làm việc theo ca, ngày lễ, Tết',
       'Có chứng nhận an toàn thực phẩm là lợi thế']),
('DESIGN', 1.0, 'Giám đốc Sáng tạo', 'Cử nhân Thiết kế Đồ họa',
 array['Thiết kế ấn phẩm, giao diện theo yêu cầu của dự án',
       'Trao đổi với khách hàng hoặc nhóm sản phẩm để làm rõ brief',
       'Xây dựng và duy trì bộ nhận diện, thư viện thành phần thiết kế',
       'Chỉnh sửa sản phẩm theo phản hồi, đảm bảo đúng tiến độ',
       'Cập nhật xu hướng thiết kế và công cụ mới',
       'Phối hợp với lập trình viên hoặc đội thi công để sản phẩm đúng thiết kế'],
 array['Tốt nghiệp chuyên ngành Thiết kế, Mỹ thuật ứng dụng hoặc Kiến trúc',
       'Có portfolio thể hiện các dự án đã thực hiện',
       'Thẩm mỹ tốt, chú ý đến chi tiết',
       'Thành thạo các công cụ thiết kế phù hợp vị trí',
       'Biết làm motion cơ bản là lợi thế']),
('LEGAL', 1.15, 'Trưởng phòng Pháp chế', 'Cử nhân Luật',
 array['Soạn thảo, rà soát hợp đồng và văn bản pháp lý của công ty',
       'Tư vấn cho các phòng ban về rủi ro pháp lý trong hoạt động kinh doanh',
       'Theo dõi, cập nhật thay đổi của pháp luật liên quan',
       'Làm việc với cơ quan nhà nước về thủ tục giấy phép',
       'Tham gia đàm phán, giải quyết tranh chấp',
       'Xây dựng quy chế, quy trình nội bộ'],
 array['Tốt nghiệp Cử nhân Luật',
       'Có thẻ luật sư là lợi thế với vị trí cấp cao',
       'Tư duy logic, cẩn trọng trong câu chữ',
       'Tiếng Anh đọc hiểu hợp đồng',
       'Bảo mật thông tin tuyệt đối']),
('OTHER', 0.9, 'Quản lý Vận hành', 'Cử nhân Kinh tế',
 array['Thực hiện các đầu việc vận hành hằng ngày theo quy trình',
       'Phối hợp với các phòng ban để đảm bảo công việc thông suốt',
       'Tổng hợp số liệu và lập báo cáo định kỳ',
       'Hỗ trợ quản lý theo dõi tiến độ dự án',
       'Đề xuất cải tiến giúp tiết kiệm thời gian, chi phí',
       'Tham gia đào tạo nội bộ theo định hướng phát triển'],
 array['Tốt nghiệp Cao đẳng trở lên',
       'Chủ động, ham học hỏi và có trách nhiệm',
       'Kỹ năng giao tiếp và làm việc nhóm tốt',
       'Sử dụng thành thạo tin học văn phòng',
       'Có kinh nghiệm ở vị trí tương đương là lợi thế']);

create temp table demo_role (industry text, title text, skills text[]) on commit drop;
insert into demo_role values
('IT_SOFTWARE', 'Lập trình viên Backend Java', array['Java', 'Spring Boot', 'PostgreSQL', 'RESTful API', 'Docker', 'Redis', 'Microservices']),
('IT_SOFTWARE', 'Lập trình viên Frontend ReactJS', array['ReactJS', 'TypeScript', 'Next.js', 'HTML/CSS', 'Redux', 'Jest']),
('IT_SOFTWARE', 'Lập trình viên Mobile Flutter', array['Flutter', 'Dart', 'Firebase', 'RESTful API', 'Git', 'Android']),
('IT_SOFTWARE', 'Kỹ sư DevOps', array['Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Linux']),
('IT_SOFTWARE', 'Kỹ sư Kiểm thử phần mềm', array['Kiểm thử thủ công', 'Selenium', 'Postman', 'SQL', 'Jira', 'Cypress']),
('IT_SOFTWARE', 'Kỹ sư Dữ liệu', array['Python', 'SQL', 'Apache Spark', 'Airflow', 'ETL', 'BigQuery']),
('SALES', 'Nhân viên Kinh doanh B2B', array['Tư vấn bán hàng', 'Đàm phán', 'CRM', 'Chăm sóc khách hàng', 'Lập kế hoạch bán hàng']),
('SALES', 'Nhân viên Kinh doanh Bất động sản', array['Tư vấn bán hàng', 'Đàm phán', 'Thuyết trình', 'Mạng lưới khách hàng', 'Pháp lý bất động sản']),
('SALES', 'Chuyên viên Phát triển Thị trường', array['Nghiên cứu thị trường', 'Phát triển đại lý', 'Đàm phán', 'Excel', 'Lập kế hoạch bán hàng']),
('SALES', 'Nhân viên Kinh doanh Giải pháp Phần mềm', array['Tư vấn giải pháp', 'Thuyết trình', 'CRM', 'Đàm phán', 'Tiếng Anh giao tiếp']),
('MARKETING', 'Chuyên viên Digital Marketing', array['Facebook Ads', 'Google Ads', 'SEO', 'Google Analytics', 'Content Marketing']),
('MARKETING', 'Chuyên viên Content Marketing', array['Viết nội dung', 'SEO', 'Lên kế hoạch nội dung', 'Canva', 'Social media']),
('MARKETING', 'Chuyên viên Thương hiệu', array['Quản trị thương hiệu', 'Nghiên cứu thị trường', 'Tổ chức sự kiện', 'PR', 'Lập ngân sách']),
('MARKETING', 'Chuyên viên Performance Marketing', array['Google Ads', 'TikTok Ads', 'Phân tích dữ liệu', 'Excel', 'A/B testing']),
('ACCOUNTING_FINANCE', 'Kế toán Tổng hợp', array['Kế toán tổng hợp', 'MISA', 'Excel', 'Báo cáo tài chính', 'Thuế GTGT']),
('ACCOUNTING_FINANCE', 'Kế toán Thuế', array['Thuế TNDN', 'Thuế GTGT', 'Quyết toán thuế', 'MISA', 'Hóa đơn điện tử']),
('ACCOUNTING_FINANCE', 'Chuyên viên Phân tích Tài chính', array['Phân tích tài chính', 'Excel nâng cao', 'Lập ngân sách', 'Power BI', 'Mô hình tài chính']),
('ACCOUNTING_FINANCE', 'Kế toán Công nợ', array['Đối chiếu công nợ', 'Excel', 'MISA', 'Thanh toán', 'Hóa đơn điện tử']),
('HR', 'Chuyên viên Tuyển dụng', array['Tuyển dụng', 'Phỏng vấn', 'Employer branding', 'LinkedIn', 'Excel']),
('HR', 'Chuyên viên Lương và Phúc lợi', array['Tính lương', 'Bảo hiểm xã hội', 'Luật lao động', 'Excel', 'Thuế TNCN']),
('HR', 'Chuyên viên Đào tạo và Phát triển', array['Đào tạo nội bộ', 'Xây dựng khung năng lực', 'Thuyết trình', 'Đánh giá hiệu suất']),
('HR', 'Nhân viên Hành chính Nhân sự', array['Hồ sơ nhân sự', 'Chấm công', 'Luật lao động', 'Tin học văn phòng']),
('ADMIN', 'Nhân viên Hành chính Văn phòng', array['Tin học văn phòng', 'Quản lý văn thư', 'Mua sắm văn phòng phẩm', 'Giao tiếp']),
('ADMIN', 'Lễ tân Văn phòng', array['Tiếp khách', 'Tiếng Anh giao tiếp', 'Tổng đài', 'Tin học văn phòng']),
('ADMIN', 'Thư ký Giám đốc', array['Quản lý lịch', 'Soạn thảo văn bản', 'Tiếng Anh', 'Biên bản cuộc họp']),
('ADMIN', 'Nhân viên Nhập liệu', array['Nhập liệu', 'Excel', 'Đánh máy nhanh', 'Cẩn thận']),
('CUSTOMER_SERVICE', 'Nhân viên Chăm sóc Khách hàng', array['Chăm sóc khách hàng', 'Xử lý khiếu nại', 'CRM', 'Giao tiếp qua điện thoại']),
('CUSTOMER_SERVICE', 'Nhân viên Telesales', array['Telesales', 'Tư vấn bán hàng', 'Giao tiếp qua điện thoại', 'CRM']),
('CUSTOMER_SERVICE', 'Chuyên viên Hỗ trợ Kỹ thuật', array['Hỗ trợ kỹ thuật', 'Ticketing', 'Tiếng Anh', 'Xử lý sự cố']),
('CUSTOMER_SERVICE', 'Nhân viên Tổng đài', array['Tổng đài', 'Giao tiếp qua điện thoại', 'Nhập liệu', 'Xử lý khiếu nại']),
('EDUCATION', 'Giáo viên Tiếng Anh', array['IELTS', 'Tiếng Anh', 'Phương pháp giảng dạy', 'Thiết kế bài giảng']),
('EDUCATION', 'Giáo viên Toán THCS', array['Toán học', 'Phương pháp giảng dạy', 'Quản lý lớp học', 'Soạn giáo án']),
('EDUCATION', 'Tư vấn Tuyển sinh', array['Tư vấn tuyển sinh', 'Telesales', 'Chăm sóc phụ huynh', 'CRM']),
('EDUCATION', 'Chuyên viên Thiết kế Chương trình', array['Thiết kế chương trình', 'E-learning', 'Biên soạn tài liệu', 'Đánh giá đầu ra']),
('HEALTHCARE', 'Điều dưỡng Đa khoa', array['Chăm sóc người bệnh', 'Tiêm truyền', 'Hồ sơ bệnh án', 'Sơ cấp cứu']),
('HEALTHCARE', 'Dược sĩ Nhà thuốc', array['Tư vấn thuốc', 'Quản lý kho thuốc', 'GPP', 'Chăm sóc khách hàng']),
('HEALTHCARE', 'Kỹ thuật viên Xét nghiệm', array['Xét nghiệm huyết học', 'Sinh hóa', 'Vận hành máy xét nghiệm', 'An toàn sinh học']),
('HEALTHCARE', 'Bác sĩ Đa khoa', array['Khám bệnh', 'Chẩn đoán', 'Kê đơn', 'Tư vấn sức khỏe']),
('CONSTRUCTION', 'Kỹ sư Giám sát Thi công', array['AutoCAD', 'Giám sát thi công', 'Dự toán', 'Đọc bản vẽ', 'An toàn lao động']),
('CONSTRUCTION', 'Kỹ sư Kết cấu', array['ETABS', 'SAP2000', 'Revit', 'Tính toán kết cấu', 'AutoCAD']),
('CONSTRUCTION', 'Kỹ sư Dự toán', array['Dự toán', 'Bóc khối lượng', 'Excel', 'Phần mềm dự toán', 'Hồ sơ thanh toán']),
('CONSTRUCTION', 'Kỹ sư Cơ điện', array['Hệ thống điện', 'Cấp thoát nước', 'HVAC', 'Revit MEP', 'AutoCAD']),
('MANUFACTURING', 'Kỹ sư Quy trình Sản xuất', array['Lean', 'Kaizen', '5S', 'Cải tiến quy trình', 'AutoCAD']),
('MANUFACTURING', 'Nhân viên Kiểm soát Chất lượng', array['Kiểm soát chất lượng', 'ISO 9001', 'Đo lường', 'Báo cáo 8D']),
('MANUFACTURING', 'Kỹ thuật viên Bảo trì', array['Bảo trì thiết bị', 'Điện công nghiệp', 'PLC', 'Đọc bản vẽ kỹ thuật']),
('MANUFACTURING', 'Trưởng ca Sản xuất', array['Quản lý ca', '5S', 'An toàn lao động', 'Lập kế hoạch sản xuất']),
('LOGISTICS', 'Nhân viên Xuất nhập khẩu', array['Thủ tục hải quan', 'Incoterms', 'Chứng từ xuất nhập khẩu', 'ECUS', 'Tiếng Anh']),
('LOGISTICS', 'Nhân viên Điều phối Vận tải', array['Điều phối xe', 'Lập lộ trình', 'Excel', 'Giao tiếp']),
('LOGISTICS', 'Thủ kho', array['Quản lý kho', 'WMS', 'Kiểm kê', 'Excel', '5S']),
('LOGISTICS', 'Chuyên viên Mua hàng', array['Mua hàng', 'Đàm phán', 'Quản lý nhà cung cấp', 'ERP', 'Excel']),
('HOSPITALITY', 'Lễ tân Khách sạn', array['Tiếp đón khách', 'Tiếng Anh giao tiếp', 'Phần mềm quản lý khách sạn', 'Xử lý đặt phòng']),
('HOSPITALITY', 'Nhân viên Phục vụ Nhà hàng', array['Phục vụ bàn', 'Giao tiếp', 'Kiến thức đồ uống', 'Làm việc theo ca']),
('HOSPITALITY', 'Đầu bếp', array['Nấu ăn', 'An toàn thực phẩm', 'Món Á', 'Món Âu', 'Định lượng món']),
('HOSPITALITY', 'Hướng dẫn viên Du lịch', array['Hướng dẫn du lịch', 'Tiếng Anh', 'Thuyết trình', 'Lịch sử – văn hóa']),
('DESIGN', 'Nhà thiết kế Đồ họa', array['Photoshop', 'Illustrator', 'Figma', 'Thiết kế nhận diện', 'Typography']),
('DESIGN', 'Nhà thiết kế UI/UX', array['Figma', 'UI Design', 'UX Research', 'Prototype', 'Design System']),
('DESIGN', 'Chuyên viên Dựng video', array['Premiere Pro', 'After Effects', 'Quay phim', 'Kịch bản video', 'CapCut']),
('DESIGN', 'Kiến trúc sư Nội thất', array['AutoCAD', 'SketchUp', '3ds Max', 'Thiết kế nội thất', 'Bóc khối lượng']),
('LEGAL', 'Chuyên viên Pháp chế', array['Soạn thảo hợp đồng', 'Luật doanh nghiệp', 'Tư vấn pháp lý', 'Tiếng Anh pháp lý']),
('LEGAL', 'Luật sư Tư vấn', array['Tư vấn pháp lý', 'Tranh tụng', 'Luật dân sự', 'Đàm phán']),
('LEGAL', 'Chuyên viên Tuân thủ', array['Tuân thủ', 'Quản trị rủi ro', 'Phòng chống rửa tiền', 'Kiểm soát nội bộ']),
('LEGAL', 'Thư ký Pháp lý', array['Soạn thảo văn bản', 'Lưu trữ hồ sơ', 'Thủ tục hành chính', 'Tin học văn phòng']),
('OTHER', 'Nhân viên Vận hành', array['Quản lý vận hành', 'Excel', 'Báo cáo', 'Phối hợp liên phòng ban']),
('OTHER', 'Trợ lý Dự án', array['Quản lý dự án', 'Excel', 'Lập kế hoạch', 'Báo cáo']),
('OTHER', 'Kỹ sư Nông nghiệp', array['Trồng trọt', 'Bảo vệ thực vật', 'Tư vấn kỹ thuật', 'Khảo sát hiện trường']),
('OTHER', 'Phiên dịch viên Tiếng Nhật', array['Tiếng Nhật N2', 'Biên dịch', 'Phiên dịch', 'Văn hóa Nhật Bản']);

create temp table demo_company (n int primary key, slug text, name text, industry text, city text, size text, address text, tagline text, id uuid) on commit drop;
insert into demo_company (n, slug, name, industry, city, size, address, tagline) values
(1, 'maybac-tech', 'Công ty Cổ phần Công nghệ Mây Bạc', 'IT_SOFTWARE', 'Hà Nội', 'S201_500', 'Tầng 9, tòa Hoa Sen, 25 Trần Thái Tông, Cầu Giấy, Hà Nội', 'xây dựng nền tảng quản lý bán lẻ dạng SaaS cho chuỗi cửa hàng vừa và nhỏ'),
(2, 'cauvongso', 'Công ty TNHH Phần mềm Cầu Vồng Số', 'IT_SOFTWARE', 'TP. Hồ Chí Minh', 'S51_200', 'Lầu 6, 120 Nguyễn Thị Minh Khai, Quận 3, TP. Hồ Chí Minh', 'phát triển phần mềm theo đơn đặt hàng cho khách hàng tại Nhật Bản và Úc'),
(3, 'luclam-data', 'Công ty Cổ phần Dữ liệu Lục Lam', 'IT_SOFTWARE', 'Đà Nẵng', 'S11_50', 'Số 48 Bạch Đằng, Hải Châu, Đà Nẵng', 'cung cấp giải pháp phân tích dữ liệu cho doanh nghiệp bán lẻ và du lịch'),
(4, 'chimse-apps', 'Công ty TNHH Ứng dụng Di động Chim Sẻ', 'IT_SOFTWARE', 'TP. Hồ Chí Minh', 'S11_50', 'Số 15 Đường số 7, KDC Trung Sơn, Bình Chánh, TP. Hồ Chí Minh', 'phát triển ứng dụng di động về sức khỏe và luyện tập thể thao'),
(5, 'hatde-pay', 'Công ty Cổ phần Thanh toán Hạt Dẻ', 'IT_SOFTWARE', 'TP. Hồ Chí Minh', 'S51_200', 'Tầng 12, 39 Lê Duẩn, Quận 1, TP. Hồ Chí Minh', 'mang giải pháp thanh toán không tiền mặt đến hộ kinh doanh cá thể'),
(6, 'doithong-erp', 'Công ty TNHH Giải pháp Phần mềm Đồi Thông', 'IT_SOFTWARE', 'Hà Nội', 'S500_PLUS', 'Lô CX-04, Khu công nghệ cao Hòa Lạc, Thạch Thất, Hà Nội', 'phát triển hệ thống ERP cho doanh nghiệp sản xuất trong nước'),
(7, 'trucxanh-dist', 'Công ty Cổ phần Phân phối Trúc Xanh Miền Nam', 'SALES', 'TP. Hồ Chí Minh', 'S201_500', 'Số 210 Kinh Dương Vương, Bình Tân, TP. Hồ Chí Minh', 'phân phối hàng tiêu dùng nhanh tới hơn 8.000 điểm bán khu vực phía Nam'),
(8, 'ngoclan-office', 'Công ty TNHH Thiết bị Văn phòng Ngọc Lan', 'SALES', 'Hà Nội', 'S51_200', 'Số 77 Tây Sơn, Đống Đa, Hà Nội', 'cung cấp thiết bị văn phòng và dịch vụ in ấn trọn gói cho doanh nghiệp'),
(9, 'baiboi-land', 'Công ty Cổ phần Địa ốc Bãi Bồi', 'SALES', 'Bình Dương', 'S51_200', 'Số 9 Đại lộ Bình Dương, Thủ Dầu Một, Bình Dương', 'phát triển và phân phối các dự án nhà ở vừa túi tiền cho người lao động'),
(10, 'gionom-media', 'Công ty TNHH Truyền thông Gió Nồm', 'MARKETING', 'TP. Hồ Chí Minh', 'S11_50', 'Số 32 Trần Quang Khải, Quận 1, TP. Hồ Chí Minh', 'là agency truyền thông số chuyên xây dựng thương hiệu cho chuỗi đồ uống'),
(11, 'mattroihong-ads', 'Công ty Cổ phần Quảng cáo Mặt Trời Hồng', 'MARKETING', 'Hà Nội', 'S51_200', 'Số 18 Nguyễn Khánh Toàn, Cầu Giấy, Hà Nội', 'thực hiện quảng cáo ngoài trời và tổ chức sự kiện ra mắt sản phẩm'),
(12, 'minhbach-audit', 'Công ty TNHH Kiểm toán và Tư vấn Thuế Minh Bạch', 'ACCOUNTING_FINANCE', 'Hà Nội', 'S51_200', 'Tầng 4, 102 Láng Hạ, Đống Đa, Hà Nội', 'cung cấp dịch vụ kế toán, kiểm toán và tư vấn thuế cho doanh nghiệp vừa và nhỏ'),
(13, 'phusa-capital', 'Công ty Cổ phần Tư vấn Tài chính Phù Sa', 'ACCOUNTING_FINANCE', 'Cần Thơ', 'S51_200', 'Số 56 Hòa Bình, Ninh Kiều, Cần Thơ', 'tư vấn tài chính và huy động vốn cho doanh nghiệp nông nghiệp vùng Đồng bằng sông Cửu Long'),
(14, 'canhcam-hr', 'Công ty TNHH Nhân lực Cánh Cam', 'HR', 'TP. Hồ Chí Minh', 'S11_50', 'Số 5 Hoàng Diệu, Phú Nhuận, TP. Hồ Chí Minh', 'cung ứng nhân sự và tư vấn tuyển dụng cấp quản lý trung gian'),
(15, 'bantron-office', 'Công ty Cổ phần Dịch vụ Văn phòng Bàn Tròn', 'ADMIN', 'Hà Nội', 'S11_50', 'Số 3 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội', 'vận hành văn phòng chia sẻ và dịch vụ hành chính trọn gói cho công ty khởi nghiệp'),
(16, 'tiengchuong-cx', 'Công ty TNHH Trung tâm Liên lạc Tiếng Chuông', 'CUSTOMER_SERVICE', 'Đà Nẵng', 'S201_500', 'Số 220 Nguyễn Văn Linh, Thanh Khê, Đà Nẵng', 'vận hành tổng đài chăm sóc khách hàng thuê ngoài cho ngân hàng và nhà mạng'),
(17, 'caybang-edu', 'Công ty Cổ phần Giáo dục Cây Bàng', 'EDUCATION', 'Hà Nội', 'S51_200', 'Số 41 Hoàng Quốc Việt, Bắc Từ Liêm, Hà Nội', 'điều hành hệ thống 12 trung tâm tiếng Anh cho thiếu nhi và thiếu niên'),
(18, 'hatmam-school', 'Công ty Cổ phần Giáo dục Hạt Mầm Xanh', 'EDUCATION', 'TP. Hồ Chí Minh', 'S201_500', 'Số 88 Nguyễn Văn Hưởng, Thủ Đức, TP. Hồ Chí Minh', 'xây dựng hệ thống trường liên cấp song ngữ chú trọng giáo dục kỹ năng sống'),
(19, 'cobala-clinic', 'Công ty TNHH Phòng khám Đa khoa Cỏ Ba Lá', 'HEALTHCARE', 'Hải Phòng', 'S51_200', 'Số 14 Lạch Tray, Ngô Quyền, Hải Phòng', 'vận hành phòng khám đa khoa và dịch vụ khám sức khỏe doanh nghiệp'),
(20, 'muoiphuong-pharma', 'Công ty Cổ phần Chuỗi Nhà thuốc Mười Phương', 'HEALTHCARE', 'TP. Hồ Chí Minh', 'S500_PLUS', 'Số 301 Cách Mạng Tháng Tám, Quận 10, TP. Hồ Chí Minh', 'sở hữu hơn 150 nhà thuốc đạt chuẩn GPP trên toàn quốc'),
(21, 'mongda-build', 'Công ty Cổ phần Xây dựng Móng Đá', 'CONSTRUCTION', 'Hà Nội', 'S201_500', 'Số 6 Phạm Hùng, Nam Từ Liêm, Hà Nội', 'thi công nhà xưởng, trường học và công trình dân dụng quy mô vừa'),
(22, 'luoithep-mep', 'Công ty TNHH Cơ điện Lưới Thép', 'CONSTRUCTION', 'Đồng Nai', 'S51_200', 'Số 27 Võ Thị Sáu, Biên Hòa, Đồng Nai', 'thiết kế và thi công hệ thống cơ điện cho nhà máy trong khu công nghiệp'),
(23, 'canhdieu-pack', 'Công ty TNHH Bao bì Cánh Diều', 'MANUFACTURING', 'Bình Dương', 'S500_PLUS', 'Đường số 4, KCN Sóng Thần 2, Dĩ An, Bình Dương', 'sản xuất bao bì giấy và màng phức hợp cho ngành thực phẩm'),
(24, 'domdom-parts', 'Công ty TNHH Linh kiện Chính xác Đom Đóm', 'MANUFACTURING', 'Bắc Ninh', 'S500_PLUS', 'Lô B2, KCN Quế Võ, Bắc Ninh', 'gia công linh kiện cơ khí chính xác cho các nhà máy điện tử'),
(25, 'canhbuom-logistics', 'Công ty Cổ phần Giao vận Cánh Buồm', 'LOGISTICS', 'Hải Phòng', 'S201_500', 'Số 120 Đà Nẵng, Ngô Quyền, Hải Phòng', 'cung cấp dịch vụ giao nhận, khai báo hải quan và vận tải container'),
(26, 'basong-warehouse', 'Công ty TNHH Kho vận Ba Sông', 'LOGISTICS', 'Đồng Nai', 'S51_200', 'KCN Nhơn Trạch 3, Nhơn Trạch, Đồng Nai', 'vận hành kho ngoại quan và trung tâm phân phối hàng tiêu dùng'),
(27, 'haiautrang-hotel', 'Công ty TNHH Khách sạn Hải Âu Trắng', 'HOSPITALITY', 'Đà Nẵng', 'S201_500', 'Số 168 Võ Nguyên Giáp, Sơn Trà, Đà Nẵng', 'quản lý khách sạn bốn sao hướng biển cùng hai nhà hàng hải sản'),
(28, 'bepmenau', 'Công ty TNHH Chuỗi Nhà hàng Bếp Mẹ Nấu', 'HOSPITALITY', 'TP. Hồ Chí Minh', 'S201_500', 'Số 45 Phan Xích Long, Phú Nhuận, TP. Hồ Chí Minh', 'phục vụ cơm nhà kiểu Việt với 20 chi nhánh tại các thành phố lớn'),
(29, 'giayxep-studio', 'Công ty TNHH Thiết kế Giấy Xếp', 'DESIGN', 'Hà Nội', 'S11_50', 'Số 12 ngõ 49 Linh Lang, Ba Đình, Hà Nội', 'thiết kế nhận diện thương hiệu và bao bì cho doanh nghiệp trẻ'),
(30, 'maingoi-interior', 'Công ty TNHH Nội thất Mái Ngói', 'DESIGN', 'TP. Hồ Chí Minh', 'S11_50', 'Số 9 Đường số 2, Thảo Điền, Thủ Đức, TP. Hồ Chí Minh', 'thiết kế và thi công nội thất căn hộ theo phong cách tối giản'),
(31, 'cancan-law', 'Công ty Luật TNHH Cán Cân', 'LEGAL', 'Hà Nội', 'S11_50', 'Số 25 Bà Triệu, Hoàn Kiếm, Hà Nội', 'tư vấn pháp lý doanh nghiệp, sở hữu trí tuệ và giải quyết tranh chấp thương mại'),
(32, 'ngaythang-law', 'Công ty Luật Hợp danh Ngay Thẳng', 'LEGAL', 'TP. Hồ Chí Minh', 'S11_50', 'Số 60 Nam Kỳ Khởi Nghĩa, Quận 3, TP. Hồ Chí Minh', 'đồng hành pháp lý cùng nhà đầu tư trong nước và nước ngoài'),
(33, 'ruongbac-agri', 'Công ty Cổ phần Nông nghiệp Ruộng Bậc', 'OTHER', 'Cần Thơ', 'S201_500', 'Số 3 Trần Hưng Đạo, Ninh Kiều, Cần Thơ', 'canh tác và bao tiêu lúa gạo, trái cây theo chuẩn VietGAP'),
(34, 'hoaanhdao-translate', 'Công ty TNHH Biên phiên dịch Hoa Anh Đào', 'OTHER', 'Hà Nội', 'S11_50', 'Số 15 Kim Mã Thượng, Ba Đình, Hà Nội', 'cung cấp dịch vụ biên phiên dịch tiếng Nhật cho doanh nghiệp và nhà máy'),
(35, 'haidang-ai', 'Công ty Cổ phần Trí tuệ Nhân tạo Hải Đăng', 'IT_SOFTWARE', 'Hà Nội', 'S51_200', 'Tầng 15, 54 Liễu Giai, Ba Đình, Hà Nội', 'nghiên cứu công nghệ xử lý tiếng Việt và trợ lý ảo cho doanh nghiệp'),
(36, 'lachanxanh-sec', 'Công ty TNHH An ninh Mạng Lá Chắn Xanh', 'IT_SOFTWARE', 'TP. Hồ Chí Minh', 'S11_50', 'Số 22 Phổ Quang, Tân Bình, TP. Hồ Chí Minh', 'cung cấp dịch vụ kiểm thử xâm nhập và giám sát an ninh mạng'),
(37, 'nhavui-electronics', 'Công ty TNHH Điện máy Nhà Vui', 'SALES', 'Hải Phòng', 'S201_500', 'Số 200 Tô Hiệu, Lê Chân, Hải Phòng', 'kinh doanh chuỗi cửa hàng điện máy gia dụng khu vực duyên hải Bắc Bộ'),
(38, 'rotre-shop', 'Công ty TNHH Thương mại Điện tử Rổ Tre', 'MARKETING', 'TP. Hồ Chí Minh', 'S51_200', 'Số 71 Hoa Lan, Phú Nhuận, TP. Hồ Chí Minh', 'vận hành sàn thương mại điện tử chuyên đồ thủ công và đặc sản vùng miền'),
(39, 'ongheo-finance', 'Công ty Tài chính Tiêu dùng Ống Heo', 'ACCOUNTING_FINANCE', 'TP. Hồ Chí Minh', 'S500_PLUS', 'Tầng 20, 2 Hải Triều, Quận 1, TP. Hồ Chí Minh', 'cung cấp khoản vay tiêu dùng minh bạch, giải ngân trực tuyến'),
(40, 'dongque-food', 'Công ty Cổ phần Thực phẩm Đồng Quê Ngọt', 'MANUFACTURING', 'Đồng Nai', 'S500_PLUS', 'KCN Amata, Long Bình, Biên Hòa, Đồng Nai', 'chế biến nông sản sấy và nước ép đóng chai xuất khẩu');
update demo_company set id = pg_temp.demo_uuid('demo-employer-' || slug);

create temp table demo_candidate (n int primary key, full_name text, industry text, years int, id uuid, email text) on commit drop;
insert into demo_candidate (n, full_name, industry, years) values
(1, 'Nguyễn Thu Hà', 'IT_SOFTWARE', 3), (2, 'Trần Minh Khoa', 'IT_SOFTWARE', 5), (3, 'Lê Hoàng Nam', 'IT_SOFTWARE', 1),
(4, 'Phạm Ngọc Anh', 'MARKETING', 2), (5, 'Hoàng Đức Thắng', 'SALES', 4), (6, 'Vũ Thị Mai Lan', 'ACCOUNTING_FINANCE', 6),
(7, 'Đặng Quốc Bảo', 'IT_SOFTWARE', 0), (8, 'Bùi Thanh Tâm', 'HR', 3), (9, 'Đỗ Khánh Linh', 'DESIGN', 2),
(10, 'Hồ Gia Huy', 'IT_SOFTWARE', 7), (11, 'Ngô Phương Thảo', 'CUSTOMER_SERVICE', 1), (12, 'Dương Văn Lực', 'CONSTRUCTION', 5),
(13, 'Lý Bảo Ngọc', 'MARKETING', 0), (14, 'Phan Tuấn Kiệt', 'LOGISTICS', 3), (15, 'Võ Thị Hồng Nhung', 'ACCOUNTING_FINANCE', 2),
(16, 'Trịnh Công Danh', 'SALES', 8), (17, 'Mai Anh Thư', 'EDUCATION', 2), (18, 'Đinh Hữu Phước', 'MANUFACTURING', 4),
(19, 'Tạ Minh Châu', 'HEALTHCARE', 3), (20, 'Lâm Quang Vinh', 'IT_SOFTWARE', 2), (21, 'Cao Thị Yến', 'HOSPITALITY', 1),
(22, 'Chu Đức Anh', 'IT_SOFTWARE', 4), (23, 'Hà Thanh Vân', 'HR', 0), (24, 'Kiều Trung Hiếu', 'LOGISTICS', 6),
(25, 'La Thùy Dung', 'LEGAL', 3), (26, 'Quách Nhật Minh', 'SALES', 1), (27, 'Tô Hải Yến', 'CUSTOMER_SERVICE', 2),
(28, 'Lưu Thế Hùng', 'ACCOUNTING_FINANCE', 10), (29, 'Thái Ngọc Diệp', 'MARKETING', 5), (30, 'Âu Khải Hoàn', 'IT_SOFTWARE', 3);
update demo_candidate set id = pg_temp.demo_uuid('demo-candidate-' || n),
  email = replace(public.f_unaccent(full_name), ' ', '.') || '@demo.jobportal.test';

-- Users: same shape as .scratch/job-portal/e2e/seed.sql; handle_new_user / handle_new_employer create profiles and companies.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change, phone_change_token)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('DemoJob!2026', extensions.gen_salt('bf')), u.created_at,
  '{"provider":"email","providers":["email"]}', u.meta, u.created_at, u.created_at, '', '', '', '', '', '', '', ''
from (
  select id, slug || '@demo.jobportal.test' as email, now() - make_interval(days => 60 + n) as created_at,
         jsonb_build_object('role', 'EMPLOYER', 'company_name', name) as meta
  from demo_company
  union all
  select id, email, now() - make_interval(days => 50 + n), jsonb_build_object('role', 'CANDIDATE', 'full_name', full_name)
  from demo_candidate
  union all
  -- Sign-up cannot ask for ADMIN (handle_new_user); promoted below, like supabase/seed/make-admin.sql.
  select pg_temp.demo_uuid('demo-admin'), 'admin@demo.jobportal.test', now() - interval '120 days',
         jsonb_build_object('role', 'CANDIDATE', 'full_name', 'Quản trị viên Demo')
) u;
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select pg_temp.demo_uuid('demo-identity-' || id), id, id::text, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), created_at, created_at, created_at
from auth.users where email like '%@demo.jobportal.test';
update public.profiles p set created_at = u.created_at from auth.users u
where u.id = p.id and u.email like '%@demo.jobportal.test';
update public.profiles set role = 'ADMIN' where id = pg_temp.demo_uuid('demo-admin');

update public.companies co set
  logo_url = format('/images/companies/logo-%s.svg', lpad(((c.n - 1) % 24 + 1)::text, 2, '0')),
  about = format('Thành lập năm %s, %s %s. %s', 2004 + c.n % 18, c.name, c.tagline,
    (array['Chúng tôi đề cao sự minh bạch, tinh thần học hỏi và tôn trọng thời gian cá nhân của mỗi thành viên.',
           'Đội ngũ trẻ, năng động, luôn khuyến khích ý tưởng mới và trao quyền chủ động trong công việc.',
           'Công ty đặt mục tiêu trở thành đối tác tin cậy, phát triển bền vững cùng khách hàng và người lao động.',
           'Mỗi nhân viên đều có lộ trình phát triển riêng, được đào tạo bài bản và đánh giá công bằng.',
           'Chúng tôi tin rằng sản phẩm tốt bắt đầu từ một tập thể gắn kết và được chăm sóc chu đáo.'])[c.n % 5 + 1]),
  size = c.size, address = c.address, website = 'https://' || c.slug || '.example',
  created_at = now() - make_interval(days => 60 + c.n)
from demo_company c where co.id = c.id;
-- Ticket 57: mỗi công ty demo một logo riêng (chỉ đổi logo seed /images/companies/logo-NN.svg, không đụng logo người dùng tự tải lên).
update public.companies set logo_url = '/images/companies/muoi-phuong.svg' where name = 'Công ty Cổ phần Chuỗi Nhà thuốc Mười Phương' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/may-bac.svg' where name = 'Công ty Cổ phần Công nghệ Mây Bạc' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/bai-boi.svg' where name = 'Công ty Cổ phần Địa ốc Bãi Bồi' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/ban-tron.svg' where name = 'Công ty Cổ phần Dịch vụ Văn phòng Bàn Tròn' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/luc-lam.svg' where name = 'Công ty Cổ phần Dữ liệu Lục Lam' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/cay-bang.svg' where name = 'Công ty Cổ phần Giáo dục Cây Bàng' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/hat-mam-xanh.svg' where name = 'Công ty Cổ phần Giáo dục Hạt Mầm Xanh' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/canh-buom.svg' where name = 'Công ty Cổ phần Giao vận Cánh Buồm' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/ruong-bac.svg' where name = 'Công ty Cổ phần Nông nghiệp Ruộng Bậc' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/truc-xanh.svg' where name = 'Công ty Cổ phần Phân phối Trúc Xanh Miền Nam' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/mat-troi-hong.svg' where name = 'Công ty Cổ phần Quảng cáo Mặt Trời Hồng' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/hat-de.svg' where name = 'Công ty Cổ phần Thanh toán Hạt Dẻ' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/dong-que-ngot.svg' where name = 'Công ty Cổ phần Thực phẩm Đồng Quê Ngọt' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/hai-dang.svg' where name = 'Công ty Cổ phần Trí tuệ Nhân tạo Hải Đăng' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/phu-sa.svg' where name = 'Công ty Cổ phần Tư vấn Tài chính Phù Sa' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/mong-da.svg' where name = 'Công ty Cổ phần Xây dựng Móng Đá' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/ngay-thang.svg' where name = 'Công ty Luật Hợp danh Ngay Thẳng' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/can-can.svg' where name = 'Công ty Luật TNHH Cán Cân' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/ong-heo.svg' where name = 'Công ty Tài chính Tiêu dùng Ống Heo' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/la-chan-xanh.svg' where name = 'Công ty TNHH An ninh Mạng Lá Chắn Xanh' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/canh-dieu.svg' where name = 'Công ty TNHH Bao bì Cánh Diều' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/hoa-anh-dao.svg' where name = 'Công ty TNHH Biên phiên dịch Hoa Anh Đào' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/bep-me-nau.svg' where name = 'Công ty TNHH Chuỗi Nhà hàng Bếp Mẹ Nấu' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/luoi-thep.svg' where name = 'Công ty TNHH Cơ điện Lưới Thép' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/nha-vui.svg' where name = 'Công ty TNHH Điện máy Nhà Vui' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/doi-thong.svg' where name = 'Công ty TNHH Giải pháp Phần mềm Đồi Thông' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/hai-au-trang.svg' where name = 'Công ty TNHH Khách sạn Hải Âu Trắng' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/ba-song.svg' where name = 'Công ty TNHH Kho vận Ba Sông' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/minh-bach.svg' where name = 'Công ty TNHH Kiểm toán và Tư vấn Thuế Minh Bạch' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/dom-dom.svg' where name = 'Công ty TNHH Linh kiện Chính xác Đom Đóm' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/canh-cam.svg' where name = 'Công ty TNHH Nhân lực Cánh Cam' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/mai-ngoi.svg' where name = 'Công ty TNHH Nội thất Mái Ngói' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/cau-vong-so.svg' where name = 'Công ty TNHH Phần mềm Cầu Vồng Số' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/co-ba-la.svg' where name = 'Công ty TNHH Phòng khám Đa khoa Cỏ Ba Lá' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/ngoc-lan.svg' where name = 'Công ty TNHH Thiết bị Văn phòng Ngọc Lan' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/giay-xep.svg' where name = 'Công ty TNHH Thiết kế Giấy Xếp' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/ro-tre.svg' where name = 'Công ty TNHH Thương mại Điện tử Rổ Tre' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/tieng-chuong.svg' where name = 'Công ty TNHH Trung tâm Liên lạc Tiếng Chuông' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/gio-nom.svg' where name = 'Công ty TNHH Truyền thông Gió Nồm' and (logo_url is null or logo_url like '/images/companies/logo-%');
update public.companies set logo_url = '/images/companies/chim-se.svg' where name = 'Công ty TNHH Ứng dụng Di động Chim Sẻ' and (logo_url is null or logo_url like '/images/companies/logo-%');

-- Candidate profiles: headline, skills, experience, education built from a role of their industry.
do $$
declare
  c record; r record; ind record; v_since int; v_grad int; v_other text[];
begin
  for c in select * from demo_candidate order by n loop
    select * into r from demo_role where industry = c.industry order by random() limit 1;
    select * into ind from demo_industry where code = c.industry;
    v_grad := extract(year from now())::int - c.years - 1;
    v_since := extract(year from now())::int - greatest(c.years / 2, 1);
    v_other := pg_temp.pick_n(array(select name from demo_company where industry = c.industry), 2);
    update public.profiles set
      phone = pg_temp.pick(array['09', '03', '07', '08']) || lpad(floor(random() * 1e8)::text, 8, '0'),
      headline = r.title || ' · ' || case when c.years = 0 then 'mới tốt nghiệp' else c.years || ' năm kinh nghiệm' end,
      skills = pg_temp.pick_n(r.skills, 3 + floor(random() * 3)::int)
        || pg_temp.pick(array['Làm việc nhóm', 'Quản lý thời gian', 'Giải quyết vấn đề', 'Tư duy phản biện']),
      experience = case when c.years = 0 then
          format(E'Thực tập sinh %s (3 tháng, %s)\n%s', r.title, v_grad, pg_temp.bullets(pg_temp.pick_n(ind.duties, 2)))
        else
          format(E'%s – nay: %s tại %s\n%s', v_since, r.title, coalesce(v_other[1], 'một doanh nghiệp vừa và nhỏ'),
                 pg_temp.bullets(pg_temp.pick_n(ind.duties, 3)))
          || case when c.years >= 3 then
               format(E'\n\n%s – %s: %s tại %s\n%s', v_grad + 1, v_since, r.title, coalesce(v_other[2], 'một công ty khởi nghiệp'),
                      pg_temp.bullets(pg_temp.pick_n(ind.duties, 2)))
             else '' end
        end,
      education = format('%s, tốt nghiệp loại %s (%s – %s)', ind.degree, pg_temp.pick(array['Giỏi', 'Khá', 'Khá']), v_grad - 4, v_grad)
    where id = c.id;
  end loop;
end $$;

-- Each candidate's sample CV is a fixed file, resumes/<candidate_id>/demo-cv.pdf, uploaded once per project by
-- upload-demo-cvs.sh through the Storage API. It outlives wipes (candidate ids are stable), so the seed only points at it.
do $$
declare v_missing int;
begin
  select count(*) into v_missing from demo_candidate c
  where not exists (select 1 from storage.objects o where o.bucket_id = 'resumes' and o.name = c.id || '/demo-cv.pdf');
  if v_missing > 0 then
    raise warning '% ứng viên demo chưa có CV trong storage: chạy supabase/seed/upload-demo-cvs.sh (README.md)', v_missing;
  end if;
end $$;

-- Postings: count by company size, 75% in the company's own industry, status/dates spread per ticket 18.
do $$
declare
  c record; r record; ind record;
  v_i int := 0; v_x float8; v_ind text; v_level text; v_title text; v_type text; v_loc text; v_status text;
  v_head int; v_exp int; v_min numeric; v_max numeric; v_jit numeric; v_skills text[];
  v_created timestamptz; v_deadline timestamptz; v_reqs text[];
begin
  for c in select * from demo_company order by n loop
    for k in 1 .. case c.size when 'S11_50' then 5 when 'S51_200' then 7 when 'S201_500' then 9 else 11 end loop
      v_i := v_i + 1;
      v_ind := case when random() < 0.75 then c.industry
                    else pg_temp.pick(array['HR', 'ACCOUNTING_FINANCE', 'SALES', 'ADMIN', 'MARKETING', 'IT_SOFTWARE', 'CUSTOMER_SERVICE']) end;
      select * into ind from demo_industry where code = v_ind;
      select * into r from demo_role where industry = v_ind order by random() limit 1;

      v_x := random();
      v_level := case when v_x < 0.08 then 'INTERN' when v_x < 0.20 then 'FRESHER' when v_x < 0.45 then 'JUNIOR'
                      when v_x < 0.70 then 'MIDDLE' when v_x < 0.88 then 'SENIOR' when v_x < 0.95 then 'LEAD' else 'MANAGER' end;
      v_title := case v_level
        when 'INTERN' then 'Thực tập sinh ' || regexp_replace(r.title, '^(Nhân viên|Kỹ sư|Chuyên viên) ', '')
        when 'FRESHER' then r.title || ' (Fresher)'
        when 'SENIOR' then case when v_ind in ('IT_SOFTWARE', 'DESIGN', 'MARKETING') then 'Senior ' else 'Chuyên viên cao cấp – ' end || r.title
        when 'LEAD' then 'Trưởng nhóm ' || r.title
        when 'MANAGER' then ind.manager
        else r.title end;
      v_exp := case v_level when 'INTERN' then 0 when 'FRESHER' then 0 when 'JUNIOR' then 1
        when 'MIDDLE' then 2 + floor(random() * 2) when 'SENIOR' then 3 + floor(random() * 3)
        when 'LEAD' then 5 + floor(random() * 3) else 5 + floor(random() * 4) end;
      v_type := case when v_level = 'INTERN' then 'INTERNSHIP' when v_level in ('LEAD', 'MANAGER') then 'FULL_TIME'
        else (array['FULL_TIME', 'FULL_TIME', 'FULL_TIME', 'FULL_TIME', 'FULL_TIME', 'FULL_TIME', 'FULL_TIME', 'FULL_TIME',
                    'FULL_TIME', 'FULL_TIME', 'FULL_TIME', 'CONTRACT', 'PART_TIME'])[1 + floor(random() * 13)::int] end;
      v_head := case when v_level in ('LEAD', 'MANAGER') then 1
        when v_ind in ('SALES', 'CUSTOMER_SERVICE', 'HOSPITALITY') then 2 + floor(random() * 8)
        when v_level = 'INTERN' then 2 + floor(random() * 4)
        else 1 + floor(random() ^ 2 * 4) end;

      -- Salary in million VND/month by level × industry factor; ~15% "thỏa thuận" (both null).
      select lo, hi into v_min, v_max from (values ('INTERN', 3, 5), ('FRESHER', 7, 10), ('JUNIOR', 10, 15),
        ('MIDDLE', 15, 25), ('SENIOR', 25, 40), ('LEAD', 35, 55), ('MANAGER', 40, 70)) s(lv, lo, hi) where lv = v_level;
      v_jit := ind.factor * (0.9 + random()::numeric * 0.25) * case when v_type = 'PART_TIME' then 0.5 else 1 end;
      if random() < 0.15 then v_min := null; v_max := null;
      else v_min := round(v_min * v_jit * 2) / 2 * 1000000; v_max := round(v_max * v_jit * 2) / 2 * 1000000;
      end if;

      v_x := random();
      v_loc := case when v_x < 0.12 and v_ind in ('IT_SOFTWARE', 'MARKETING', 'DESIGN', 'CUSTOMER_SERVICE') then 'Remote'
        when v_x > 0.85 then pg_temp.pick(array['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Bình Dương',
                                                'Đồng Nai', 'Bắc Ninh', 'Khánh Hòa'])
        else c.city end;

      v_x := random();
      if v_x < 0.05 then
        v_status := 'DRAFT';
        v_created := now() - random() * interval '7 days';
        v_deadline := now() + interval '15 days' + random() * interval '45 days';
      elsif v_x < 0.13 then
        v_status := 'CLOSED';
        v_created := now() - interval '20 days' - random() * interval '25 days';
        v_deadline := v_created + interval '25 days' + random() * interval '35 days';
      elsif v_x < 0.18 then
        v_status := 'PUBLISHED'; -- already past its deadline
        v_created := now() - interval '20 days' - random() * interval '25 days';
        v_deadline := now() - interval '1 day' - random() * interval '10 days';
      else
        v_status := 'PUBLISHED';
        v_created := now() - random() * interval '45 days';
        v_deadline := now() + interval '1 day' + random() * interval '59 days';
      end if;
      -- Deadlines land at 23:59 Vietnam time, like a real form would set them.
      v_deadline := (date_trunc('day', v_deadline at time zone 'Asia/Ho_Chi_Minh') + interval '23 hours 59 minutes')
                    at time zone 'Asia/Ho_Chi_Minh';

      v_skills := pg_temp.pick_n(r.skills, 3 + floor(random() * 3)::int);
      v_reqs := array[case when v_exp = 0 then 'Sinh viên năm cuối hoặc mới tốt nghiệp, chưa có kinh nghiệm vẫn được đào tạo'
                           else format('Tối thiểu %s năm kinh nghiệm ở vị trí tương đương', v_exp) end]
        || pg_temp.pick_n(ind.reqs, 3)
        || case when v_level in ('LEAD', 'MANAGER') then array['Có kinh nghiệm dẫn dắt đội nhóm, lập kế hoạch và đánh giá nhân sự']
                else '{}'::text[] end
        || ('Sử dụng tốt: ' || array_to_string(v_skills, ', '));

      insert into public.job_postings (id, employer_id, title, description, location, employment_type, salary_min, salary_max,
        application_deadline, status, created_at, updated_at, industry, level, experience_years, headcount, skills, requirements, benefits)
      values (pg_temp.demo_uuid('demo-posting-' || v_i), c.id, v_title,
        format(E'%s cần tuyển %s %s %s.\n\nMô tả công việc:\n%s\n\nThời gian làm việc: %s.',
          c.name, v_head, v_title,
          case when v_loc = 'Remote' then 'làm việc từ xa' else 'làm việc tại ' || v_loc end,
          pg_temp.bullets(pg_temp.pick_n(ind.duties, 4)),
          case v_type when 'FULL_TIME' then pg_temp.pick(array['Thứ Hai – Thứ Sáu, 8h30 – 17h30', 'Thứ Hai – Thứ Sáu và sáng Thứ Bảy cách tuần, 8h00 – 17h00'])
                      when 'PART_TIME' then 'ca linh hoạt 4 tiếng mỗi ngày, tối thiểu 5 ca mỗi tuần'
                      when 'CONTRACT' then 'hợp đồng 6–12 tháng, có thể gia hạn, Thứ Hai – Thứ Sáu'
                      else 'thực tập 3 tháng, tối thiểu 4 buổi mỗi tuần, có hỗ trợ xác nhận thực tập' end),
        v_loc, v_type, v_min::bigint, v_max::bigint, v_deadline, v_status, v_created,
        case when v_status = 'CLOSED' then least(v_deadline, now()) else v_created end,
        v_ind, v_level, v_exp, v_head, v_skills, pg_temp.bullets(v_reqs),
        pg_temp.bullets(pg_temp.pick_n(array[
          'Lương tháng 13 và thưởng hiệu quả công việc theo quý',
          'Đóng đầy đủ BHXH, BHYT, BHTN theo mức lương thực tế',
          'Bảo hiểm sức khỏe cao cấp cho nhân viên',
          'Khám sức khỏe định kỳ hằng năm',
          '12 ngày phép năm, tăng theo thâm niên',
          'Du lịch công ty và team building hằng năm',
          'Xét tăng lương hai lần mỗi năm',
          'Hỗ trợ ăn trưa và gửi xe',
          'Ngân sách đào tạo, thi chứng chỉ chuyên môn',
          'Làm việc hybrid, linh hoạt giờ giấc',
          'Môi trường trẻ trung, cởi mở, lộ trình thăng tiến rõ ràng',
          'Quà sinh nhật, lễ Tết và các ngày kỷ niệm'], 4 + floor(random() * 3)::int)));
    end loop;
  end loop;
end $$;

-- Applications with a valid status history; triggers create the notifications, stamp_notification dates them.
do $$
declare
  c record; p record;
  v_at timestamptz; v_times timestamptz[]; v_path text[]; v_x float8; v_app uuid; v_from text; v_by_candidate boolean;
begin
  for c in select * from demo_candidate order by n loop
    for p in
      select jp.* from public.job_postings jp
      join demo_company co on co.id = jp.employer_id
      where jp.status <> 'DRAFT' and jp.created_at < now() - interval '1 day'
      order by abs(hashtext('apply:' || c.n || ':' || jp.id))::float8 * case when jp.industry = c.industry then 1 else 6 end
      limit 4 + floor(random() * 6)::int
    loop
      v_at := p.created_at + random() * (least(now(), p.application_deadline) - p.created_at);
      v_x := random();
      v_path := case
        when v_x < 0.25 then '{}'::text[]
        when v_x < 0.45 then array['REVIEWING']
        when v_x < 0.58 then array['REVIEWING', 'INTERVIEWING']
        when v_x < 0.63 then array['REVIEWING', 'INTERVIEWING', 'OFFERED']
        when v_x < 0.68 then array['REVIEWING', 'INTERVIEWING', 'OFFERED', 'HIRED']
        when v_x < 0.92 then (array['REVIEWING', 'INTERVIEWING', 'OFFERED'])[1:floor(random() * 4)::int] || 'REJECTED'::text
        else (array['REVIEWING', 'INTERVIEWING'])[1:floor(random() * 3)::int] || 'WITHDRAWN'::text end;
      -- Young applications have not moved far yet: at most one step per two days of age.
      v_path := v_path[1:floor(extract(epoch from now() - v_at) / 172800)::int];
      v_app := pg_temp.demo_uuid('demo-application-' || c.n || '-' || p.id);
      v_times := array(select v_at + (now() - v_at) * ((i + random() * 0.8) / (cardinality(v_path) + 1))
                       from generate_series(1, cardinality(v_path)) i order by i);

      insert into public.applications (id, job_posting_id, candidate_id, resume_path, status, created_at, updated_at)
      values (v_app, p.id, c.id, c.id || '/demo-cv.pdf', coalesce(v_path[cardinality(v_path)], 'SUBMITTED'), v_at,
              coalesce(v_times[cardinality(v_times)], v_at));
      perform pg_temp.stamp_notification(p.employer_id, v_at);
      insert into public.application_status_changes (application_id, from_status, to_status, changed_by, changed_by_role, changed_at)
      values (v_app, null, 'SUBMITTED', c.id, 'CANDIDATE', v_at);

      v_from := 'SUBMITTED';
      for i in 1 .. cardinality(v_path) loop
        v_by_candidate := v_path[i] = 'WITHDRAWN';
        insert into public.application_status_changes (application_id, from_status, to_status, changed_by, changed_by_role, changed_at)
        values (v_app, v_from, v_path[i], case when v_by_candidate then c.id else p.employer_id end,
                case when v_by_candidate then 'CANDIDATE' else 'EMPLOYER' end, v_times[i]);
        perform pg_temp.stamp_notification(case when v_by_candidate then p.employer_id else c.id end, v_times[i]);
        v_from := v_path[i];
      end loop;
    end loop;
  end loop;
end $$;

insert into public.saved_postings (candidate_id, posting_id, created_at)
select c.id, p.id, p.created_at + random() * (now() - p.created_at)
from demo_candidate c
cross join lateral (
  select jp.id, jp.created_at from public.job_postings jp
  join demo_company co on co.id = jp.employer_id
  where jp.status = 'PUBLISHED'
  order by abs(hashtext('save:' || c.n || ':' || jp.id))::float8 * case when jp.industry = c.industry then 1 else 6 end
  limit 2 + c.n % 5
) p;

insert into public.posting_views (posting_id, view_count)
select p.id, (extract(epoch from now() - p.created_at) / 86400 * (4 + abs(hashtext('views:' || p.id)) % 27))::int + 3
  + 12 * (select count(*) from public.applications a where a.job_posting_id = p.id)::int
from public.job_postings p
join demo_company co on co.id = p.employer_id
where p.status <> 'DRAFT';

commit;

select (select count(*) from public.companies c join auth.users u on u.id = c.id where u.email like '%@demo.jobportal.test') as companies,
  (select count(*) from public.job_postings p join auth.users u on u.id = p.employer_id where u.email like '%@demo.jobportal.test') as postings,
  (select count(*) from public.profiles p join auth.users u on u.id = p.id where u.email like '%@demo.jobportal.test' and p.role = 'CANDIDATE') as candidates,
  (select count(*) from public.applications a join auth.users u on u.id = a.candidate_id where u.email like '%@demo.jobportal.test') as applications,
  (select count(*) from public.notifications n join auth.users u on u.id = n.recipient_id where u.email like '%@demo.jobportal.test') as notifications;
