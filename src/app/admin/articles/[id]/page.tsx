import { notFound } from 'next/navigation';
import { getAdminArticle } from '@/actions/articles';
import { AdminBadge, AdminHeading, AdminPanel } from '@/components/admin/admin-common';
import { ArticleAdminEditor } from '@/components/articles/article-admin-editor';

export default async function EditAdminArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const article = await getAdminArticle((await params).id);
  if (!article) notFound();
  const published = article.status === 'PUBLISHED';
  return (
    <div className="admin-page">
      <AdminHeading description={`${article.views.toLocaleString('vi-VN')} lượt xem · ${article.readingMinutes} phút đọc`} title="Sửa bài cẩm nang" />
      <AdminPanel action={<AdminBadge tone={published ? 'success' : 'neutral'}>{published ? 'Đã đăng' : 'Bản nháp'}</AdminBadge>} title={article.title}>
        <ArticleAdminEditor article={article} key={`${article.id}-${article.status}`} />
      </AdminPanel>
    </div>
  );
}
