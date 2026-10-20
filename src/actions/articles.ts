'use server';

import { apiFetch } from '@/lib/api';
import { fail, readOr, toAction } from './_shared';
import { toQuery } from './admin-schema';
import {
  adminArticleFilterSchema,
  articleFilterSchema,
  articleIdSchema,
  articleSlugSchema,
  saveArticleSchema,
  setArticlePublishedSchema,
} from './articles-schema';
import { firstError } from './auth-schema';
import type { ActionResult, AdminArticle, AdminArticleSummary, Article, ArticleCategory, ArticleStatus, ArticleSummary, Page } from './types';

/** Published articles only, newest first, 12 per page. */
export async function listArticles(filter: { category?: ArticleCategory; q?: string; page?: number }): Promise<Page<ArticleSummary, 12>> {
  const res = await apiFetch<Page<ArticleSummary, 12>>(`/articles?${toQuery(articleFilterSchema.parse(filter))}`, { auth: false });
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

/** Counts a view; `related` = up to 3 articles of the same category. */
export async function getArticle(slug: string): Promise<(Article & { related: ArticleSummary[] }) | null> {
  const parsed = articleSlugSchema.safeParse(slug);
  if (!parsed.success) return null;
  return readOr(await apiFetch<Article & { related: ArticleSummary[] }>(`/articles/${parsed.data}`, { auth: false }), null);
}

// Admin — not ADMIN → null / the API's 403 message.

export async function listAdminArticles(filter: { status?: ArticleStatus; page?: number }): Promise<Page<AdminArticleSummary, 12> | null> {
  return readOr(await apiFetch<Page<AdminArticleSummary, 12>>(`/admin/articles?${toQuery(adminArticleFilterSchema.parse(filter))}`), null);
}

export async function getAdminArticle(id: string): Promise<AdminArticle | null> {
  const parsed = articleIdSchema.safeParse(id);
  if (!parsed.success) return null;
  return readOr(await apiFetch<AdminArticle>(`/admin/articles/${parsed.data}`), null);
}

/** No id → new draft; slug left blank is derived from the title. The API makes the slug unique (-2, -3…). */
export async function saveArticleAction(input: {
  id?: string; title: string; slug?: string; excerpt: string; category: ArticleCategory; content: string;
}): Promise<ActionResult<Article>> {
  const parsed = saveArticleSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { id, ...body } = parsed.data;
  return toAction(await apiFetch<Article>(id ? `/admin/articles/${id}` : '/admin/articles', { method: id ? 'PUT' : 'POST', body }));
}

export async function setArticlePublishedAction(input: { id: string; published: boolean }): Promise<ActionResult<null>> {
  const parsed = setArticlePublishedSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { id, published } = parsed.data;
  return toAction(await apiFetch<null>(`/admin/articles/${id}/published`, { method: 'POST', body: { published } }));
}
