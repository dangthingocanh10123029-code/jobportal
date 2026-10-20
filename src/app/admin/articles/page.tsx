import Link from 'next/link';
import { listAdminArticles } from '@/actions/articles';
import { adminArticleFilterSchema } from '@/actions/articles-schema';
import { AdminBadge, AdminEmpty, AdminHeading, AdminPager, AdminPanel, AdminTable } from '@/components/admin/admin-common';
import { articleCategoryLabels, formatArticleDate } from '@/components/articles/labels';

type Params = Record<string, string | string[] | undefined>;

export default async function AdminArticlesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const filter = adminArticleFilterSchema.parse({ status: raw.status, page: raw.page });
  const data = await listAdminArticles(filter);
  return (
    <div className="admin-page">
      <AdminHeading description="Soạn, xem trước, đăng và gỡ bài viết cẩm nang nghề nghiệp." title="Cẩm nang" />
      <AdminPanel action={<Link className="button button-primary button-small" href="/admin/articles/new">+ Viết bài mới</Link>} title="Bài viết">
        <form action="/admin/articles" className="admin-filter-bar">
          <label><span>Trạng thái</span>
            <select defaultValue={filter.status ?? ''} name="status"><option value="">Tất cả</option><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đã đăng</option></select>
          </label>
          <button className="button button-quiet button-small" type="submit">Lọc</button>
        </form>
        {!data ? <AdminEmpty description="Phiên quản trị đã hết hạn hoặc bạn không có quyền." title="Không tải được bài viết" /> : data.items.length ? (
          <>
            <AdminTable label="Danh sách bài viết">
              <thead><tr><th>Bài viết</th><th>Chủ đề</th><th>Trạng thái</th><th>Ngày đăng</th><th className="num">Lượt xem</th></tr></thead>
              <tbody>{data.items.map((article) => (
                <tr key={article.id}>
                  <td><Link className="admin-primary-cell" href={`/admin/articles/${article.id}`}>{article.title}<small>/guide/{article.slug} · {article.readingMinutes} phút đọc</small></Link></td>
                  <td>{articleCategoryLabels[article.category]}</td>
                  <td><AdminBadge tone={article.status === 'PUBLISHED' ? 'success' : 'neutral'}>{article.status === 'PUBLISHED' ? 'Đã đăng' : 'Bản nháp'}</AdminBadge></td>
                  <td>{formatArticleDate(article.publishedAt)}</td>
                  <td className="num">{article.views.toLocaleString('vi-VN')}</td>
                </tr>
              ))}</tbody>
            </AdminTable>
            <AdminPager basePath="/admin/articles" filters={{ status: filter.status }} page={data.page} pageSize={data.pageSize} total={data.total} />
          </>
        ) : <AdminEmpty description="Bấm “Viết bài mới” để tạo bài đầu tiên." title="Chưa có bài viết" />}
      </AdminPanel>
    </div>
  );
}
