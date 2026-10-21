/** Articles with their own cover (ticket 58); any other article (e.g. one an admin writes later) keeps its category cover from the API. */
const OWN_COVERS = new Set([
  'can-bang-cong-viec-cuoc-song-lam-viec-tu-xa-hybrid',
  'chuan-bi-truoc-buoi-phong-van',
  'chuyen-nganh-an-toan',
  'giao-tiep-va-phan-hoi-voi-quan-ly-dong-nghiep',
  'hieu-phieu-luong-gross-net-bao-hiem-thue',
  'hoa-nhap-90-ngay-dau-o-cong-ty-moi',
  'hoc-ky-nang-moi-va-xay-dung-thuong-hieu-ca-nhan',
  'lap-ke-hoach-phat-trien-nghe-nghiep-3-nam',
  'phong-van-online-va-cau-hoi-nen-hoi-lai',
  'thuong-luong-luong-khi-nhan-offer',
  'tim-hieu-muc-luong-thi-truong-truoc-khi-thuong-luong',
  'toi-uu-cv-va-thu-xin-viec-theo-tin-tuyen-dung',
  'tra-loi-cau-hoi-hanh-vi-theo-mo-hinh-star',
  'viet-cv-cho-nguoi-moi-ra-truong',
  'viet-muc-kinh-nghiem-bang-so-lieu',
]);

export const articleCoverSrc = (slug: string, categoryCover: string) => (OWN_COVERS.has(slug) ? `/images/articles/${slug}.webp` : categoryCover);
