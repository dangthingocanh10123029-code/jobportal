import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getMyPosting } from '@/actions/postings';
import { PostingForm } from '@/components/postings/posting-form';

export default async function EditPostingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const posting = await getMyPosting(id);
  if (!posting) notFound();
  if (posting.status === 'CLOSED') redirect('/employer/postings');

  return (
    <main className="page-shell narrow-shell posting-form-page">
      <Link className="back-link" href="/employer/postings">← Tin tuyển dụng của tôi</Link>
      <div className="page-heading">
        <span className="eyebrow">Chỉnh sửa tin tuyển dụng</span>
        <h1>Cập nhật tin</h1>
        <p>Điều chỉnh nội dung tin. Thay đổi sẽ được cập nhật ngay sau khi lưu.</p>
      </div>
      <section className="surface-card posting-form-card">
        <PostingForm initialPosting={posting} mode="edit" />
      </section>
    </main>
  );
}
