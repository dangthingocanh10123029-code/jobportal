// Suggestion lists for SuggestInput.

// 63 provinces before the 2025 merger — the names job postings already use. "Remote" for remote jobs.
export const PROVINCES = [
  'Hà Nội', 'TP. Hồ Chí Minh', 'Hải Phòng', 'Đà Nẵng', 'Cần Thơ',
  'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu', 'Bắc Ninh', 'Bến Tre', 'Bình Định',
  'Bình Dương', 'Bình Phước', 'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông', 'Điện Biên',
  'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang', 'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình',
  'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu', 'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An',
  'Nam Định', 'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 'Quảng Bình', 'Quảng Nam',
  'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên',
  'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái',
  'Remote',
] as const;

export const JOB_TITLES = [
  'Lập trình viên Backend Java', 'Lập trình viên Frontend ReactJS', 'Lập trình viên Mobile Flutter',
  'Lập trình viên Fullstack', 'Lập trình viên Python', 'Lập trình viên .NET', 'Lập trình viên PHP',
  'Kỹ sư DevOps', 'Kỹ sư Dữ liệu', 'Kỹ sư Kiểm thử phần mềm', 'Chuyên viên Phân tích Dữ liệu',
  'Chuyên viên Phân tích Nghiệp vụ', 'Quản lý Dự án', 'Trợ lý Dự án', 'Nhà thiết kế UI/UX', 'Nhà thiết kế Đồ họa',
  'Chuyên viên Dựng video', 'Giám đốc Sáng tạo', 'Chuyên viên Content Marketing', 'Chuyên viên Digital Marketing',
  'Chuyên viên Performance Marketing', 'Chuyên viên SEO', 'Chuyên viên Thương hiệu', 'Trưởng phòng Marketing',
  'Nhân viên Kinh doanh', 'Nhân viên Kinh doanh B2B', 'Nhân viên Kinh doanh Bất động sản',
  'Nhân viên Kinh doanh Giải pháp Phần mềm', 'Nhân viên Telesales', 'Trưởng phòng Kinh doanh',
  'Chuyên viên Phát triển Thị trường', 'Nhân viên Chăm sóc Khách hàng', 'Nhân viên Tổng đài',
  'Kế toán Tổng hợp', 'Kế toán Công nợ', 'Kế toán Thuế', 'Kế toán trưởng', 'Chuyên viên Phân tích Tài chính',
  'Chuyên viên Tuyển dụng', 'Chuyên viên Lương và Phúc lợi', 'Chuyên viên Đào tạo và Phát triển',
  'Trưởng phòng Nhân sự', 'Nhân viên Hành chính Văn phòng', 'Thư ký Giám đốc', 'Lễ tân',
  'Chuyên viên Pháp chế', 'Chuyên viên Tuân thủ', 'Luật sư Tư vấn', 'Chuyên viên Mua hàng',
  'Nhân viên Xuất nhập khẩu', 'Nhân viên Điều phối Vận tải', 'Thủ kho', 'Nhân viên Vận hành', 'Quản lý Vận hành',
  'Nhân viên Kiểm soát Chất lượng', 'Kỹ sư Quy trình Sản xuất', 'Trưởng ca Sản xuất', 'Quản đốc Nhà máy',
  'Kỹ thuật viên Bảo trì', 'Kỹ sư Cơ điện', 'Kỹ sư Kết cấu', 'Kỹ sư Giám sát Thi công', 'Kỹ sư Dự toán',
  'Kiến trúc sư Nội thất', 'Kỹ sư Nông nghiệp', 'Bác sĩ Đa khoa', 'Điều dưỡng Đa khoa',
  'Kỹ thuật viên Xét nghiệm', 'Dược sĩ', 'Giáo viên Tiếng Anh', 'Giáo viên Toán', 'Tư vấn Tuyển sinh',
  'Chuyên viên Thiết kế Chương trình', 'Hướng dẫn viên Du lịch', 'Lễ tân Khách sạn', 'Nhân viên Phục vụ Nhà hàng',
  'Đầu bếp', 'Nhân viên Nhập liệu', 'Thực tập sinh',
] as const;

/** Lowercase without Vietnamese diacritics, so "ha noi" matches "Hà Nội". */
export const foldAccents = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
