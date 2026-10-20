import Link from 'next/link';
import { listCompanies } from '@/actions/companies';
import { listCompanyReviews } from '@/actions/reviews';
import type { CompanySummary } from '@/actions/types';
import { formatDate } from '@/components/format';
import { Stars } from '@/components/reviews/stars';

const STORY_COMPANIES = 4;
const STORIES = 4;

/** "Công ty hàng đầu" + "Câu chuyện": streamed after the hero so they never hold up search results. */
export async function CompaniesAndStories() {
  // GET /companies sorts by open postings, most first.
  const companies = (await listCompanies({ page: 1 })).items.filter((c) => c.openPostings > 0).slice(0, 8);
  const reviewed = companies.filter((c) => c.reviewCount > 0).slice(0, STORY_COMPANIES);
  const pages = await Promise.all(reviewed.map((c) => listCompanyReviews(c.id)));
  const stories = pages
    .flatMap((page, i) => page.items.map((review) => ({ review, company: reviewed[i] })))
    .sort((a, b) => b.review.createdAt.localeCompare(a.review.createdAt))
    .slice(0, STORIES);

  return (
    <>
      {companies.length ? <TopCompanies companies={companies} /> : null}
      {stories.length ? (
        <section aria-labelledby="stories-title" className="home-section reveal">
          <div className="section-heading">
            <span className="eyebrow">Nhật ký đi làm</span>
            <h2 id="stories-title">Người trong cuộc kể lại</h2>
            <p>Trích từ đánh giá công ty đã được duyệt của các ứng viên trên Job Portal.</p>
          </div>
          <div className="story-grid">
            {stories.map(({ review, company }) => (
              <figure className="story-card" key={review.id}>
                <figcaption className="story-meta">
                  <Link href={`/companies/${company.id}`}>{company.name}</Link> · {formatDate(review.createdAt)}
                </figcaption>
                <Stars size="sm" value={review.rating} />
                <blockquote>
                  <p className="story-quote">“{review.title}”</p>
                  <p className="story-body">{review.pros}</p>
                </blockquote>
                <p className="story-signature"><span aria-hidden="true" />{review.authorName}</p>
              </figure>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function TopCompanies({ companies }: { companies: CompanySummary[] }) {
  return (
    <section aria-labelledby="companies-title" className="home-section reveal">
      <div className="section-heading">
        <span className="eyebrow">Công ty hàng đầu</span>
        <h2 id="companies-title">Đang tuyển nhiều nhất</h2>
      </div>
      <ul className="company-tile-grid">
        {companies.map((company) => (
          <li key={company.id}>
            <Link className="company-tile" href={`/companies/${company.id}`}>
              <img alt="" height="56" src={company.logoUrl ?? '/images/company-placeholder.svg'} width="56" />
              <strong>{company.name}{company.companyVerified ? <span aria-label="Công ty đã xác minh" className="verified-check"> ✓</span> : null}</strong>
              <span>{company.openPostings} việc làm đang mở</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link className="text-link" href="/companies">Xem tất cả công ty <span aria-hidden="true">→</span></Link>
    </section>
  );
}

const FAQ: [string, string][] = [
  ['Ứng viên có phải trả phí không?', 'Không. Ứng viên tạo tài khoản, lưu tin, ứng tuyển và nhận thông báo việc làm miễn phí. Gói dịch vụ chỉ dành cho nhà tuyển dụng.'],
  ['Tôi nộp hồ sơ bằng cách nào?', 'Mở tin tuyển dụng, chọn tải lên CV định dạng PDF (tối đa 5 MB) hoặc dùng CV online đã tạo, rồi bấm “Nộp hồ sơ”. Bạn theo dõi trạng thái trong mục Đơn ứng tuyển.'],
  ['CV online là gì?', 'Là CV bạn soạn ngay trên Job Portal, chọn mẫu trình bày và in hoặc lưu PDF. Khi ứng tuyển bằng CV online, nhà tuyển dụng nhận bản chụp CV tại thời điểm nộp.'],
  ['Thông báo việc làm hoạt động thế nào?', 'Bạn lưu tối đa 5 bộ lọc (từ khóa, địa điểm, ngành, cấp bậc…). Khi có tin mới phù hợp được đăng, Job Portal gửi thông báo vào mục Thông báo của bạn.'],
  ['Ai xem được thông tin của tôi?', 'Nhà tuyển dụng chỉ xem hồ sơ và CV bạn đã nộp vào tin của họ. Nếu bạn bật “Sẵn sàng tìm việc”, nhà tuyển dụng có thể tìm thấy hồ sơ của bạn và tắt lúc nào cũng được. Đánh giá công ty có thể gửi ẩn danh.'],
  ['Thanh toán gói dịch vụ có thật không?', 'Chưa. Thanh toán gói dịch vụ và tin nổi bật hiện là giả lập để thử nghiệm, không trừ tiền thật.'],
];

export function HomeFaq() {
  return (
    <section aria-labelledby="faq-title" className="home-section faq-section reveal" id="faq">
      <div className="section-heading is-centered">
        <span className="eyebrow">Câu hỏi thường gặp</span>
        <h2 id="faq-title">Bạn thắc mắc, chúng tôi trả lời</h2>
      </div>
      <div className="faq-list">
        {FAQ.map(([question, answer]) => (
          <details className="faq-item" key={question}>
            <summary>{question}<span aria-hidden="true" className="faq-icon">+</span></summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="home-section reveal" id="how-it-works">
      <div className="section-heading is-centered">
        <span className="eyebrow">Cách hoạt động</span>
        <h2 id="how-title">Ba bước, không vội vàng</h2>
        <p>Tìm tin phù hợp, lưu lại để cân nhắc, rồi ứng tuyển khi bạn thấy sẵn sàng.</p>
      </div>
      <ol className="how-steps">
        <li className="how-card how-card-search">
          <span className="how-step">Bước 1</span>
          <strong>Tìm</strong>
          <span aria-hidden="true" className="mock-field">Kế toán · Hà Nội</span>
          <span aria-hidden="true" className="mock-line" />
          <span aria-hidden="true" className="mock-line is-short" />
          <p>Lọc theo ngành, lương, cấp bậc và địa điểm.</p>
        </li>
        <li className="how-card how-card-save">
          <span className="how-step">Bước 2</span>
          <strong>Lưu</strong>
          <span aria-hidden="true" className="mock-heart">♥</span>
          <span aria-hidden="true" className="mock-line" />
          <p>Lưu tin để xem lại và so sánh trước khi quyết định.</p>
        </li>
        <li className="how-card how-card-apply">
          <span className="how-step">Bước 3</span>
          <strong>Ứng tuyển</strong>
          <span aria-hidden="true" className="mock-line" />
          <span aria-hidden="true" className="mock-line is-short" />
          <span aria-hidden="true" className="mock-apply">Ứng tuyển</span>
          <p>Nộp CV PDF hoặc CV online chỉ với một lần bấm.</p>
        </li>
      </ol>
    </section>
  );
}
