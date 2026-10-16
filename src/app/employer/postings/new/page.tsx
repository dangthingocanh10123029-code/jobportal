import Link from 'next/link';
import { PostingForm } from '@/components/postings/posting-form';

export default function NewPostingPage() {
  return (
    <main className="page-shell narrow-shell posting-form-page">
      <Link className="back-link" href="/employer/postings">← Tin tuyển dụng của tôi</Link>
      <div className="page-heading">
        <span className="eyebrow">Tin tuyển dụng mới</span>
        <h1>Tạo tin tuyển dụng</h1>
        <p>Điền thông tin công việc. Bạn có thể lưu bản nháp và đăng khi đã sẵn sàng.</p>
      </div>
      <section className="surface-card posting-form-card">
        <PostingForm mode="create" />
      </section>
    </main>
  );
}
