'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition, type FormEvent } from 'react';
import { saveArticleAction, setArticlePublishedAction } from '@/actions/articles';
import { ARTICLE_CATEGORIES } from '@/actions/articles-schema';
import type { AdminArticle, ArticleCategory } from '@/actions/types';
import { ArticleMarkdown } from './article-markdown';
import { articleCategoryLabels } from './labels';
import { parseArticleMarkdown } from './markdown';

export function ArticleAdminEditor({ article }: { article?: AdminArticle }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [content, setContent] = useState(article?.content ?? '');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const preview = useMemo(() => (tab === 'preview' ? parseArticleMarkdown(content) : []), [tab, content]);
  const published = article?.status === 'PUBLISHED';

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? '');
    setFeedback(null);
    startTransition(async () => {
      const result = await saveArticleAction({
        id: article?.id, title: field('title'), slug: field('slug'), excerpt: field('excerpt'),
        category: field('category') as ArticleCategory, content,
      });
      if (!result.success) return setFeedback({ ok: false, text: result.error });
      setFeedback({ ok: true, text: `Đã lưu. Đường dẫn: /guide/${result.data.slug}` });
      if (article) router.refresh();
      else router.replace(`/admin/articles/${result.data.id}`);
    });
  }

  function togglePublished() {
    if (!article || !window.confirm(published ? 'Gỡ bài viết khỏi cẩm nang?' : 'Đăng bài viết này lên cẩm nang?')) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await setArticlePublishedAction({ id: article.id, published: !published });
      if (!result.success) return setFeedback({ ok: false, text: result.error });
      setFeedback({ ok: true, text: published ? 'Đã gỡ bài viết, bài trở về bản nháp.' : 'Đã đăng bài viết.' });
      router.refresh();
    });
  }

  return (
    <form className="form-stack article-editor" onSubmit={save}>
      <label className="field-label">Tiêu đề
        <input className="text-input" defaultValue={article?.title} maxLength={200} minLength={5} name="title" required />
      </label>
      <div className="form-field-grid">
        <label className="field-label">Chủ đề
          <select className="text-input select-input" defaultValue={article?.category ?? 'CV'} name="category">
            {ARTICLE_CATEGORIES.map((category) => <option key={category} value={category}>{articleCategoryLabels[category]}</option>)}
          </select>
        </label>
        <label className="field-label">Đường dẫn <span className="field-optional">(để trống để tạo từ tiêu đề)</span>
          <input className="text-input" defaultValue={article?.slug} maxLength={200} name="slug" placeholder="viet-cv-an-tuong" />
        </label>
      </div>
      <label className="field-label">Tóm tắt
        <textarea className="text-input textarea-input" defaultValue={article?.excerpt} maxLength={300} minLength={20} name="excerpt" required rows={3} />
      </label>

      <div className="article-editor-tabs" role="tablist" aria-label="Nội dung bài viết">
        <button aria-controls="article-write" aria-selected={tab === 'write'} className="button button-quiet button-small" id="tab-write" onClick={() => setTab('write')} role="tab" type="button">Soạn thảo</button>
        <button aria-controls="article-preview" aria-selected={tab === 'preview'} className="button button-quiet button-small" id="tab-preview" onClick={() => setTab('preview')} role="tab" type="button">Xem trước</button>
      </div>
      <div aria-labelledby="tab-write" hidden={tab !== 'write'} id="article-write" role="tabpanel">
        <label className="field-label">Nội dung (Markdown rút gọn)
          <textarea className="text-input textarea-input article-content-input" maxLength={50000} minLength={100} name="content" onChange={(event) => setContent(event.target.value)} required rows={20} value={content} />
        </label>
        <p className="field-hint">Hỗ trợ <code>## </code>, <code>### </code>, <code>- </code>, <code>1. </code>, <code>**đậm**</code> và đoạn văn. HTML hiển thị như chữ thường.</p>
      </div>
      <div aria-labelledby="tab-preview" className="surface-card article-preview" hidden={tab !== 'preview'} id="article-preview" role="tabpanel">
        {content.trim() ? <ArticleMarkdown blocks={preview} /> : <p className="field-hint">Chưa có nội dung để xem trước.</p>}
      </div>

      <p aria-live="polite" className={feedback ? (feedback.ok ? 'form-success' : 'form-error') : undefined} role={feedback && !feedback.ok ? 'alert' : 'status'}>{feedback?.text}</p>
      <div className="article-editor-actions">
        <button className="button button-primary" disabled={pending} type="submit">{pending ? 'Đang xử lý…' : article ? 'Lưu thay đổi' : 'Lưu bản nháp'}</button>
        {article ? <button className="button button-quiet" disabled={pending} onClick={togglePublished} type="button">{published ? 'Gỡ bài' : 'Đăng bài'}</button> : null}
        {article && published ? <Link className="button button-quiet" href={`/guide/${article.slug}`} target="_blank">Xem trên cẩm nang ↗</Link> : null}
        <Link className="button button-quiet" href="/admin/articles">Quay lại danh sách</Link>
      </div>
    </form>
  );
}
