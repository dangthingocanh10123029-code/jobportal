import { AdminHeading, AdminPanel } from '@/components/admin/admin-common';
import { ArticleAdminEditor } from '@/components/articles/article-admin-editor';

export default function NewAdminArticlePage() {
  return (
    <div className="admin-page">
      <AdminHeading description="Bài mới được lưu ở dạng bản nháp; đăng sau khi đã xem trước." title="Viết bài cẩm nang" />
      <AdminPanel title="Nội dung"><ArticleAdminEditor /></AdminPanel>
    </div>
  );
}
